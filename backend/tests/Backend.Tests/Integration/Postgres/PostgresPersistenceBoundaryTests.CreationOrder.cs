using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task AutomaticTeamCreation_PreservesQueueInvitationsAndActiveTeamAcrossConcurrentAppends(bool reservedGap)
    {
        await _database.ResetAsync();
        await using var seed = _database.CreateDbContext();
        Guid earlierTeamId = default;
        var seeded = await SeedPlayableRoundGraphAsync(seed, async (db, now, gameId, _) =>
        {
            var gap = CreateSlot(gameId, 2, now);
            if (reservedGap)
            {
                gap.SlotType = TeamSlotTypeValue.Reserved;
                gap.ReservedLabel = "Additional team";
            }
            var third = CreateSlot(gameId, 3, now);
            var fourth = CreateSlot(gameId, 4, now);
            db.GameTeamSlots.AddRange(gap, third, fourth);
            var lastTeam = await db.GameTeams.SingleAsync();
            lastTeam.SlotId = fourth.Id;
            await db.SaveChangesAsync();
        });
        var earlierSlot = await seed.GameTeamSlots.SingleAsync(slot => slot.SlotIndex == 3);
        var earlier = CreateTeam(seeded.GameId, earlierSlot.Id, seeded.Now, TeamStatusValue.Forming, recruitmentOpen: false);
        earlier.Name = "Earlier team";
        earlier.CreatedByUserId = seeded.UserId;
        earlierTeamId = earlier.Id;
        var invitee = CreateUser("queue-invitee");
        seed.AddRange(earlier, invitee);
        seed.GameTeamInvitations.Add(new GameTeamInvitation
        {
            Id = Guid.NewGuid(),
            GameId = seeded.GameId,
            TeamId = earlier.Id,
            SlotId = earlierSlot.Id,
            InvitedByUserId = seeded.UserId,
            InvitedUserId = invitee.Id,
            InvitedByKind = InvitedByKindValue.Admin,
            Status = TeamInvitationStatusValue.Pending,
            CreatedAtUtc = seeded.Now
        });
        await seed.SaveChangesAsync();
        (await seed.Games.SingleAsync()).ActiveTeamId = seeded.TeamId;
        await seed.SaveChangesAsync();
        async Task<GameRegistrationResult<RegistrationTeamDto>> CreateAsync(string name)
        {
            await using var db = _database.CreateDbContext();
            var persistence = new DbGameRegistrationPersistence(db, new GameRegistrationReadStore(db),
                NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
            return await persistence.PersistCreateEmptyTeamAsync(seeded.GameId, seeded.UserId, null, true, name, appendToQueue: true);
        }
        var results = await Task.WhenAll(CreateAsync("Appended one"), CreateAsync("Appended two"));
        Assert.All(results, result => Assert.True(result.Success));
        await using var verify = _database.CreateDbContext();
        var ordered = await verify.GameTeams.OrderBy(team => team.Slot!.SlotIndex).ToArrayAsync();
        Assert.Equal(earlierTeamId, ordered[0].Id);
        Assert.Equal(seeded.TeamId, ordered[1].Id);
        Assert.All(ordered.Skip(2), team => Assert.StartsWith("Appended", team.Name));
        Assert.Equal(4, ordered.Length);
        Assert.Equal(4, await verify.GameTeamSlots.CountAsync());
        Assert.Equal(seeded.TeamId, (await verify.Games.SingleAsync()).ActiveTeamId);
        var invitation = await verify.GameTeamInvitations.SingleAsync();
        Assert.Equal(earlierTeamId, invitation.TeamId);
        Assert.Equal(ordered[0].SlotId, invitation.SlotId);
        Assert.Equal(TeamInvitationStatusValue.Pending, invitation.Status);
        Assert.Equal(2, (await verify.GameTeamSlots.SingleAsync(slot => slot.Id == ordered[1].SlotId)).SlotIndex);
    }
}
