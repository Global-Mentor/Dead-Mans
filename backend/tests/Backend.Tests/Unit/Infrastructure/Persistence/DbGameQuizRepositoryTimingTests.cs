using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Unit.Infrastructure.Persistence;

public sealed class DbGameQuizRepositoryTimingTests
{
    [Fact]
    public async Task AskQuizQuestion_PersistsOneShuffledOptionSnapshotForTheQuestionSession()
    {
        var now = new DateTimeOffset(2026, 9, 8, 12, 0, 0, TimeSpan.Zero);
        await using var db = CreateDbContext();
        var seeded = await SeedEnabledQuestionAsync(db, now.UtcDateTime);
        var repository = new DbGameQuizRepository(db, new FixedTimeProvider(now));

        var result = await repository.AskQuizQuestionAsync(
            seeded.GameId, null, new TwitchGameQuizQuestionDelivery("channel-1", "message-1"));

        Assert.NotNull(result);
        Assert.Equal(2, result.Options.Count);
        Assert.Equal(result.Options.Select(x => x.OptionId),
            (await repository.GetCurrentQuizStateAsync(seeded.UserId))!.Options.Select(x => x.OptionId));
        var session = await db.GameQuizQuestionSessions.SingleAsync();
        Assert.Equal(GameQuizDeliveryKindValue.Twitch, session.DeliveryKind);
        Assert.Equal("channel-1", session.SourceChannelId);
        Assert.Equal(now.AddSeconds(45).UtcDateTime, session.ClosesAtUtc);
    }

