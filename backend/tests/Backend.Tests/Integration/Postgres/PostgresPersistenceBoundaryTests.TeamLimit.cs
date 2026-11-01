using backend.Application.Contracts;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    [Fact]
    public async Task TeamLimit_MigrationPreservesAnExistingActiveRosterAndItsCapacity()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(db);
        var memberId = (await db.GameTeamMembers.SingleAsync()).UserId;
        await db.GetService<IMigrator>().MigrateAsync("20261014185916_AddOverlayTestMode");
        await db.Database.MigrateAsync();
        db.ChangeTracker.Clear();
        Assert.Equal(1, (await db.Games.SingleAsync()).TeamLimit);
        Assert.Equal(seeded.TeamId, (await db.GameTeams.SingleAsync()).Id);
        Assert.Equal(TeamStatusValue.Confirmed, (await db.GameTeams.SingleAsync()).Status);
        Assert.Equal(memberId, (await db.GameTeamMembers.SingleAsync()).UserId);
    }

    [Fact]
    public async Task TeamLimit_LoweringPreservesFormingAndConfirmedTeamsAndUnlimitedReopensCreation()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(db);
        var reads = new GameRegistrationReadStore(db);
        var persistence = new DbGameRegistrationPersistence(db, reads, NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        Assert.Equal(10, (await db.Games.SingleAsync()).TeamLimit);
        for (var index = 2; index <= 6; index++)
            Assert.True((await persistence.PersistCreateEmptyTeamAsync(seeded.GameId, seeded.UserId, null, true, $"Team {index}")).Success);
        var before = await db.GameTeams.AsNoTracking().OrderBy(team => team.Id).Select(team => new { team.Id, team.Status, team.SlotId }).ToListAsync();
        var members = await db.GameTeamMembers.CountAsync(member => member.LeftAtUtc == null);
        Assert.True((await persistence.PersistUpdateTeamLimitAsync(seeded.GameId, 4)).Success);
        Assert.Equal(before, await db.GameTeams.AsNoTracking().OrderBy(team => team.Id).Select(team => new { team.Id, team.Status, team.SlotId }).ToListAsync());
        Assert.Equal(members, await db.GameTeamMembers.CountAsync(member => member.LeftAtUtc == null));
        Assert.False((await reads.BuildAdminSnapshotAsync(seeded.GameId)).CanCreateTeam);
        Assert.Equal(GameRegistrationErrorCode.NoAvailableSlot,
            (await persistence.PersistCreateEmptyTeamAsync(seeded.GameId, seeded.UserId, null, true, "Blocked")).Error);
        Assert.True((await persistence.PersistUpdateTeamLimitAsync(seeded.GameId, null)).Success);
        Assert.True((await persistence.PersistCreateEmptyTeamAsync(seeded.GameId, seeded.UserId, null, true, "Unlimited")).Success);
        await using var reload = _database.CreateDbContext();
        Assert.Null((await reload.Games.SingleAsync()).TeamLimit);
        Assert.Equal(7, await reload.GameTeams.CountAsync());
        Assert.Equal(7, await reload.GameTeamSlots.CountAsync());
    }

    [Fact]
    public async Task TeamLimit_ConcurrentCreationCannotExceedLastAvailablePlace()
    {
        await _database.ResetAsync();
        await using var seed = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(seed);
        var persistence = new DbGameRegistrationPersistence(seed, new GameRegistrationReadStore(seed), NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        Assert.True((await persistence.PersistUpdateTeamLimitAsync(seeded.GameId, 2)).Success);
        async Task<GameRegistrationResult<RegistrationTeamDto>> CreateAsync(string name)
        {
            await using var db = _database.CreateDbContext();
            return await new DbGameRegistrationPersistence(db, new GameRegistrationReadStore(db), NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System)
                .PersistCreateEmptyTeamAsync(seeded.GameId, seeded.UserId, null, true, name);
        }
        var results = await Task.WhenAll(CreateAsync("Concurrent one"), CreateAsync("Concurrent two"));
        Assert.Single(results, result => result.Success);
        Assert.Equal(GameRegistrationErrorCode.NoAvailableSlot, Assert.Single(results, result => !result.Success).Error);
        await using var verify = _database.CreateDbContext();
        Assert.Equal(2, await verify.GameTeams.CountAsync());
        Assert.Equal(2, await verify.GameTeamSlots.CountAsync());
    }
}
