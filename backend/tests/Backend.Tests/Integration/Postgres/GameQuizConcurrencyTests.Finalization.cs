using backend.Application.Contracts;
using backend.Data;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class GameQuizConcurrencyTests
{
    [Theory]
    [InlineData(-1, false)]
    [InlineData(0, true)]
    [InlineData(1, true)]
    public async Task Finalization_SettlesExpiredQuestionsAndSkipsOnlyLiveOnes(int offsetMilliseconds, bool closed)
    {
        var seed = await SeedAsync();
        await using var db = database.CreateDbContext();
        await Repository(db, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.CorrectId, new WebGameQuizAnswerSource(seed.First.Id)));
        await Repository(db, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.WrongId, new WebGameQuizAnswerSource(seed.Second.Id)));
        var persistedSession = await db.GameQuizQuestionSessions.AsNoTracking().SingleAsync();
        var gameId = persistedSession.GameId;
        var deadline = persistedSession.ClosesAtUtc;
        var lifecycle = Lifecycle(db, deadline.AddMilliseconds(offsetMilliseconds));
        var input = await FinishInputAsync(lifecycle, gameId);

        var result = await lifecycle.FinishGameAsync(gameId, input, seed.First.Id);
        Assert.True(result.Success);
        Assert.Equal(closed ? 5 : 0, result.Summary!.QuizTotalPoints);
        Assert.Equal(closed ? 0 : 1, result.Summary.SkippedQuizQuestionCount);
        await using var verify = database.CreateDbContext();
        var session = await verify.GameQuizQuestionSessions.SingleAsync();
        Assert.Equal(closed ? GameQuizQuestionSessionStatusValue.Closed : GameQuizQuestionSessionStatusValue.Skipped, session.Status);
        Assert.Equal(closed ? deadline : deadline.AddMilliseconds(offsetMilliseconds), session.ClosedAtUtc);
        Assert.Equal(closed ? 5 : 0, await verify.GameQuizSubmissions.Where(x => x.IsCorrect).Select(x => x.AwardedPoints).SingleAsync());
        Assert.Equal(0, await verify.GameQuizSubmissions.Where(x => !x.IsCorrect).Select(x => x.AwardedPoints).SingleAsync());
        Assert.Equal(closed ? 1 : 0, await verify.GameQuizPointLedgerEntries.CountAsync());

        var retry = await lifecycle.FinishGameAsync(gameId, input, seed.First.Id);
        Assert.True(retry.AlreadyFinished);
        Assert.Equal(result.Summary.QuizTotalPoints, retry.Summary!.QuizTotalPoints);
        Assert.Equal(0, (await Repository(verify, seed.Deadline.AddSeconds(5)).CloseExpiredQuizQuestionSessionsAsync()).ClosedQuizQuestionCount);
        Assert.Equal(closed ? 1 : 0, await verify.GameQuizPointLedgerEntries.CountAsync());
    }

    [Fact]
    public async Task Finalization_WaitsForAcceptedSubmissionAndCompetingClosureAwardsOnlyOnce()
    {
        var seed = await SeedAsync();
        var gate = new SubmissionGate();
        await using var answerDb = database.CreateDbContext(gate);
        await using var finishDb = database.CreateDbContext();
        await using var closeDb = database.CreateDbContext();
        var gameId = (await finishDb.GameQuizQuestionSessions.AsNoTracking().SingleAsync()).GameId;
        var lifecycle = Lifecycle(finishDb, seed.Deadline.AddMilliseconds(1));
        var input = await FinishInputAsync(lifecycle, gameId);
        await finishDb.Database.OpenConnectionAsync();
        var answer = Repository(answerDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.CorrectId, new WebGameQuizAnswerSource(seed.First.Id)));
        await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var finishing = lifecycle.FinishGameAsync(gameId, input, seed.First.Id);
        var closing = Repository(closeDb, seed.Deadline.AddMilliseconds(1)).CloseExpiredQuizQuestionSessionsAsync();
        try { await WaitForLockAsync(finishDb); }
        finally { gate.Release.TrySetResult(); }
        await answer;
        Assert.True((await finishing.WaitAsync(TimeSpan.FromSeconds(10))).Success);
        await closing.WaitAsync(TimeSpan.FromSeconds(10));
        await using var verify = database.CreateDbContext();
        Assert.Equal(5, (await verify.GameQuizSubmissions.SingleAsync()).AwardedPoints);
        Assert.Equal(5, (await verify.GameQuizPointLedgerEntries.SingleAsync()).PointsDelta);
        Assert.Equal(5, (await verify.GameFinalizations.SingleAsync()).QuizTotalPoints);
    }

    [Fact]
    public async Task Finalization_RechecksDeadlineAfterWaitingForTheGameLock()
    {
        var seed = await SeedAsync();
        await using var finishDb = database.CreateDbContext();
        await Repository(finishDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.CorrectId, new WebGameQuizAnswerSource(seed.First.Id)));
        var session = await finishDb.GameQuizQuestionSessions.AsNoTracking().SingleAsync();
        var clock = new MutableFinalizationClock(session.ClosesAtUtc.AddMilliseconds(-1));
        var lifecycle = new DbGameLifecyclePersistence(finishDb, NullLogger<DbGameLifecyclePersistence>.Instance, clock);
        var input = await FinishInputAsync(lifecycle, session.GameId);
        await finishDb.Database.OpenConnectionAsync();
        await using var blockerDb = database.CreateDbContext();
        await using var blocker = await blockerDb.Database.BeginTransactionAsync();
        await blockerDb.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM games WHERE id = {session.GameId} FOR UPDATE");
        var finishing = lifecycle.FinishGameAsync(session.GameId, input, seed.First.Id);
        try
        {
            await WaitForLockAsync(finishDb);
            clock.Now = session.ClosesAtUtc.AddMilliseconds(1);
        }
        finally { await blocker.RollbackAsync(); }
        var result = await finishing.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.True(result.Success);
        Assert.Equal(5, result.Summary!.QuizTotalPoints);
        await using var verify = database.CreateDbContext();
        Assert.Equal(GameQuizQuestionSessionStatusValue.Closed, (await verify.GameQuizQuestionSessions.SingleAsync()).Status);
        Assert.Equal(5, (await verify.GameQuizPointLedgerEntries.SingleAsync()).PointsDelta);
    }

    [Fact]
    public async Task FailedFinalization_RollsBackQuestionClosureAndRewards()
    {
        var seed = await SeedAsync();
        await using (var answerDb = database.CreateDbContext())
        {
            await Repository(answerDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
                new(seed.CorrectId, new WebGameQuizAnswerSource(seed.First.Id)));
        }
        await using (var finishDb = database.CreateDbContext(new RejectFinalization()))
        {
            var gameId = (await finishDb.GameQuizQuestionSessions.AsNoTracking().SingleAsync()).GameId;
            var lifecycle = Lifecycle(finishDb, seed.Deadline);
            var input = await FinishInputAsync(lifecycle, gameId);
            await Assert.ThrowsAsync<InvalidOperationException>(() => lifecycle.FinishGameAsync(gameId, input, seed.First.Id));
        }
        await using var verify = database.CreateDbContext();
        Assert.Equal(GameStatusValue.Active, (await verify.Games.SingleAsync()).Status);
        Assert.Equal(GameQuizQuestionSessionStatusValue.Open, (await verify.GameQuizQuestionSessions.SingleAsync()).Status);
        Assert.Equal(0, (await verify.GameQuizSubmissions.SingleAsync()).AwardedPoints);
        Assert.Empty(await verify.GameQuizPointLedgerEntries.ToArrayAsync());
        Assert.Empty(await verify.GameFinalizations.ToArrayAsync());
        Assert.Equal(1, (await Repository(verify, seed.Deadline).CloseExpiredQuizQuestionSessionsAsync()).ClosedQuizQuestionCount);
        Assert.Equal(5, (await verify.GameQuizPointLedgerEntries.SingleAsync()).PointsDelta);
    }

    private static DbGameLifecyclePersistence Lifecycle(ApplicationDbContext db, DateTime now) =>
        new(db, NullLogger<DbGameLifecyclePersistence>.Instance, new Clock(now));

    private static async Task<FinishGameInput> FinishInputAsync(DbGameLifecyclePersistence lifecycle, Guid gameId)
    {
        var preview = (await lifecycle.GetFinishPreviewAsync(gameId)).Preview!;
        return new(preview.Summary.BoardVersion, Guid.NewGuid(), preview.Warnings.Select(x => x.Code).ToHashSet(), null);
    }

    private sealed class RejectFinalization : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (eventData.Context!.ChangeTracker.Entries<backend.Data.Entities.GameFinalization>().Any())
            {
                throw new InvalidOperationException("Simulated finalization write failure.");
            }
            return ValueTask.FromResult(result);
        }
    }

    private sealed class MutableFinalizationClock(DateTime now) : TimeProvider
    {
        public DateTime Now { get; set; } = now;
        public override DateTimeOffset GetUtcNow() => new(Now, TimeSpan.Zero);
    }
}
