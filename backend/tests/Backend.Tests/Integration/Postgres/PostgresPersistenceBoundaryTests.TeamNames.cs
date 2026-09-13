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
    public async Task RenameWaitingForRosterLock_RejectsPlayerWhoLeftBeforeLockWasAcquired()
    {
        await _database.ResetAsync();
        await using var writerDb = _database.CreateDbContext();
        var now = DateTime.UtcNow;
        var player = CreateUser("leaving-player");
        var game = CreateGame(GameStatusValue.Draft, now);
        var slot = CreateSlot(game.Id, 1, now);
        var team = CreateTeam(game.Id, slot.Id, now, TeamStatusValue.Forming);
        team.Name = "Original name";
        var member = new GameTeamMember
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            TeamId = team.Id,
            UserId = player.Id,
            JoinedAtUtc = now
        };
        AddDraftBoard(writerDb, game.Id, now);
        writerDb.AddRange(game, player, slot, team, member);
        await writerDb.SaveChangesAsync();
        game.Status = GameStatusValue.Ready;
        game.ReadyAtUtc = now;
        await writerDb.SaveChangesAsync();

        var renameLock = new RosterLockInterceptor(false);
        await using var renameDb = _database.CreateDbContext(renameLock);
        var persistence = new DbGameRegistrationPersistence(renameDb, new GameRegistrationReadStore(renameDb), NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        Task<GameRegistrationResult<RegistrationTeamDto>> renameTask;
        await using (var transaction = await writerDb.Database.BeginTransactionAsync(timeout.Token))
        {
            await writerDb.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM games WHERE id = {game.Id} FOR UPDATE", timeout.Token);
            renameTask = persistence.PersistUpdateTeamNameAsync(game.Id, team.Id, "New name", player.Id, timeout.Token);
            await renameLock.Attempted.Task.WaitAsync(timeout.Token);
            member.LeftAtUtc = now.AddSeconds(1);
            await writerDb.SaveChangesAsync(timeout.Token);
            await transaction.CommitAsync(timeout.Token);
        }

        var result = await renameTask;
        Assert.Equal(GameRegistrationErrorCode.NotTeamMember, result.Error);
        await using var verifyDb = _database.CreateDbContext();
        Assert.Equal("Original name", (await verifyDb.GameTeams.SingleAsync()).Name);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task EquivalentTeamNames_ConcurrentCreationOrRenameHasOneWinner(bool rename)
    {
        await _database.ResetAsync();
        await using var seedDb = _database.CreateDbContext();
        var now = DateTime.UtcNow;
        var firstUser = CreateUser("first-name");
        var secondUser = CreateUser("second-name");
        var game = CreateGame(GameStatusValue.Draft, now);
        var firstSlot = CreateSlot(game.Id, 1, now);
        var secondSlot = CreateSlot(game.Id, 2, now);
        var firstTeam = CreateTeam(game.Id, firstSlot.Id, now, TeamStatusValue.Forming);
        var secondTeam = CreateTeam(game.Id, secondSlot.Id, now, TeamStatusValue.Forming);
        AddDraftBoard(seedDb, game.Id, now);
        seedDb.AddRange(game, firstUser, secondUser, firstSlot, secondSlot);
        if (rename) seedDb.AddRange(firstTeam, secondTeam);
        await seedDb.SaveChangesAsync();
        game.Status = GameStatusValue.Ready;
        game.ReadyAtUtc = now;
        await seedDb.SaveChangesAsync();
        var firstLock = new RosterLockInterceptor(true);
        var secondLock = new RosterLockInterceptor(false);
        await using var firstDb = _database.CreateDbContext(firstLock);
        await using var secondDb = _database.CreateDbContext(secondLock);
        var first = new DbGameRegistrationPersistence(firstDb, new GameRegistrationReadStore(firstDb), NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        var second = new DbGameRegistrationPersistence(secondDb, new GameRegistrationReadStore(secondDb), NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        var firstTask = rename
            ? first.PersistUpdateTeamNameAsync(game.Id, firstTeam.Id, "Ночной дозор", null, timeout.Token)
            : first.PersistCreateTeamAsync(game.Id, firstUser.Id, firstSlot.Id, true, "Ночной дозор", timeout.Token);
        Task<GameRegistrationResult<RegistrationTeamDto>>? secondTask = null;
        try
        {
            await firstLock.Acquired.Task.WaitAsync(timeout.Token);
            secondTask = rename
                ? second.PersistUpdateTeamNameAsync(game.Id, secondTeam.Id, "Н О Ч Н О Й\u00a0Д О З О Р", null, timeout.Token)
                : second.PersistCreateTeamAsync(game.Id, secondUser.Id, secondSlot.Id, true, "Н О Ч Н О Й\u00a0Д О З О Р", timeout.Token);
            await secondLock.Attempted.Task.WaitAsync(timeout.Token);
        }
        finally { firstLock.Continue.TrySetResult(); }
        Assert.True((await firstTask).Success);
        Assert.Equal(GameRegistrationErrorCode.TeamNameTaken, (await secondTask!).Error);
        await using var verifyDb = _database.CreateDbContext();
        var names = await verifyDb.GameTeams.Select(team => team.Name).ToArrayAsync();
        Assert.Single(names, name => TeamNameValue.UniquenessKey(name) == TeamNameValue.UniquenessKey("Ночной дозор"));
    }
}
