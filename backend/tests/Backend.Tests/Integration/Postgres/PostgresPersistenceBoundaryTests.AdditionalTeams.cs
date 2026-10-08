using backend.Application.Contracts;
using backend.Data.Entities;
using Npgsql;
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
    public async Task AdditionalAdminTeams_ConcurrentCreationAllocatesDistinctReservedSlotsAndReusesFreedSlot(bool hasSparePublicSlot)
    {
        await _database.ResetAsync();
        await using var seedDb = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(seedDb, async (context, now, gameId, _) =>
        {
            if (hasSparePublicSlot)
            {
                context.GameTeamSlots.Add(CreateSlot(gameId, 2, now));
                await context.SaveChangesAsync();
            }
        });
        async Task<GameRegistrationResult<RegistrationTeamDto>> CreateAsync(string name)
        {
            await using var db = _database.CreateDbContext();
            var persistence = new DbGameRegistrationPersistence(db, new GameRegistrationReadStore(db), NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
            return await persistence.PersistCreateEmptyTeamAsync(seeded.GameId, seeded.UserId, null, true, name);
        }
        var results = await Task.WhenAll(CreateAsync("Extra one"), CreateAsync("Extra two"));
        Assert.All(results, result => Assert.True(result.Success));
        await using var verify = _database.CreateDbContext();
        var slots = await verify.GameTeamSlots.OrderBy(slot => slot.SlotIndex).ToListAsync();
        Assert.Equal(new[] { 1, 2, 3 }, slots.Select(slot => slot.SlotIndex));
        Assert.Equal(hasSparePublicSlot ? TeamSlotTypeValue.Public : TeamSlotTypeValue.Reserved, slots[1].SlotType);
        Assert.Equal(TeamSlotTypeValue.Reserved, slots[2].SlotType);
        var reads = new GameRegistrationReadStore(verify);
        Assert.Null(await reads.FindAvailablePublicSlotAsync(seeded.GameId, default));
        var persistence = new DbGameRegistrationPersistence(verify, reads, NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        var extra = await verify.GameTeams.SingleAsync(team => team.Name == "Extra one");
        var freedSlotId = extra.SlotId;
        Assert.True((await persistence.PersistDisbandTeamAsync(seeded.GameId, seeded.UserId, extra.Id)).Success);
        Assert.True((await CreateAsync("Replacement")).Success);
        await using var final = _database.CreateDbContext();
        Assert.Equal(3, await final.GameTeamSlots.CountAsync());
        Assert.Equal(freedSlotId, (await final.GameTeams.SingleAsync(team => team.Name == "Replacement")).SlotId);
        Assert.Null(await new GameRegistrationReadStore(final).FindAvailablePublicSlotAsync(seeded.GameId, default));
    }
    [Fact]
    public async Task AdditionalAdminTeams_PublishedSlotsRejectUnscopedInsertAndExistingSlotEdits()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(db);
        var id = Guid.NewGuid();
        var insert = await Assert.ThrowsAsync<PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO game_team_slots (id, game_id, slot_index, slot_type, reserved_label, created_at_utc) VALUES ({id}, {seeded.GameId}, 2, 'reserved', '#2', {seeded.Now})"));
        Assert.Equal("55000", insert.SqlState);
        var edit = await Assert.ThrowsAsync<PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE game_team_slots SET slot_index = 99 WHERE game_id = {seeded.GameId}"));
        Assert.Equal("55000", edit.SqlState);
        Assert.Equal(1, await db.GameTeamSlots.CountAsync());
    }

    [Fact]
    public async Task AdditionalAdminTeams_ScopedSlotWithoutTeamCannotCommit()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(db);
        await using (var transaction = await db.Database.BeginTransactionAsync())
        {
            var slot = new GameTeamSlot
            {
                Id = Guid.NewGuid(),
                GameId = seeded.GameId,
                SlotIndex = 2,
                SlotType = TeamSlotTypeValue.Reserved,
                ReservedLabel = "#2",
                CreatedAtUtc = seeded.Now
            };
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT set_config('deadmans.additional_team_slot', {slot.Id.ToString()}, true)");
            db.GameTeamSlots.Add(slot);
            await db.SaveChangesAsync();
            var failure = await Assert.ThrowsAsync<PostgresException>(() => transaction.CommitAsync());
            Assert.Equal("ck_additional_team_slot_occupied", failure.ConstraintName);
        }
        await using var verify = _database.CreateDbContext();
        Assert.Equal(1, await verify.GameTeamSlots.CountAsync());
    }

}
