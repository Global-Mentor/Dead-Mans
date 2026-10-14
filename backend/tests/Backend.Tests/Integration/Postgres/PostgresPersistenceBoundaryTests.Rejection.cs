using backend.Application.Contracts;
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
    public async Task RejectReadyTeam_RechecksReadinessAfterGameLockAndCreatesAtomicNotifications(bool withdraw)
    {
        await _database.ResetAsync();
        await using var writer = _database.CreateDbContext();
        var now = DateTime.UtcNow;
        var admin = CreateUser("refusal-admin");
        var player = CreateUser("refusal-player");
        var game = CreateGame(GameStatusValue.Draft, now);
        game.MaxPlayersPerTeam = 1;
        var slot = CreateSlot(game.Id, 1, now);
        var team = CreateTeam(game.Id, slot.Id, now, TeamStatusValue.Forming, true);
        team.Name = "Ready team";
        writer.AddRange(admin, player, game, slot, team, new backend.Data.Entities.GameTeamMember
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            TeamId = team.Id,
            UserId = player.Id,
            JoinedAtUtc = now,
            ReadyAtUtc = now
        });
        AddDraftBoard(writer, game.Id, now);
        await writer.SaveChangesAsync();
        game.Status = GameStatusValue.Ready; game.ReadyAtUtc = now;
        await writer.SaveChangesAsync();
        var seeded = (GameId: game.Id, TeamId: team.Id, UserId: admin.Id);
        var memberId = player.Id;
        await using var reader = _database.CreateDbContext();
        await reader.GameTeams.SingleAsync();
        await reader.GameTeamMembers.SingleAsync();
        await using var transaction = await writer.Database.BeginTransactionAsync();
        await writer.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM games WHERE id = {seeded.GameId} FOR UPDATE");
        var persistence = new DbGameRegistrationPersistence(reader, new GameRegistrationReadStore(reader), NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        var command = persistence.PersistRejectTeamAsync(seeded.GameId, seeded.UserId, seeded.TeamId, timeout.Token);
        if (withdraw) { (await writer.GameTeamMembers.SingleAsync()).ReadyAtUtc = null; await writer.SaveChangesAsync(); }
        await transaction.CommitAsync();
        var result = await command;
        Assert.Equal(!withdraw, result.Success);
        await using var verify = _database.CreateDbContext();
        Assert.Equal(withdraw ? TeamStatusValue.Forming : TeamStatusValue.Rejected, (await verify.GameTeams.SingleAsync()).Status);
        Assert.Equal(!withdraw, (await verify.GameTeamMembers.SingleAsync()).LeftAtUtc.HasValue);
        Assert.Equal(withdraw ? 0 : 1, await verify.GameUserNotifications.CountAsync());
        if (withdraw) Assert.Equal(GameRegistrationErrorCode.TeamNotReady, result.Error);
        else
        {
            var notice = Assert.Single(await new DbGameNotificationRepository(verify, TimeProvider.System).GetUnreadForUserAsync(memberId));
            Assert.Equal(GameNotificationTypes.TeamRejected, notice.Type);
            Assert.Equal(team.Name, notice.TeamName);
            Assert.False((await persistence.PersistRejectTeamAsync(seeded.GameId, seeded.UserId, seeded.TeamId)).Success);
            Assert.Equal(1, await verify.GameUserNotifications.CountAsync());
        }
    }
}
