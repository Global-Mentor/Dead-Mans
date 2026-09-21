using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using backend.Infrastructure.Configuration;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;
using Npgsql;
using System.Diagnostics;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class GameQuizConcurrencyTests(PostgresTestDatabase database) : IClassFixture<PostgresTestDatabase>
{
    [Fact]
    public async Task DifferentUsersSubmitConcurrently_AndReceiveRewardsExactlyOnce()
    {
        var seed = await SeedAsync();
        var gate = new SubmissionGate();
        await using var firstDb = database.CreateDbContext(gate);
        await using var secondDb = database.CreateDbContext();
        var first = Repository(firstDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.CorrectId, new WebGameQuizAnswerSource(seed.First.Id)));
        await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        try
        {
            var second = await Repository(secondDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
                new(seed.CorrectId, new WebGameQuizAnswerSource(seed.Second.Id)))
                .WaitAsync(TimeSpan.FromSeconds(10));
            Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Accepted, second.Outcome);
        }
        finally { gate.Release.TrySetResult(); }
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Accepted, (await first).Outcome);

        await using (var historyDb = database.CreateDbContext())
        {
            var history = new DbGameHistoryRepository(historyDb, Options.Create(new StorageOptions { PublicBaseUrl = "https://storage.test" }));
            var gameId = (await historyDb.GameQuizQuestionSessions.SingleAsync()).GameId;
            var hidden = await history.GetGameDetailsAsync(gameId);
            Assert.Empty(hidden!.Quiz.QuestionSessions);
            Assert.Empty(hidden.Quiz.PlayerStats);
        }

        await using var closeDb = database.CreateDbContext();
        Assert.Equal(1, (await Repository(closeDb, seed.Deadline).CloseExpiredQuizQuestionSessionsAsync()).ClosedQuizQuestionCount);
        await using var restartedDb = database.CreateDbContext();
        Assert.Equal(0, (await Repository(restartedDb, seed.Deadline).CloseExpiredQuizQuestionSessionsAsync()).ClosedQuizQuestionCount);
        Assert.Equal(2, await restartedDb.GameQuizPointLedgerEntries.CountAsync());
        Assert.Equal(10, await restartedDb.GameQuizPointLedgerEntries.SumAsync(x => x.PointsDelta));
        var closedHistory = new DbGameHistoryRepository(restartedDb,
            Options.Create(new StorageOptions { PublicBaseUrl = "https://storage.test" }));
        var closedGameId = (await restartedDb.GameQuizQuestionSessions.SingleAsync()).GameId;
        var details = await closedHistory.GetGameDetailsAsync(closedGameId);
        var session = Assert.Single(details!.Quiz.QuestionSessions);
        Assert.Equal(2, session.Submissions.Count);
        Assert.All(session.Submissions, submission => { Assert.True(submission.IsCorrect); Assert.Equal(5, submission.AwardedPoints); });
        Assert.Equal(seed.CorrectId, session.CorrectOptionId);
        Assert.Equal(2, details.Quiz.PlayerStats.Count);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ConcurrentChoicesForOneUser_AreUniqueAndIdempotentAcrossTransports(bool changeChoice)
    {
        var seed = await SeedAsync();
        var gate = new SubmissionGate();
        await using var firstDb = database.CreateDbContext(gate);
        await using var secondDb = database.CreateDbContext();
        var first = Repository(firstDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.CorrectId, new WebGameQuizAnswerSource(seed.First.Id)));
        await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        await secondDb.Database.OpenConnectionAsync();
        var second = Repository(secondDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
            new(changeChoice ? seed.WrongId : seed.CorrectId,
                new TwitchGameQuizAnswerSource(seed.First.TwitchUserId, seed.First.Login,
                    seed.First.DisplayName, "channel", "message")));
        try { await WaitForLockAsync(secondDb); }
        finally { gate.Release.TrySetResult(); }
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Accepted, (await first).Outcome);
        Assert.Equal(changeChoice ? SubmitQuizAnswerRepositoryOutcome.AlreadyAnswered : SubmitQuizAnswerRepositoryOutcome.Existing,
            (await second.WaitAsync(TimeSpan.FromSeconds(10))).Outcome);
        Assert.Equal(1, await secondDb.GameQuizSubmissions.CountAsync());

        await using var closedDb = database.CreateDbContext();
        var repository = Repository(closedDb, seed.Deadline);
        await repository.CloseExpiredQuizQuestionSessionsAsync();
        var retry = await repository.SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.CorrectId, new WebGameQuizAnswerSource(seed.First.Id)));
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Existing, retry.Outcome);
        Assert.Equal((await first).Receipt!.SubmissionId, retry.Receipt!.SubmissionId);
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.AlreadyAnswered,
            (await repository.SubmitQuizAnswerAsync(seed.SessionId,
                new(seed.WrongId, new WebGameQuizAnswerSource(seed.First.Id)))).Outcome);
    }

    [Fact]
    public async Task ClosureWaitsForInFlightAnswer_AndIgnoresStaleLoadedNavigation()
    {
        var seed = await SeedAsync();
        await using var closeDb = database.CreateDbContext();
        await closeDb.GameQuizQuestionSessions.Include(x => x.Submissions).SingleAsync();
        await closeDb.Database.OpenConnectionAsync();
        var gate = new SubmissionGate();
        await using var answerDb = database.CreateDbContext(gate);
        var answer = Repository(answerDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.CorrectId, new WebGameQuizAnswerSource(seed.First.Id)));
        await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var closing = Repository(closeDb, seed.Deadline).CloseExpiredQuizQuestionSessionsAsync();
        try { await WaitForLockAsync(closeDb); }
        finally { gate.Release.TrySetResult(); }
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Accepted, (await answer).Outcome);
        Assert.Equal(1, (await closing.WaitAsync(TimeSpan.FromSeconds(10))).ClosedQuizQuestionCount);
        await using var verifyDb = database.CreateDbContext();
        Assert.Equal(5, (await verifyDb.GameQuizSubmissions.SingleAsync()).AwardedPoints);
        Assert.Equal(5, (await verifyDb.GameQuizPointLedgerEntries.SingleAsync()).PointsDelta);
    }

    [Fact]
    public async Task DeadlineRejectsNewAnswer_AndPublicStateHidesResultsUntilClosure()
    {
        var seed = await SeedAsync();
        await using var db = database.CreateDbContext();
        var repository = Repository(db, seed.Now);
        await repository.SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.WrongId, new WebGameQuizAnswerSource(seed.First.Id)));
        var open = await repository.GetCurrentQuizStateAsync(seed.First.Id);
        Assert.Null(open!.CorrectOptionId);
        Assert.Null(open.Reward);
        Assert.Null(open.MyIsCorrect);
        Assert.Null(open.OptionResults);
        Assert.Empty(await db.GameQuizPointLedgerEntries.ToArrayAsync());
        var deadlineRepository = Repository(db, seed.Deadline);
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.QuestionSessionClosed,
            (await deadlineRepository.SubmitQuizAnswerAsync(seed.SessionId,
                new(seed.CorrectId, new WebGameQuizAnswerSource(seed.Second.Id)))).Outcome);
        var closed = await deadlineRepository.GetCurrentQuizStateAsync(seed.First.Id);
        Assert.False(closed!.MyIsCorrect);
        Assert.Equal(0, closed.MyAwardedPoints);
        Assert.Equal(1, closed.TotalSubmissions);
        Assert.Equal(100m, closed.OptionResults!.Single(x => x.OptionId == seed.WrongId).Percentage);
        Assert.Empty(await db.GameQuizPointLedgerEntries.ToArrayAsync());
    }

    private static DbGameQuizRepository Repository(ApplicationDbContext db, DateTime now) => new(db, new Clock(now));
    [Fact]
    public async Task SubmissionAndCurrentState_DoNotLoadOtherParticipants()
    {
        var seed = await SeedAsync();
        await using (var firstDb = database.CreateDbContext())
        {
            await Repository(firstDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
                new(seed.CorrectId, new WebGameQuizAnswerSource(seed.First.Id)));
        }
        await using var secondDb = database.CreateDbContext();
        var repository = Repository(secondDb, seed.Now);
        await repository.SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.WrongId, new WebGameQuizAnswerSource(seed.Second.Id)));
        Assert.Equal(seed.Second.Id, Assert.Single(secondDb.ChangeTracker.Entries<GameQuizSubmission>()).Entity.UserId);
        secondDb.ChangeTracker.Clear();
        var state = await repository.GetCurrentQuizStateAsync(seed.Second.Id);
        Assert.Equal(seed.WrongId, state!.MySelectedOptionId);
        Assert.Empty(secondDb.ChangeTracker.Entries<GameQuizSubmission>());
    }

    [Fact]
    public async Task TwitchTransport_CreatesAFirstTimeActivePrincipal()
    {
        var seed = await SeedAsync();
        await using var db = database.CreateDbContext();
        var result = await Repository(db, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.CorrectId, new TwitchGameQuizAnswerSource("unknown", "unknown", "Unknown", "channel", "message")));
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Accepted, result.Outcome);
        Assert.Equal(3, await db.Users.CountAsync());
        Assert.Single(await db.GameQuizSubmissions.ToArrayAsync());
    }

    [Fact]
    public async Task TwitchTransport_PreservesAnExistingBlock()
    {
        var seed = await SeedAsync();
        await using var db = database.CreateDbContext();
        var now = seed.Now;
        db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            TwitchUserId = "300002",
            Login = "blocked",
            DisplayName = "Blocked",
            IsActive = false,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        });
        await db.SaveChangesAsync();

        var result = await Repository(db, now).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.CorrectId, new TwitchGameQuizAnswerSource("300002", "renamed", "Renamed", "channel", "blocked-message")));

        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.PlayerNotFound, result.Outcome);
        var blocked = await db.Users.SingleAsync(x => x.TwitchUserId == "300002");
        Assert.False(blocked.IsActive);
        Assert.Equal("blocked", blocked.Login);
    }

    [Fact]
    public async Task TwitchTransport_DoesNotCreateAUserAtTheDeadline()
    {
        var seed = await SeedAsync();
        await using var db = database.CreateDbContext();
        var result = await Repository(db, seed.Deadline).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.CorrectId, new TwitchGameQuizAnswerSource("300004", "lateviewer", "Late Viewer", "channel", "late-message")));

        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.QuestionSessionClosed, result.Outcome);
        Assert.False(await db.Users.AnyAsync(x => x.TwitchUserId == "300004"));
    }

    [Fact]
    public async Task TwitchTransport_ConcurrentFirstMessagesCreateOnePrincipalAndOneAttempt()
    {
        var seed = await SeedAsync();
        var gate = new SubmissionGate();
        await using var firstDb = database.CreateDbContext(gate);
        await using var secondDb = database.CreateDbContext();
        await secondDb.Database.OpenConnectionAsync();
        var secondProcessId = ((NpgsqlConnection)secondDb.Database.GetDbConnection()).ProcessID;
        var first = Repository(firstDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.CorrectId, new TwitchGameQuizAnswerSource("300003", "newviewer", "New Viewer", "channel", "message-1")));
        await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var second = Repository(secondDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.CorrectId, new TwitchGameQuizAnswerSource("300003", "newviewer", "New Viewer", "channel", "message-2")));
        try { await WaitForLockAsync(secondProcessId); }
        finally { gate.Release.TrySetResult(); }

        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Accepted, (await first).Outcome);
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Existing, (await second.WaitAsync(TimeSpan.FromSeconds(10))).Outcome);
        await using var verifyDb = database.CreateDbContext();
        Assert.Equal(1, await verifyDb.Users.CountAsync(x => x.TwitchUserId == "300003"));
        Assert.Equal(1, await verifyDb.GameQuizSubmissions.CountAsync(x => x.User.TwitchUserId == "300003"));
    }
    private async Task WaitForLockAsync(ApplicationDbContext db)
        => await WaitForLockAsync(((NpgsqlConnection)db.Database.GetDbConnection()).ProcessID);

    private async Task WaitForLockAsync(int processId)
    {
        await using var observer = new NpgsqlConnection(database.ConnectionString);
        await observer.OpenAsync();
        await using var command = new NpgsqlCommand(
            "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE pid = @pid AND wait_event_type = 'Lock')", observer);
        command.Parameters.AddWithValue("pid", processId);
        var elapsed = Stopwatch.StartNew();
        while (elapsed.Elapsed < TimeSpan.FromSeconds(10))
        {
            if (await command.ExecuteScalarAsync() is true) return;
            await Task.Delay(10);
        }
        Assert.Fail("The concurrent transaction did not reach the expected lock.");
    }
    private sealed class Clock(DateTime now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(now, TimeSpan.Zero);
    }
    private sealed class SubmissionGate : SaveChangesInterceptor
    {
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result,
            CancellationToken cancellationToken = default)
        {
            Entered.TrySetResult();
            await Release.Task.WaitAsync(TimeSpan.FromSeconds(15), cancellationToken);
            return result;
        }
    }

    private async Task<Seed> SeedAsync()
    {
        await database.ResetAsync();
        await using var db = database.CreateDbContext();
        var now = DateTime.UtcNow.AddMinutes(-2);
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Title = "Quiz concurrency",
            Status = GameStatusValue.Draft,
            CreatedAtUtc = now,
            QuizAnswerDurationSeconds = 60,
            MinPlayersPerTeam = 1,
            MaxPlayersPerTeam = 2
        };
        User User(string login) => new()
        {
            Id = Guid.NewGuid(),
            TwitchUserId = login,
            Login = login,
            DisplayName = login,
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        var first = User("viewer1"); var second = User("viewer2");
        var category = new QuestionCategory { Id = Guid.NewGuid(), Name = "General", CreatedAtUtc = now, UpdatedAtUtc = now };
        var question = new QuestionDefinition
        {
            Id = Guid.NewGuid(),
            CategoryId = category.Id,
            ExternalCode = "q-1",
            Text = "Choose",
            Reward = 5,
            Revision = 1,
            IsEnabled = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        var correctId = Guid.NewGuid(); var wrongId = Guid.NewGuid();
        question.Options = [new QuestionOption { Id = correctId, QuestionId = question.Id, Text = "Right", NormalizedText = "right",
            IsCorrect = true, SortOrder = 0, CreatedAtUtc = now }, new QuestionOption { Id = wrongId, QuestionId = question.Id,
            Text = "Wrong", NormalizedText = "wrong", IsCorrect = false, SortOrder = 1, CreatedAtUtc = now }];
        var board = new GameBoard
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            Rows = 1,
            Cols = 1,
            RowLabels = ["A"],
            ColLabels = ["1"],
            Version = 1,
            CreatedAtUtc = now
        };
        var slot = new GameTeamSlot
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            SlotIndex = 1,
            SlotType = TeamSlotTypeValue.Public,
            CreatedAtUtc = now
        };
        var team = new GameTeam
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            SlotId = slot.Id,
            Status = TeamStatusValue.Confirmed,
            CreatedByUserId = first.Id,
            ConfirmedByUserId = first.Id,
            ConfirmedAtUtc = now,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        db.AddRange(game, first, second, category, question, board, slot, team,
            new BoardCell
            {
                Id = Guid.NewGuid(),
                BoardId = board.Id,
                RowIndex = 0,
                ColIndex = 0,
                State = BoardCellState.Closed,
                CellType = BoardCellPersistence.DefaultCellType,
                Cost = 0
            },
            new GameTeamMember { Id = Guid.NewGuid(), GameId = game.Id, TeamId = team.Id, UserId = first.Id, JoinedAtUtc = now },
            new GameEnabledQuestion
            {
                GameId = game.Id,
                QuestionId = question.Id,
                EnabledAtUtc = now,
                QuestionRevisionSnapshot = 1,
                QuestionCodeSnapshot = question.ExternalCode,
                CategoryNameSnapshot = category.Name,
                QuestionTextSnapshot = question.Text,
                OptionIdsSnapshot = [correctId, wrongId],
                OptionTextsSnapshot = ["Right", "Wrong"],
                CorrectOptionIdSnapshot = correctId,
                RewardSnapshot = 5,
                SnapshotAtUtc = now
            });
        await db.SaveChangesAsync();
        game.Status = GameStatusValue.Ready; game.ReadyAtUtc = now;
        await db.SaveChangesAsync();
        game.Status = GameStatusValue.Active; game.StartedAtUtc = now;
        await db.SaveChangesAsync();
        var asked = await Repository(db, now.AddSeconds(1)).AskQuizQuestionAsync(game.Id, null, new ManualGameQuizQuestionDelivery(first.Id));
        Assert.NotNull(asked);
        return new(asked.QuestionSessionId, correctId, wrongId, first, second, now.AddSeconds(2), asked.ClosesAtUtc);
    }
    private sealed record Seed(Guid SessionId, Guid CorrectId, Guid WrongId, User First, User Second, DateTime Now, DateTime Deadline);
}
