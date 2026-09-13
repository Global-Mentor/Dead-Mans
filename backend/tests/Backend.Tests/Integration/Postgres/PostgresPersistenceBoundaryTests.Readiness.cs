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
    [InlineData(true)]
    [InlineData(false)]
    public async Task ConfirmAndClearName_SerializeWithoutConfirmingAnUnnamedTeam(bool confirmFirst)
    {
        var (gameId, teamId, firstId, _) = await SeedReadinessRosterAsync();
        var firstLock = new RosterLockInterceptor(holdLock: true);
        var secondLock = new RosterLockInterceptor(holdLock: false);
        await using var confirmDb = _database.CreateDbContext(confirmFirst ? firstLock : secondLock);
        await using var renameDb = _database.CreateDbContext(confirmFirst ? secondLock : firstLock);
        var confirm = new DbGameRegistrationPersistence(confirmDb, new GameRegistrationReadStore(confirmDb),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        var rename = new DbGameRegistrationPersistence(renameDb, new GameRegistrationReadStore(renameDb),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        Task<GameRegistrationResult<RegistrationTeamDto>>? confirmTask = null;
        Task<GameRegistrationResult<RegistrationTeamDto>>? renameTask = null;
        try
        {
            if (confirmFirst)
                confirmTask = confirm.PersistConfirmTeamAsync(gameId, firstId, teamId, 1, 2, timeout.Token);
            else
                renameTask = rename.PersistUpdateTeamNameAsync(gameId, teamId, null, null, timeout.Token);
            await firstLock.Acquired.Task.WaitAsync(timeout.Token);
            if (confirmFirst)
                renameTask = rename.PersistUpdateTeamNameAsync(gameId, teamId, null, null, timeout.Token);
            else
                confirmTask = confirm.PersistConfirmTeamAsync(gameId, firstId, teamId, 1, 2, timeout.Token);
            await secondLock.Attempted.Task.WaitAsync(timeout.Token);
        }
        finally
        {
            firstLock.Continue.TrySetResult();
        }

        var confirmed = await confirmTask!;
        var renamed = await renameTask!;
        Assert.Equal(confirmFirst, confirmed.Success);
        Assert.Equal(!confirmFirst, renamed.Success);
        Assert.Equal(confirmFirst ? GameRegistrationErrorCode.TeamNotJoinable : GameRegistrationErrorCode.TeamNameRequired,
            confirmFirst ? renamed.Error : confirmed.Error);
        await using var verify = _database.CreateDbContext();
        var team = await verify.GameTeams.SingleAsync(candidate => candidate.Id == teamId);
        Assert.Equal(confirmFirst ? TeamStatusValue.Confirmed : TeamStatusValue.Forming, team.Status);
        Assert.Equal(confirmFirst, team.Name is not null);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ReadinessAndLeave_SerializeWithoutRetainingStaleReadiness(bool readinessFirst)
    {
        var (gameId, teamId, firstId, secondId) = await SeedReadinessRosterAsync();
        var firstLock = new RosterLockInterceptor(holdLock: true);
        var secondLock = new RosterLockInterceptor(holdLock: false);
        await using var readyDb = _database.CreateDbContext(readinessFirst ? firstLock : secondLock);
        await using var leaveDb = _database.CreateDbContext(readinessFirst ? secondLock : firstLock);
        var ready = new DbGameRegistrationPersistence(readyDb, new GameRegistrationReadStore(readyDb),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        var leave = new DbGameRegistrationPersistence(leaveDb, new GameRegistrationReadStore(leaveDb),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        Task<GameRegistrationResult<RegistrationTeamDto>>? readyTask = null;
        Task<GameRegistrationResult<bool>>? leaveTask = null;
        try
        {
            if (readinessFirst)
                readyTask = ready.PersistSetMemberReadinessAsync(gameId, firstId, true, timeout.Token);
            else
                leaveTask = leave.PersistLeaveTeamAsync(gameId, secondId, timeout.Token);
            await firstLock.Acquired.Task.WaitAsync(timeout.Token);
            if (readinessFirst)
                leaveTask = leave.PersistLeaveTeamAsync(gameId, secondId, timeout.Token);
            else
                readyTask = ready.PersistSetMemberReadinessAsync(gameId, firstId, true, timeout.Token);
            await secondLock.Attempted.Task.WaitAsync(timeout.Token);
        }
        finally
        {
            firstLock.Continue.TrySetResult();
        }

        Assert.True((await leaveTask!).Success);
        var result = await readyTask!;
        Assert.Equal(readinessFirst, result.Success);
        if (!readinessFirst) Assert.Equal(GameRegistrationErrorCode.TeamNotFull, result.Error);
        await using var verify = _database.CreateDbContext();
        var members = await verify.GameTeamMembers.Where(member => member.TeamId == teamId).ToListAsync();
        Assert.All(members, member => Assert.Null(member.ReadyAtUtc));
        Assert.NotNull(members.Single(member => member.UserId == secondId).LeftAtUtc);
        Assert.Null(members.Single(member => member.UserId == firstId).LeftAtUtc);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Readiness_RechecksStartedGameAfterWaitingForRosterLock(bool isReady)
    {
        var (gameId, teamId, firstId, _) = await SeedReadinessRosterAsync();
        await using (var confirmDb = _database.CreateDbContext())
        {
            var registration = new DbGameRegistrationPersistence(confirmDb, new GameRegistrationReadStore(confirmDb),
                NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
            Assert.True((await registration.PersistConfirmTeamAsync(gameId, firstId, teamId, 1, 2)).Success);
        }

        var starting = new RosterLockInterceptor(holdLock: true);
        var waiting = new RosterLockInterceptor(holdLock: false);
        await using var startDb = _database.CreateDbContext(starting);
        await using var readyDb = _database.CreateDbContext(waiting);
        var lifecycle = new DbGameLifecyclePersistence(startDb,
            NullLogger<DbGameLifecyclePersistence>.Instance, TimeProvider.System);
        var persistence = new DbGameRegistrationPersistence(readyDb, new GameRegistrationReadStore(readyDb),
            NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        var startTask = lifecycle.StartGameAsync(gameId, timeout.Token);
        Task<GameRegistrationResult<RegistrationTeamDto>>? readyTask = null;
        try
        {
            await starting.Acquired.Task.WaitAsync(timeout.Token);
            readyTask = persistence.PersistSetMemberReadinessAsync(gameId, firstId, isReady, timeout.Token);
            await waiting.Attempted.Task.WaitAsync(timeout.Token);
        }
        finally
        {
            starting.Continue.TrySetResult();
        }

        Assert.True((await startTask).Success);
        var result = await readyTask!;
        Assert.False(result.Success);
        Assert.Equal(GameRegistrationErrorCode.GameNotInReady, result.Error);
        Assert.Null((await readyDb.GameTeamMembers.SingleAsync(member => member.UserId == firstId)).ReadyAtUtc);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ReadinessConstraint_RejectsInvalidMembershipTimestamps(bool alreadyLeft)
    {
        var (_, teamId, firstId, _) = await SeedReadinessRosterAsync();
        await using var db = _database.CreateDbContext();
        var member = await db.GameTeamMembers.SingleAsync(candidate =>
            candidate.TeamId == teamId && candidate.UserId == firstId);
        member.ReadyAtUtc = alreadyLeft ? DateTime.UtcNow : member.JoinedAtUtc.AddSeconds(-1);
        if (alreadyLeft) member.LeftAtUtc = DateTime.UtcNow;
        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        AssertPostgresConstraint(exception, "ck_game_team_members_ready_semantics");
    }

    private async Task<(Guid GameId, Guid TeamId, Guid FirstId, Guid SecondId)> SeedReadinessRosterAsync()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var now = DateTime.UtcNow;
        var first = CreateUser("ready-first");
        var second = CreateUser("ready-second");
        var game = CreateGame(GameStatusValue.Draft, now);
        var slot = CreateSlot(game.Id, 1, now);
        var team = CreateTeam(game.Id, slot.Id, now, TeamStatusValue.Forming, recruitmentOpen: true);
        team.Name = "Readiness team";
        AddDraftBoard(db, game.Id, now);
        db.AddRange(first, second, game, slot, team);
        foreach (var user in new[] { first, second })
        {
            db.GameTeamMembers.Add(new GameTeamMember
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                TeamId = team.Id,
                UserId = user.Id,
                JoinedAtUtc = now
            });
        }
        await db.SaveChangesAsync();
        game.Status = GameStatusValue.Ready;
        game.ReadyAtUtc = now;
        await db.SaveChangesAsync();
        return (game.Id, team.Id, first.Id, second.Id);
    }
}
