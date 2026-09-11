using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Configuration;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    [Theory]
    [InlineData(GameRoundStatusValue.AwaitingModifiers)]
    [InlineData(GameRoundStatusValue.Preparing)]
    [InlineData(GameRoundStatusValue.InProgress)]
    [InlineData(GameRoundStatusValue.ReviewingResults)]
    public async Task CancelledRounds_BlockDisbandingAndRemainInFinalResults(string phase)
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(db);
        var round = new GameRound
        {
            Id = Guid.NewGuid(),
            GameId = seeded.GameId,
            BoardId = seeded.BoardId,
            BoardCellId = seeded.CellId,
            TeamId = seeded.TeamId,
            Status = phase,
            BaseScore = 100,
            TeamSlotIndexSnapshot = 1,
            CellRowIndex = 0,
            CellColIndex = 0,
            CellTitleSnapshot = "Test cell",
            CellCostSnapshot = 100,
            CreatedAtUtc = seeded.Now,
            UpdatedAtUtc = seeded.Now,
            PreparedAtUtc = phase == GameRoundStatusValue.AwaitingModifiers ? null : seeded.Now,
            GameplayStartedAtUtc = phase is GameRoundStatusValue.InProgress or GameRoundStatusValue.ReviewingResults ? seeded.Now : null,
            ReviewedAtUtc = phase == GameRoundStatusValue.ReviewingResults ? seeded.Now : null
        };
        db.GameRounds.Add(round);
        var game = await db.Games.SingleAsync();
        game.ActiveTeamId = seeded.TeamId;
        await db.SaveChangesAsync();
        var rounds = new DbGameRoundRepository(db, TimeProvider.System);
        var cancellation = await rounds.TechnicalCancelAsync(round.Id,
            new TechnicalCancelGameRoundInput(round.Version, "operator_error", "Round cancelled", "Team had to leave"),
            seeded.UserId);
        Assert.Equal(TransitionGameRoundOutcome.Transitioned, cancellation.Outcome);

        var board = new DbGameBoardRepository(db, Options.Create(new StorageOptions { PublicBaseUrl = "https://storage.test" }),
            NullLogger<DbGameBoardRepository>.Instance, TimeProvider.System);
        Assert.Equal(SetGameTeamPlayedStateOutcome.Updated, await board.SetGameTeamPlayedStateAsync(seeded.TeamId, true));
        Assert.Null((await db.Games.SingleAsync()).ActiveTeamId);
        // Removing the manual flag must not allow deleting a team's actual contribution.
        Assert.Equal(SetGameTeamPlayedStateOutcome.Updated, await board.SetGameTeamPlayedStateAsync(seeded.TeamId, false));
        var registration = new DbGameRegistrationPersistence(db, new GameRegistrationReadStore(db),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        Assert.Equal(GameRegistrationErrorCode.TeamAlreadyPlayed,
            (await registration.PersistDisbandTeamAsync(seeded.GameId, seeded.UserId, seeded.TeamId)).Error);

        await using (var bypassDb = _database.CreateDbContext())
        {
            var team = await bypassDb.GameTeams.SingleAsync();
            team.Status = TeamStatusValue.Disbanded;
            team.RecruitmentOpen = false;
            team.DisbandedAtUtc = DateTime.UtcNow;
            team.DisbandedByUserId = seeded.UserId;
            var failure = await Record.ExceptionAsync(() => bypassDb.SaveChangesAsync());
            Assert.NotNull(failure);
            Assert.Equal("55000", Assert.IsType<PostgresException>(failure.GetBaseException()).SqlState);
        }

        // The finish request gets a fresh context after the cancellation updates board version in SQL.
        db.ChangeTracker.Clear();
        var lifecycle = new DbGameLifecyclePersistence(db, NullLogger<DbGameLifecyclePersistence>.Instance, TimeProvider.System);
        var preview = Assert.IsType<GameFinishPreview>((await lifecycle.GetFinishPreviewAsync(seeded.GameId)).Preview);
        var finished = await lifecycle.FinishGameAsync(seeded.GameId,
            new FinishGameInput(preview.Summary.BoardVersion, Guid.NewGuid(), preview.Warnings.Select(x => x.Code).ToHashSet(), null),
            seeded.UserId);
        Assert.Equal(GameLifecycleErrorCode.None, finished.Error);
        var history = new DbGameHistoryRepository(db, Options.Create(new StorageOptions { PublicBaseUrl = "https://storage.test" }));
        var details = await history.GetGameDetailsAsync(seeded.GameId);
        Assert.NotNull(details?.FinalResult);
        Assert.Equal(1, details.FinalResult.CancelledRoundCount);
        var result = Assert.Single(details.FinalResult.Teams);
        Assert.Equal(seeded.TeamId, result.TeamId);
        Assert.Equal(0, result.RoundsPlayed);
        Assert.Null(result.FinalScore);
        Assert.Null(result.Placement);
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task FinalizeGame_ExcludesUnplayedTeamsAndSupportsAnEmptyRoster(bool hasCompletedRound, bool disbandFirst)
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(db, hasCompletedRound ? async (draftDb, now, gameId, adminId) =>
        {
            var idleSlot = CreateSlot(gameId, 2, now);
            var idleTeam = CreateTeam(gameId, idleSlot.Id, now, TeamStatusValue.Confirmed);
            idleTeam.ConfirmedAtUtc = now;
            idleTeam.ConfirmedByUserId = adminId;
            draftDb.AddRange(idleSlot, idleTeam, new GameTeamMember
            {
                Id = Guid.NewGuid(),
                GameId = gameId,
                TeamId = idleTeam.Id,
                UserId = adminId,
                JoinedAtUtc = now
            });
            await draftDb.SaveChangesAsync();
        }
        : null);
        if (hasCompletedRound)
        {
            db.GameRounds.Add(new GameRound
            {
                Id = Guid.NewGuid(),
                GameId = seeded.GameId,
                BoardId = seeded.BoardId,
                BoardCellId = seeded.CellId,
                TeamId = seeded.TeamId,
                Status = GameRoundStatusValue.Completed,
                BaseScore = 100,
                FinalScore = 0,
                ResolvedByUserId = seeded.UserId,
                TeamSlotIndexSnapshot = 1,
                CellRowIndex = 0,
                CellColIndex = 0,
                CellTitleSnapshot = "Test cell",
                CellCostSnapshot = 100,
                CreatedAtUtc = seeded.Now,
                UpdatedAtUtc = seeded.Now,
                PreparedAtUtc = seeded.Now,
                GameplayStartedAtUtc = seeded.Now,
                ReviewedAtUtc = seeded.Now,
                FinishedAtUtc = seeded.Now
            });
            await db.SaveChangesAsync();
        }
        if (disbandFirst)
        {
            var registration = new DbGameRegistrationPersistence(db, new GameRegistrationReadStore(db),
                NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
            Assert.True((await registration.PersistDisbandTeamAsync(seeded.GameId, seeded.UserId, seeded.TeamId)).Success);
        }
        var lifecycle = new DbGameLifecyclePersistence(db, NullLogger<DbGameLifecyclePersistence>.Instance, TimeProvider.System);
        var previewResult = await lifecycle.GetFinishPreviewAsync(seeded.GameId);
        var preview = Assert.IsType<GameFinishPreview>(previewResult.Preview);
        var result = await lifecycle.FinishGameAsync(seeded.GameId,
            new FinishGameInput(preview.Summary.BoardVersion, Guid.NewGuid(), preview.Warnings.Select(x => x.Code).ToHashSet(), null),
            seeded.UserId);
        Assert.Equal(GameLifecycleErrorCode.None, result.Error);
        Assert.Equal(hasCompletedRound ? 1 : 0, await db.GameTeamFinalResults.CountAsync());
        var history = new DbGameHistoryRepository(db, Options.Create(new StorageOptions { PublicBaseUrl = "https://storage.test" }));
        var details = await history.GetGameDetailsAsync(seeded.GameId);
        Assert.NotNull(details?.FinalResult);
        Assert.Equal(hasCompletedRound ? 1 : 0, details.FinalResult.Teams.Count);

        if (!hasCompletedRound)
        {
            // Restoring old rules would make this valid new state inconsistent. Refuse atomically.
            var error = await Record.ExceptionAsync(() => db.GetService<IMigrator>().MigrateAsync("20260908003848_ProductionBaseline"));
            Assert.NotNull(error);
            Assert.Equal("55000", Assert.IsType<PostgresException>(error.GetBaseException()).SqlState);
            Assert.Contains("20260910171900_AllowAdminTeamDisband", await db.Database.GetAppliedMigrationsAsync());
        }
    }

    [Fact]
    public async Task Migration_PreservesLegacyFinalizationButHidesUnplayedTeamsInHistory()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        await db.GetService<IMigrator>().MigrateAsync("20260908003848_ProductionBaseline");
        try
        {
            var seeded = await SeedPlayableRoundGraphAsync(db);
            var game = await db.Games.SingleAsync();
            var now = DateTime.UtcNow;
            game.Status = GameStatusValue.Finished;
            game.FinishedAtUtc = now;
            db.GameFinalizations.Add(new GameFinalization
            {
                GameId = game.Id,
                RequestId = Guid.NewGuid(),
                FinishedByUserId = seeded.UserId,
                FinishedByDisplayNameSnapshot = "Legacy admin",
                FinishedAtUtc = now,
                CalculationVersion = 1,
                TeamResults = [new GameTeamFinalResult
                {
                    GameId = game.Id, TeamId = seeded.TeamId, TeamSlotIndexSnapshot = 1,
                    ParticipantNamesSnapshot = ["Legacy player"]
                }]
            });
            await db.SaveChangesAsync();
            await db.Database.MigrateAsync();

            var history = new DbGameHistoryRepository(db, Options.Create(new StorageOptions { PublicBaseUrl = "https://storage.test" }));
            var details = await history.GetGameDetailsAsync(game.Id);
            Assert.NotNull(details?.FinalResult);
            Assert.Empty(details.FinalResult.Teams);
            Assert.Equal(1, await db.GameTeamFinalResults.CountAsync());
            game.IsDeleted = true;
            game.DeletedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
        finally
        {
            await db.Database.MigrateAsync();
        }
    }
}
