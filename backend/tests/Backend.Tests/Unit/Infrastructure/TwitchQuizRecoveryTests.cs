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
    [Fact]
    public async Task ScreenshotPublicationUsesOwnDuration_AndOpensTheSameFrozenImage()
    {
        using var scope = _factory.Services.CreateScope();
        var (db, service) = Resolve(scope, connected: true);
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Title = "Quiz",
            Status = GameStatusValue.Active,
            CreatedAtUtc = DateTime.UtcNow,
            QuizAnswerDurationSeconds = 60,
            ScreenshotAnswerDurationSeconds = 25
        };
        var question = new QuestionDefinition { Id = Guid.NewGuid(), ExternalCode = "image", Text = "Location?", IsEnabled = true };
        var ids = Enumerable.Range(0, 6).Select(_ => Guid.NewGuid()).ToArray();
        IReadOnlyDictionary<string, string> names = new Dictionary<string, string> { ["ru"] = "Локация", ["en"] = "Location", ["pl"] = "Lokacja", ["uk"] = "Локація" };
        var image = new backend.Domain.Questions.QuizImageSnapshot(Guid.NewGuid(), "quiz/screenshots/test.png", names,
            ids.ToDictionary(id => id, _ => names)).ToJson();
        db.AddRange(game, question, new GameEnabledQuestion
        {
            GameId = game.Id,
            QuestionId = question.Id,
            QuestionDefinition = question,
            QuestionCodeSnapshot = "image",
            CategoryNameSnapshot = "Locations",
            QuestionTextSnapshot = "Location?",
            ImageSnapshotJson = image,
            OptionIdsSnapshot = ids,
            OptionTextsSnapshot = Enumerable.Range(1, 6).Select(i => $"Location {i}").ToArray(),
            CorrectOptionIdSnapshot = ids[0],
            RewardSnapshot = 7,
        });
        await db.SaveChangesAsync();
        Assert.Equal(PrepareTwitchQuizQuestionOutcome.NoAvailableQuestions,
            (await service.PrepareQuestionAsync(null)).Outcome);
        Assert.Equal(PrepareTwitchQuizQuestionOutcome.Prepared,
            (await service.PrepareQuestionAsync(null, screenshot: true)).Outcome);
        var publication = Assert.Single(db.TwitchQuizPublications);
        Assert.Equal(25, publication.DurationSeconds);
        Assert.Contains("25", publication.OptionsMessage);
        Assert.DoesNotContain("60", publication.OptionsMessage);
        Assert.Equal(image, publication.ImageSnapshotJson);
        Assert.True(await backend.Infrastructure.Persistence.GameQuizActivity.BlocksModifiersAsync(db, game.Id, DateTime.UtcNow, default));
        publication.QuestionDeliveryStatus = TwitchQuizDeliveryStatuses.Sent;
        publication.OptionsDeliveryStatus = TwitchQuizDeliveryStatuses.Sent;
        await db.SaveChangesAsync();
        await service.ProcessNextAsync(default);
        var session = Assert.Single(db.GameQuizQuestionSessions);
        Assert.Equal(image, session.ImageSnapshotJson);
        Assert.Equal(TimeSpan.FromSeconds(25), session.ClosesAtUtc - session.AskedAtUtc);
        Assert.Equal(publication.OptionIdsSnapshot, session.OptionIdsSnapshot);
        Assert.Equal(publication.OptionTextsSnapshot, session.OptionTextsSnapshot);
        for (var index = 0; index < session.OptionTextsSnapshot.Length; index++)
            Assert.Contains($"!{index + 1} [{session.OptionTextsSnapshot[index]}]", publication.OptionsMessage);
        Assert.Equal(session.Id, Assert.Single(db.Set<GameQuizPresentation>()).QuestionSessionId);
    }

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

    private static (ApplicationDbContext Db, TwitchBotService Service) Resolve(IServiceScope scope, bool connected = false)
    {
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<ApplicationDbContext>();
        var health = new TwitchEventSubHealth();
        if (connected)
        {
            health.SetConnected(true);
            db.AddRange(
                new TwitchBotConnection { Role = "bot", TwitchUserId = "", Scopes = TwitchBotOptions.BotScopes },
                new TwitchBotConnection { Role = "broadcaster", TwitchUserId = "", Scopes = TwitchBotOptions.BroadcasterScopes });
            db.SaveChanges();
        }
        // Enable only this service instance; the factory's background worker remains disabled.
        var service = new TwitchBotService(db, Options.Create(new TwitchBotOptions { Enabled = true }),
            services.GetRequiredService<TwitchBotApiClient>(), services.GetRequiredService<IGameQuizService>(),
            services.GetRequiredService<IGameBoardEventsPublisher>(), services.GetRequiredService<IDataProtectionProvider>(),
            health, TimeProvider.System);
        return (db, service);
    }
}
