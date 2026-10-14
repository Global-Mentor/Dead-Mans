using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Backend.Tests.Unit.Infrastructure.Persistence;

public sealed partial class DbGameBoardRepositoryTests
{
    [Theory]
    [InlineData(false, false, false, SetGameTeamPlayedStateOutcome.TeamHasNotOpenedCard)]
    [InlineData(true, true, false, SetGameTeamPlayedStateOutcome.TeamActiveInGame)]
    [InlineData(true, false, false, SetGameTeamPlayedStateOutcome.Updated)]
    [InlineData(true, false, true, SetGameTeamPlayedStateOutcome.Updated)]
    public async Task PlayedState_RequiresAnOpenedCardAndInactiveTeam(bool opened, bool active, bool otherRoundActive, SetGameTeamPlayedStateOutcome expected)
    {
        await using var db = CreateContext();
        var gameId = Guid.NewGuid();
        var teamId = Guid.NewGuid();
        var otherTeamId = Guid.NewGuid();
        var slotId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        db.Games.Add(new Game { Id = gameId, Title = "Played state", Status = GameStatusValue.Active, ActiveTeamId = active ? teamId : otherRoundActive ? otherTeamId : null, CreatedAtUtc = now, StartedAtUtc = now });
        db.GameTeamSlots.Add(new GameTeamSlot { Id = slotId, GameId = gameId, SlotIndex = 1, SlotType = TeamSlotTypeValue.Public, CreatedAtUtc = now });
        db.GameTeams.Add(new GameTeam { Id = teamId, GameId = gameId, SlotId = slotId, Name = "Ruiners", Status = TeamStatusValue.Confirmed, CreatedAtUtc = now, UpdatedAtUtc = now });
        if (opened) db.GameRounds.Add(new GameRound { Id = Guid.NewGuid(), GameId = gameId, TeamId = teamId, BoardId = Guid.NewGuid(), BoardCellId = Guid.NewGuid(), Status = GameRoundStatusValue.Cancelled, CreatedAtUtc = now, UpdatedAtUtc = now });
        if (otherRoundActive) db.GameRounds.Add(new GameRound { Id = Guid.NewGuid(), GameId = gameId, TeamId = otherTeamId, BoardId = Guid.NewGuid(), BoardCellId = Guid.NewGuid(), Status = GameRoundStatusValue.InProgress, CreatedAtUtc = now, UpdatedAtUtc = now });
        await db.SaveChangesAsync();
        var repository = new DbGameBoardRepository(db, Options.Create(Storage), NullLogger<DbGameBoardRepository>.Instance, TimeProvider.System);
        Assert.Equal(expected, await repository.SetGameTeamPlayedStateAsync(teamId, true));
        Assert.Equal(expected == SetGameTeamPlayedStateOutcome.Updated, (await db.GameTeams.SingleAsync()).IsPlayed);
        Assert.Equal(active ? teamId : otherRoundActive ? otherTeamId : (Guid?)null, (await db.Games.SingleAsync()).ActiveTeamId);
        var snapshot = await new GameRegistrationReadStore(db).LoadTeamDtoAsync(teamId, CancellationToken.None);
        Assert.NotNull(snapshot);
        Assert.Equal(opened, snapshot.HasOpenedCard);
        if (expected == SetGameTeamPlayedStateOutcome.Updated)
        {
            Assert.Equal(SetGameTeamPlayedStateOutcome.Updated, await repository.SetGameTeamPlayedStateAsync(teamId, false));
            Assert.False((await db.GameTeams.SingleAsync()).IsPlayed);
            Assert.Equal(opened, (await new GameRegistrationReadStore(db).LoadTeamDtoAsync(teamId, CancellationToken.None))!.HasOpenedCard);
        }
    }
}
