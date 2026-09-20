using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    [Fact]
    public async Task AdminTeams_AfterStart_CanCreatePopulateConfirmAndReorderWithoutChangingActiveRound()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        Guid spareSlotId = Guid.Empty;
        var player = CreateUser("late-player");
        var seeded = await SeedPlayableRoundGraphAsync(db, async (context, now, gameId, _) =>
        {
            var slot = CreateSlot(gameId, 2, now);
            spareSlotId = slot.Id;
            context.AddRange(slot, player);
            await context.SaveChangesAsync();
        });
        var game = await db.Games.SingleAsync();
        game.ActiveTeamId = seeded.TeamId;
        db.GameRounds.Add(new GameRound
        {
            Id = Guid.NewGuid(),
            GameId = seeded.GameId,
            BoardId = seeded.BoardId,
            BoardCellId = seeded.CellId,
            TeamId = seeded.TeamId,
            Status = GameRoundStatusValue.AwaitingModifiers,
            BaseScore = 100,
            TeamSlotIndexSnapshot = 1,
            CellRowIndex = 0,
            CellColIndex = 0,
            CellTitleSnapshot = "Test cell",
            CellCostSnapshot = 100,
            CreatedAtUtc = seeded.Now,
            UpdatedAtUtc = seeded.Now
        });
        await db.SaveChangesAsync();
        var repository = new DbGameRegistrationPersistence(db, new GameRegistrationReadStore(db),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);

        var created = await repository.PersistCreateEmptyTeamAsync(
            seeded.GameId, seeded.UserId, spareSlotId, true, "Late arrivals");
        Assert.True(created.Success);
        var newTeam = await db.GameTeams.SingleAsync(team => team.Id != seeded.TeamId);
        Assert.Equal(TeamStatusValue.Forming, newTeam.Status);
        Assert.True((await repository.PersistAssignPlayerAsync(
            seeded.GameId, seeded.UserId, newTeam.Id, player.Id, game.MaxPlayersPerTeam)).Success);
        Assert.True((await repository.PersistConfirmTeamAsync(
            seeded.GameId, seeded.UserId, newTeam.Id, game.MinPlayersPerTeam, game.MaxPlayersPerTeam)).Success);
        Assert.True((await repository.PersistMoveTeamToSlotAsync(
            seeded.GameId, seeded.UserId, seeded.TeamId, spareSlotId)).Success);

        await using var verifyDb = _database.CreateDbContext();
        Assert.Equal(seeded.TeamId, (await verifyDb.Games.SingleAsync()).ActiveTeamId);
        var round = await verifyDb.GameRounds.SingleAsync();
        Assert.Equal(seeded.TeamId, round.TeamId);
        Assert.Equal(1, round.TeamSlotIndexSnapshot);
        Assert.Equal(GameRoundStatusValue.AwaitingModifiers, round.Status);
        Assert.Equal(spareSlotId, (await verifyDb.GameTeams.SingleAsync(team => team.Id == seeded.TeamId)).SlotId);
        Assert.Equal(2, await verifyDb.GameTeamMembers.CountAsync(member => member.LeftAtUtc == null));
        Assert.Equal(2, await verifyDb.GameTeamSlots.CountAsync());
        var blocked = await repository.PersistDisbandTeamAsync(seeded.GameId, seeded.UserId, seeded.TeamId);
        Assert.False(blocked.Success);
        Assert.Equal(GameRegistrationErrorCode.TeamActiveInGame, blocked.Error);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task AdminTeams_AfterStart_CanDiscardNewFormingTeam(bool reject)
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var player = CreateUser("discarded-player");
        Guid spareSlotId = Guid.Empty;
        var seeded = await SeedPlayableRoundGraphAsync(db, async (context, now, gameId, _) =>
        {
            var slot = CreateSlot(gameId, 2, now);
            spareSlotId = slot.Id;
            context.AddRange(slot, player);
            await context.SaveChangesAsync();
        });
        var repository = new DbGameRegistrationPersistence(db, new GameRegistrationReadStore(db),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        Assert.True((await repository.PersistCreateEmptyTeamAsync(
            seeded.GameId, seeded.UserId, spareSlotId, true, "Temporary team")).Success);
        var team = await db.GameTeams.SingleAsync(team => team.Id != seeded.TeamId);
        Assert.True((await repository.PersistAssignPlayerAsync(
            seeded.GameId, seeded.UserId, team.Id, player.Id, 2)).Success);
        var result = reject
            ? await repository.PersistRejectTeamAsync(seeded.GameId, seeded.UserId, team.Id)
            : await repository.PersistDisbandTeamAsync(seeded.GameId, seeded.UserId, team.Id);
        Assert.True(result.Success);
        await using var verifyDb = _database.CreateDbContext();
        Assert.NotNull((await verifyDb.GameTeamMembers.SingleAsync(member => member.TeamId == team.Id)).LeftAtUtc);
        Assert.Equal(TeamStatusValue.Confirmed, (await verifyDb.GameTeams.SingleAsync(team => team.Id == seeded.TeamId)).Status);
    }
}
