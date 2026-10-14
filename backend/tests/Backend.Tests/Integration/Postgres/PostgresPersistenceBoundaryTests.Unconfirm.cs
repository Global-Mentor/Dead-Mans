using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    [Theory]
    [InlineData("eligible")]
    [InlineData("active")]
    [InlineData("played")]
    [InlineData("completed")]
    [InlineData("cancelled")]
    public async Task UnconfirmDuringActiveGame_PreservesRosterAndRejectsOpenedHistory(string state)
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(db, async (context, now, _, _) =>
        {
            (await context.GameTeamMembers.SingleAsync()).ReadyAtUtc = now;
            await context.SaveChangesAsync();
        });
        var game = await db.Games.SingleAsync();
        var team = await db.GameTeams.SingleAsync();
        if (state == "active")
        {
            game.ActiveTeamId = team.Id;
        }
        if (state == "played")
        {
            team.IsPlayed = true;
            team.PlayedAtUtc = DateTime.UtcNow;
            team.UpdatedAtUtc = team.PlayedAtUtc.Value;
        }
        if (state is "completed" or "cancelled")
        {
            db.GameRounds.Add(new GameRound
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                BoardId = seeded.BoardId,
                BoardCellId = seeded.CellId,
                TeamId = team.Id,
                Status = state == "cancelled" ? GameRoundStatusValue.Cancelled : GameRoundStatusValue.Completed,
                BaseScore = 100,
                FinalScore = state == "cancelled" ? 0 : 100,
                TechnicalCancellationReasonCode = state == "cancelled" ? "operator_error" : null,
                InternalCancellationDetail = state == "cancelled" ? "Registration boundary fixture" : null,
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
        }
        await db.SaveChangesAsync();
        var readyAt = await db.GameTeamMembers.Select(member => member.ReadyAtUtc).SingleAsync();
        db.ChangeTracker.Clear();

        var repository = new DbGameRegistrationPersistence(
            db, new GameRegistrationReadStore(db),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System
        );
        var result = await repository.PersistUnconfirmTeamAsync(seeded.GameId, seeded.UserId, seeded.TeamId);

        await using var verifyDb = _database.CreateDbContext();
        var persistedTeam = await verifyDb.GameTeams.SingleAsync();
        var members = await verifyDb.GameTeamMembers.ToListAsync();
        Assert.NotEmpty(members);
        if (state == "eligible")
        {
            Assert.True(result.Success);
            Assert.Equal(TeamStatusValue.Forming, persistedTeam.Status);
            Assert.All(members, member => { Assert.Null(member.LeftAtUtc); Assert.Equal(readyAt, member.ReadyAtUtc); });
            Assert.Null(persistedTeam.ConfirmedAtUtc);
            Assert.Null(persistedTeam.ConfirmedByUserId);
            Assert.Empty(await verifyDb.GameTeams.Where(candidate => candidate.Status == TeamStatusValue.Confirmed).ToListAsync());
        }
        else
        {
            Assert.False(result.Success);
            Assert.Equal(state == "active" ? GameRegistrationErrorCode.TeamActiveInGame : GameRegistrationErrorCode.TeamAlreadyPlayed, result.Error);
            Assert.Equal(TeamStatusValue.Confirmed, persistedTeam.Status);
            Assert.All(members, member => Assert.Null(member.LeftAtUtc));
            var databaseRejection = await Assert.ThrowsAsync<PostgresException>(() =>
                verifyDb.Database.ExecuteSqlInterpolatedAsync($"""
                    UPDATE game_teams SET status = 'forming', confirmed_at_utc = NULL,
                        confirmed_by_user_id = NULL, updated_at_utc = {DateTime.UtcNow}
                    WHERE id = {seeded.TeamId}
                    """));
            Assert.Equal("55000", databaseRejection.SqlState);
        }
        Assert.Equal(GameStatusValue.Active, (await verifyDb.Games.SingleAsync()).Status);
    }

    [Fact]
    public async Task UnconfirmTeam_RechecksActiveSelectionAfterWaitingForGameLock()
    {
        await _database.ResetAsync();
        await using var writer = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(writer);
        await using var reader = _database.CreateDbContext();
        await reader.GameTeams.SingleAsync();
        await using var transaction = await writer.Database.BeginTransactionAsync();
        await writer.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM games WHERE id = {seeded.GameId} FOR UPDATE");
        var repository = new DbGameRegistrationPersistence(reader, new GameRegistrationReadStore(reader), NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        var command = repository.PersistUnconfirmTeamAsync(seeded.GameId, seeded.UserId, seeded.TeamId, timeout.Token);
        (await writer.Games.SingleAsync()).ActiveTeamId = seeded.TeamId;
        await writer.SaveChangesAsync();
        await transaction.CommitAsync();
        var result = await command;
        Assert.False(result.Success);
        Assert.Equal(GameRegistrationErrorCode.TeamActiveInGame, result.Error);
        await using var verify = _database.CreateDbContext();
        Assert.Equal(TeamStatusValue.Confirmed, (await verify.GameTeams.SingleAsync()).Status);
        Assert.Equal(seeded.TeamId, (await verify.Games.SingleAsync()).ActiveTeamId);
    }
}