    [Fact]
    public async Task SubmitQuizAnswer_AtExactDeadlineClosesWithoutPersistingSubmission()
    {
        var deadline = new DateTimeOffset(2026, 9, 8, 12, 0, 0, TimeSpan.Zero);
        await using var db = CreateDbContext();
        var seeded = await SeedOpenQuestionSessionAsync(db, deadline.UtcDateTime);
        var repository = new DbGameQuizRepository(db, new FixedTimeProvider(deadline));

        var result = await repository.SubmitQuizAnswerAsync(seeded.QuestionSessionId,
            new SubmitGameQuizAnswerInput(seeded.CorrectOptionId,
                new WebGameQuizAnswerSource(seeded.UserId)));

        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.QuestionSessionClosed, result.Outcome);
        Assert.Equal(GameQuizQuestionSessionStatusValue.Closed, (await db.GameQuizQuestionSessions.SingleAsync()).Status);
        Assert.Empty(db.GameQuizSubmissions);
        Assert.Empty(db.GameQuizPointLedgerEntries);
    }

    [Fact]
    public async Task CorrectSubmission_IsHiddenAndUnrewardedUntilIdempotentClosure()
    {
        var deadline = new DateTimeOffset(2026, 9, 8, 12, 0, 0, TimeSpan.Zero);
        await using var db = CreateDbContext();
        var seeded = await SeedOpenQuestionSessionAsync(db, deadline.UtcDateTime);
        var time = new MutableTimeProvider(deadline.AddSeconds(-1));
        var repository = new DbGameQuizRepository(db, time);

        var accepted = await repository.SubmitQuizAnswerAsync(seeded.QuestionSessionId,
            new SubmitGameQuizAnswerInput(seeded.CorrectOptionId,
                new WebGameQuizAnswerSource(seeded.UserId)));
        var openState = await repository.GetCurrentQuizStateAsync(seeded.UserId);

        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Accepted, accepted.Outcome);
        Assert.Null(openState!.CorrectOptionId);
        Assert.Null(openState.Reward);
        Assert.Null(openState.MyIsCorrect);
        Assert.Null(openState.OptionResults);
        Assert.Empty(db.GameQuizPointLedgerEntries);

        time.UtcNow = deadline;
        Assert.Equal(1, (await repository.CloseExpiredQuizQuestionSessionsAsync()).ClosedQuizQuestionCount);
        Assert.Equal(0, (await repository.CloseExpiredQuizQuestionSessionsAsync()).ClosedQuizQuestionCount);
        var closedState = await repository.GetCurrentQuizStateAsync(seeded.UserId);
        Assert.Equal(seeded.CorrectOptionId, closedState!.CorrectOptionId);
        Assert.Equal(5, closedState.Reward);
        Assert.True(closedState.MyIsCorrect);
        Assert.Equal(5, closedState.MyAwardedPoints);
        Assert.Equal(5, (await db.GameQuizPointLedgerEntries.SingleAsync()).PointsDelta);
    }

    [Fact]
    public async Task OneUserGetsOneSubmissionWhileDifferentUsersDoNotConflict()
    {
        var deadline = new DateTimeOffset(2026, 9, 8, 12, 0, 0, TimeSpan.Zero);
        await using var db = CreateDbContext();
        var seeded = await SeedOpenQuestionSessionAsync(db, deadline.UtcDateTime);
        var secondUser = AddUser(db, "222222", "second");
        await db.SaveChangesAsync();
        var repository = new DbGameQuizRepository(db, new FixedTimeProvider(deadline.AddSeconds(-1)));
        var source = new WebGameQuizAnswerSource(seeded.UserId);

        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Accepted,
            (await repository.SubmitQuizAnswerAsync(seeded.QuestionSessionId,
                new SubmitGameQuizAnswerInput(seeded.CorrectOptionId, source))).Outcome);
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Existing,
            (await repository.SubmitQuizAnswerAsync(seeded.QuestionSessionId,
                new SubmitGameQuizAnswerInput(seeded.CorrectOptionId, source))).Outcome);
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.AlreadyAnswered,
            (await repository.SubmitQuizAnswerAsync(seeded.QuestionSessionId,
                new SubmitGameQuizAnswerInput(seeded.WrongOptionId, source))).Outcome);
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Accepted,
            (await repository.SubmitQuizAnswerAsync(seeded.QuestionSessionId,
                new SubmitGameQuizAnswerInput(seeded.WrongOptionId,
                    new WebGameQuizAnswerSource(secondUser.Id)))).Outcome);
        Assert.Equal(2, await db.GameQuizSubmissions.CountAsync());
    }

    private static ApplicationDbContext CreateDbContext() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"quiz-timing-tests-{Guid.NewGuid():N}").Options);

    private static async Task<(Guid GameId, Guid UserId)> SeedEnabledQuestionAsync(
        ApplicationDbContext db, DateTime now)
    {
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Title = "Quiz",
            Status = GameStatusValue.Active,
            QuizAnswerDurationSeconds = 45,
            CreatedAtUtc = now,
            StartedAtUtc = now
        };
        var user = AddUser(db, "123456", "viewer");
        var optionIds = new[] { Guid.NewGuid(), Guid.NewGuid() };
        var questionId = Guid.NewGuid();
        db.QuestionDefinitions.Add(new QuestionDefinition
        {
            Id = questionId,
            ExternalCode = "q-1",
            CategoryId = Guid.NewGuid(),
            Text = "Answer?",
            Reward = 5,
            Revision = 1,
            IsEnabled = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        });
        db.Games.Add(game);
        db.GameEnabledQuestions.Add(new GameEnabledQuestion
        {
            GameId = game.Id,
            QuestionId = questionId,
            EnabledAtUtc = now,
            QuestionRevisionSnapshot = 1,
            QuestionCodeSnapshot = "q-1",
            CategoryNameSnapshot = "general",
            QuestionTextSnapshot = "Answer?",
            OptionIdsSnapshot = optionIds,
            OptionTextsSnapshot = ["right", "wrong"],
            CorrectOptionIdSnapshot = optionIds[0],
            RewardSnapshot = 5,
            PrioritySnapshot = 1,
            SnapshotAtUtc = now
        });
        await db.SaveChangesAsync();
        return (game.Id, user.Id);
    }

    private static async Task<SeededQuizQuestionSession> SeedOpenQuestionSessionAsync(ApplicationDbContext db, DateTime deadline)
    {
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Title = "Timing",
            Status = GameStatusValue.Active,
            CreatedAtUtc = deadline.AddMinutes(-5),
            StartedAtUtc = deadline.AddMinutes(-5)
        };
        var user = AddUser(db, "123456", "viewer");
        var correct = Guid.NewGuid();
        var wrong = Guid.NewGuid();
        var session = new GameQuizQuestionSession
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            QuestionId = Guid.NewGuid(),
            AskOrder = 1,
            AskedAtUtc = deadline.AddMinutes(-1),
            ClosesAtUtc = deadline,
            Status = GameQuizQuestionSessionStatusValue.Open,
            QuestionRevisionSnapshot = 1,
            QuestionCodeSnapshot = "q-1",
            CategoryNameSnapshot = "general",
            QuestionTextSnapshot = "Answer?",
            OptionIdsSnapshot = [correct, wrong],
            OptionTextsSnapshot = ["right", "wrong"],
            CorrectOptionIdSnapshot = correct,
            RewardSnapshot = 5,
            DeliveryKind = GameQuizDeliveryKindValue.Manual,
            Game = game
        };
        db.Games.Add(game);
        db.GameQuizQuestionSessions.Add(session);
        await db.SaveChangesAsync();
        return new(session.Id, user.Id, correct, wrong);
    }

    private static User AddUser(ApplicationDbContext db, string twitchId, string login)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            TwitchUserId = twitchId,
            Login = login,
            DisplayName = login,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };
        db.Users.Add(user);
        return user;
    }

    private sealed record SeededQuizQuestionSession(Guid QuestionSessionId, Guid UserId, Guid CorrectOptionId, Guid WrongOptionId);

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }

    private sealed class MutableTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public DateTimeOffset UtcNow { get; set; } = utcNow;
        public override DateTimeOffset GetUtcNow() => UtcNow;
    }
}
