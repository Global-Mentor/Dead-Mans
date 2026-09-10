using System.Data.Common;
using backend.Application.Contracts;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LeaveAndConfirm_SerializeAndRecheckTheWinningChange(bool confirmFirst)
    {
        await _database.ResetAsync();
        await using var seedDb = _database.CreateDbContext();
        var now = DateTime.UtcNow;
        var admin = CreateUser("concurrent-admin");
        var player = CreateUser("concurrent-player");
        var game = CreateGame(GameStatusValue.Draft, now);
        var slot = CreateSlot(game.Id, 1, now);
        var team = CreateTeam(game.Id, slot.Id, now, TeamStatusValue.Forming);
        var member = new backend.Data.Entities.GameTeamMember
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            TeamId = team.Id,
            UserId = player.Id,
            JoinedAtUtc = now
        };
        AddDraftBoard(seedDb, game.Id, now);
        seedDb.AddRange(admin, player, game, slot, team, member);
        await seedDb.SaveChangesAsync();
        game.Status = GameStatusValue.Ready;
        game.ReadyAtUtc = now;
        await seedDb.SaveChangesAsync();

        var firstLock = new RosterLockInterceptor(holdLock: true);
        var secondLock = new RosterLockInterceptor(holdLock: false);
        await using var confirmDb = _database.CreateDbContext(confirmFirst ? firstLock : secondLock);
        await using var leaveDb = _database.CreateDbContext(confirmFirst ? secondLock : firstLock);
        var confirm = new DbGameRegistrationPersistence(confirmDb, new GameRegistrationReadStore(confirmDb),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        var leave = new DbGameRegistrationPersistence(leaveDb, new GameRegistrationReadStore(leaveDb),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        Task<GameRegistrationResult<RegistrationTeamDto>>? confirmTask = null;
        Task<GameRegistrationResult<bool>>? leaveTask = null;
        try
        {
            if (confirmFirst)
            {
                confirmTask = confirm.PersistConfirmTeamAsync(game.Id, admin.Id, team.Id, 1, 2, timeout.Token);
            }
            else
            {
                leaveTask = leave.PersistLeaveTeamAsync(game.Id, player.Id, timeout.Token);
            }
            await firstLock.Acquired.Task.WaitAsync(timeout.Token);
            if (confirmFirst)
            {
                leaveTask = leave.PersistLeaveTeamAsync(game.Id, player.Id, timeout.Token);
            }
            else
            {
                confirmTask = confirm.PersistConfirmTeamAsync(game.Id, admin.Id, team.Id, 1, 2, timeout.Token);
            }
            await secondLock.Attempted.Task.WaitAsync(timeout.Token);
        }
        finally
        {
            firstLock.Continue.TrySetResult();
        }

        var confirmed = await confirmTask!;
        var left = await leaveTask!;
        Assert.Equal(confirmFirst, confirmed.Success);
        Assert.Equal(!confirmFirst, left.Success);
        Assert.Equal(confirmFirst ? GameRegistrationErrorCode.TeamRosterLocked : GameRegistrationErrorCode.TeamNotJoinable, confirmFirst ? left.Error : confirmed.Error);
        await using var verifyDb = _database.CreateDbContext();
        var persistedTeam = await verifyDb.GameTeams.SingleAsync();
        var persistedMember = await verifyDb.GameTeamMembers.SingleAsync();
        Assert.Equal(confirmFirst ? TeamStatusValue.Confirmed : TeamStatusValue.Disbanded, persistedTeam.Status);
        Assert.Equal(confirmFirst, persistedMember.LeftAtUtc is null);
    }

    private sealed class RosterLockInterceptor(bool holdLock) : DbCommandInterceptor
    {
        public TaskCompletionSource Attempted { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Acquired { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Continue { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
            DbCommand command, CommandEventData eventData, InterceptionResult<int> result,
            CancellationToken cancellationToken = default
        )
        {
            if (IsGameLock(command)) Attempted.TrySetResult();
            return ValueTask.FromResult(result);
        }

        public override async ValueTask<int> NonQueryExecutedAsync(
            DbCommand command, CommandExecutedEventData eventData, int result,
            CancellationToken cancellationToken = default
        )
        {
            if (IsGameLock(command))
            {
                Acquired.TrySetResult();
                if (holdLock) await Continue.Task.WaitAsync(cancellationToken);
            }
            return result;
        }

        private static bool IsGameLock(DbCommand command) =>
            command.CommandText.StartsWith("SELECT 1 FROM games WHERE", StringComparison.Ordinal)
            && command.CommandText.Contains("FOR UPDATE", StringComparison.Ordinal);
    }
}
