using Backend.Tests.Support;
using backend.Application.Abstractions;
using backend.Application.Abstractions.Realtime;
using backend.Application.Configuration;
using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Twitch;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Backend.Tests.Unit.Infrastructure;

public sealed class TwitchQuizRecoveryTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public TwitchQuizRecoveryTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _factory.ResetDatabase();
    }

    [Fact]
    public async Task InterruptedOutcome_IsRecoveredAsUncertainWithoutSending()
    {
        using var scope = _factory.Services.CreateScope();
        var (db, service) = Resolve(scope);
        var row = await SeedAsync(db, "closed", "sending");
        await service.ProcessNextAsync(default);
        Assert.Equal("uncertain", row.Status);
        Assert.Equal("uncertain", row.OutcomeDeliveryStatus);
        Assert.Equal("sent", row.QuestionDeliveryStatus);
        Assert.Equal("sent", row.OptionsDeliveryStatus);
        Assert.NotNull(row.LastError);
    }

    [Fact]
    public async Task PendingQuestion_IsCancelledWhenModifierOrderingBegins()
    {
        using var scope = _factory.Services.CreateScope();
        var (db, service) = Resolve(scope);
        var gameId = Guid.NewGuid();
        db.Games.Add(new Game
        {
            Id = gameId,
            Title = "Quiz",
            Status = GameStatusValue.Active,
            CreatedAtUtc = DateTime.UtcNow
        });
        db.GameRounds.Add(new GameRound
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            BoardId = Guid.NewGuid(),
            BoardCellId = Guid.NewGuid(),
            TeamId = Guid.NewGuid(),
            Status = GameRoundStatusValue.AwaitingModifiers
        });
        var publication = new TwitchQuizPublication
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            QuestionId = Guid.NewGuid(),
            Status = TwitchQuizPublicationStatuses.Publishing,
            QuestionDeliveryStatus = TwitchQuizDeliveryStatuses.Pending,
            OptionsDeliveryStatus = TwitchQuizDeliveryStatuses.Pending,
            CreatedAtUtc = DateTime.UtcNow
        };
        db.TwitchQuizPublications.Add(publication);
        await db.SaveChangesAsync();

        await service.ProcessNextAsync(default);

        Assert.Equal(TwitchQuizPublicationStatuses.Cancelled, publication.Status);
        Assert.Null(publication.QuestionSessionId);
        Assert.Empty(db.GameQuizQuestionSessions);
    }

    [Fact]
    public async Task Cancel_AlreadySettledSession_DoesNotChangeResultOrRewards()
    {
        using var scope = _factory.Services.CreateScope();
        var (db, service) = Resolve(scope);
        var row = await SeedAsync(db, "closed", "pending");
        await service.CancelPublicationAsync(row.Id);
        Assert.Equal("closed", row.QuestionSession!.Status);
        Assert.Equal("open", row.Status);
        Assert.Equal("pending", row.OutcomeDeliveryStatus);
    }

    [Theory]
    [InlineData("pending")]
    [InlineData("failed")]
    public async Task SkipOutcome_OpenSession_CannotDiscardFutureResult(string delivery)
    {
        using var scope = _factory.Services.CreateScope();
        var (db, service) = Resolve(scope);
        var row = await SeedAsync(db, "open", delivery);
        await service.SkipOutcomeAsync(row.Id);
        Assert.Equal(delivery, row.OutcomeDeliveryStatus);
        Assert.Equal("open", row.QuestionSession!.Status);
    }

    [Fact]
    public async Task SkipOutcome_FailedCancellationWithoutSession_UnblocksPublication()
    {
        using var scope = _factory.Services.CreateScope();
        var (db, service) = Resolve(scope);
        var row = new TwitchQuizPublication { Id = Guid.NewGuid(), Status = "failed", OutcomeDeliveryStatus = "failed" };
        db.Add(row);
        await db.SaveChangesAsync();
        await service.SkipOutcomeAsync(row.Id);
        Assert.Equal("cancelled", row.Status);
        Assert.Equal("skipped", row.OutcomeDeliveryStatus);
    }

    [Fact]
    public async Task Retry_Outcome_PreservesConfirmedQuestionAndOptions()
    {
        using var scope = _factory.Services.CreateScope();
        var (db, service) = Resolve(scope);
        var row = await SeedAsync(db, "closed", "failed");
        row.Status = "failed";
        await db.SaveChangesAsync();
        await service.RetryPublicationAsync(row.Id);
        Assert.Equal("sent", row.QuestionDeliveryStatus);
        Assert.Equal("sent", row.OptionsDeliveryStatus);
        Assert.Equal("pending", row.OutcomeDeliveryStatus);
        Assert.Equal("closed", row.QuestionSession!.Status);
    }

    [Fact]
    public async Task Cancel_UnknownDelivery_StillQueuesCancellation()
    {
        using var scope = _factory.Services.CreateScope();
        var (db, service) = Resolve(scope);
        var row = new TwitchQuizPublication { Id = Guid.NewGuid(), Status = "uncertain", QuestionDeliveryStatus = "uncertain" };
        db.Add(row);
        await db.SaveChangesAsync();
        await service.CancelPublicationAsync(row.Id);
        Assert.Equal("cancel_pending", row.Status);
        Assert.Equal("pending", row.OutcomeDeliveryStatus);
    }

    private static async Task<TwitchQuizPublication> SeedAsync(ApplicationDbContext db, string status, string outcome)
    {
        var session = new GameQuizQuestionSession { Id = Guid.NewGuid(), Status = status };
        var row = new TwitchQuizPublication
        {
            Id = Guid.NewGuid(),
            QuestionSessionId = session.Id,
            QuestionSession = session,
            Status = "open",
            QuestionDeliveryStatus = "sent",
            OptionsDeliveryStatus = "sent",
            OutcomeDeliveryStatus = outcome
        };
        db.Add(row);
        await db.SaveChangesAsync();
        return row;
    }

    private static (ApplicationDbContext Db, TwitchBotService Service) Resolve(IServiceScope scope)
    {
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<ApplicationDbContext>();
        // Enable only this service instance; the factory's background worker remains disabled.
        var service = new TwitchBotService(db, Options.Create(new TwitchBotOptions { Enabled = true }),
            services.GetRequiredService<TwitchBotApiClient>(), services.GetRequiredService<IGameQuizService>(),
            services.GetRequiredService<IGameBoardEventsPublisher>(), services.GetRequiredService<IDataProtectionProvider>(),
            new TwitchEventSubHealth(), TimeProvider.System);
        return (db, service);
    }
}
