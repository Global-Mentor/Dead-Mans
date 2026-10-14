using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Configuration;
using backend.Infrastructure.Persistence;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    [Fact]
    public async Task PreparationCompletion_IsPersistedIdempotentAndDoesNotStartGameplay()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seed = await SeedPlayableRoundGraphAsync(db);
        var game = await db.Games.SingleAsync();
        game.ActiveTeamId = seed.TeamId;
        var round = new GameRound
        {
            Id = Guid.NewGuid(),
            GameId = seed.GameId,
            BoardId = seed.BoardId,
            BoardCellId = seed.CellId,
            TeamId = seed.TeamId,
            Status = GameRoundStatusValue.Preparing,
            PreparedAtUtc = seed.Now,
            CreatedAtUtc = seed.Now,
            UpdatedAtUtc = seed.Now,
            BaseScore = 100,
            CellCostSnapshot = 100,
            CellTitleSnapshot = "Test cell",
            TeamSlotIndexSnapshot = 1
        };
        db.Add(round);
        await db.SaveChangesAsync();
        var clock = new MutableTimeProvider(new DateTimeOffset(seed.Now));
        var writer = new DbGameRoundRepository(db, clock);
        Assert.Equal(TransitionGameRoundOutcome.InvalidState,
            (await writer.BeginGameplayAsync(round.Id, new(1), seed.UserId)).Outcome);
        Assert.Equal(StartGameRoundOutcome.RoundAlreadyInProgress,
            (await writer.StartAsync(new(seed.CellId, seed.TeamId), seed.UserId)).Outcome);
        var rejected = await Assert.ThrowsAsync<PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE game_rounds SET status = 'in_progress', version = version + 1, gameplay_started_at_utc = {seed.Now} WHERE id = {round.Id}"));
        Assert.Equal("ck_game_rounds_lifecycle_transition", rejected.ConstraintName);
        Assert.Equal(TransitionGameRoundOutcome.StaleVersion,
            (await writer.CompletePreparationAsync(round.Id, new(99), seed.UserId)).Outcome);

        var completions = await Task.WhenAll(Complete(), Complete());
        Assert.All(completions, result => Assert.Equal(TransitionGameRoundOutcome.Transitioned, result.Outcome));
        await db.Entry(round).ReloadAsync();
        Assert.Equal(GameRoundStatusValue.PreparationCompleted, round.Status);
        Assert.Equal(2, round.Version);
        Assert.Null(round.GameplayStartedAtUtc);
        Assert.Empty(await db.GameRoundModifierResults.Where(row => row.RoundId == round.Id).ToListAsync());
        Assert.Single(await db.GameRoundTransitionAudits.Where(row => row.RoundId == round.Id).ToListAsync());

        await using var observer = _database.CreateDbContext();
        var reader = new DbGameOverlayRepository(observer, Options.Create(new StorageOptions()), clock);
        var frame = await reader.ReadAsync(default);
        Assert.Equal(GameRoundStatusValue.PreparationCompleted, frame.Phase);
        Assert.Null(frame.Board);
        Assert.Null(frame.Round);
        Assert.Null(frame.Gameplay);
        Assert.Null(frame.Summary);
        Assert.Equal(round.Id, (await new DbGameRoundRepository(observer, clock).GetActiveAsync())!.RoundId);
        clock.UtcNow += TimeSpan.FromMinutes(2);
        var started = await writer.BeginGameplayAsync(round.Id, new(2), seed.UserId);
        Assert.Equal(TransitionGameRoundOutcome.Transitioned, started.Outcome);
        Assert.Equal(clock.GetUtcNow().UtcDateTime, round.GameplayStartedAtUtc);

        async Task<TransitionGameRoundResult> Complete()
        {
            await using var concurrent = _database.CreateDbContext();
            return await new DbGameRoundRepository(concurrent, clock)
                .CompletePreparationAsync(round.Id, new(1), seed.UserId);
        }
    }
}
