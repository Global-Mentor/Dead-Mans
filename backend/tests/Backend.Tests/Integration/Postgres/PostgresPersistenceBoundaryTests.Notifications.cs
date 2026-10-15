using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    [Fact]
    public async Task Disband_WhenNotificationSaveFails_RollsBackTeamAndMembership()
    {
        await _database.ResetAsync();
        await using var seed = _database.CreateDbContext();
        var now = DateTime.UtcNow;
        var admin = CreateUser("notification-admin");
        var player = CreateUser("notification-player");
        var game = CreateGame(GameStatusValue.Draft, now);
        var slot = CreateSlot(game.Id, 1, now);
        var team = CreateTeam(game.Id, slot.Id, now, TeamStatusValue.Forming, true);
        seed.AddRange(admin, player, game, slot, team, new GameTeamMember
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            TeamId = team.Id,
            UserId = player.Id,
            JoinedAtUtc = now
        });
        AddDraftBoard(seed, game.Id, now);
        await seed.SaveChangesAsync();
        game.Status = GameStatusValue.Ready;
        game.ReadyAtUtc = now;
        await seed.SaveChangesAsync();

        await using var writer = _database.CreateDbContext(new RejectParticipationNotificationSave());
        var persistence = new DbGameRegistrationPersistence(writer, new GameRegistrationReadStore(writer),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        await Assert.ThrowsAsync<InvalidOperationException>(() => persistence.PersistDisbandTeamAsync(game.Id, admin.Id, team.Id));

        await using var verify = _database.CreateDbContext();
        Assert.Equal(TeamStatusValue.Forming, (await verify.GameTeams.SingleAsync()).Status);
        Assert.Null((await verify.GameTeamMembers.SingleAsync()).LeftAtUtc);
        Assert.Empty(await verify.GameUserNotifications.ToListAsync());
    }

    private sealed class RejectParticipationNotificationSave : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (eventData.Context!.ChangeTracker.Entries<GameUserNotification>().Any(entry => entry.State == EntityState.Added))
                throw new InvalidOperationException("Simulated notification storage failure.");
            return ValueTask.FromResult(result);
        }
    }
}
