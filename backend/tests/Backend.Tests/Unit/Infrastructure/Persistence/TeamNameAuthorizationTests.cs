using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests.Unit.Infrastructure.Persistence;

public sealed class TeamNameAuthorizationTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Rename_RechecksMembershipBeforeWriting(bool previouslyJoined)
    {
        await using var db = CreateDbContext();
        var (game, team) = SeedTeam(db, GameStatusValue.Ready);
        var playerId = Guid.NewGuid();
        if (previouslyJoined)
        {
            db.GameTeamMembers.Add(new GameTeamMember
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                TeamId = team.Id,
                UserId = playerId,
                JoinedAtUtc = DateTime.UtcNow.AddHours(-1),
                LeftAtUtc = DateTime.UtcNow
            });
        }
        await db.SaveChangesAsync();

        var result = await CreatePersistence(db).PersistUpdateTeamNameAsync(game.Id, team.Id, "New name", playerId);

        Assert.Equal(GameRegistrationErrorCode.NotTeamMember, result.Error);
        Assert.Equal("Original name", (await db.GameTeams.AsNoTracking().SingleAsync()).Name);
    }

    [Fact]
    public async Task Rename_RechecksRegistrationStateEvenForAdministrator()
    {
        await using var db = CreateDbContext();
        var (game, team) = SeedTeam(db, GameStatusValue.Draft);
        await db.SaveChangesAsync();

        var result = await CreatePersistence(db).PersistUpdateTeamNameAsync(game.Id, team.Id, "New name", null);

        Assert.Equal(GameRegistrationErrorCode.GameNotInReady, result.Error);
        Assert.Equal("Original name", (await db.GameTeams.AsNoTracking().SingleAsync()).Name);
    }

    [Fact]
    public async Task Rename_PreservesAdministratorAccessToFormingTeamsDuringActiveGame()
    {
        await using var db = CreateDbContext();
        var (game, team) = SeedTeam(db, GameStatusValue.Active);
        await db.SaveChangesAsync();

        var result = await CreatePersistence(db).PersistUpdateTeamNameAsync(game.Id, team.Id, "New name", null);

        Assert.True(result.Success);
        Assert.Equal("New name", (await db.GameTeams.AsNoTracking().SingleAsync()).Name);
    }

    [Fact]
    public async Task Rename_RejectsPlayerWhenRegistrationHasClosed()
    {
        await using var db = CreateDbContext();
        var (game, team) = SeedTeam(db, GameStatusValue.Active);
        await db.SaveChangesAsync();

        var result = await CreatePersistence(db).PersistUpdateTeamNameAsync(game.Id, team.Id, "New name", Guid.NewGuid());

        Assert.Equal(GameRegistrationErrorCode.GameNotInReady, result.Error);
        Assert.Equal("Original name", (await db.GameTeams.AsNoTracking().SingleAsync()).Name);
    }

    private static (Game Game, GameTeam Team) SeedTeam(ApplicationDbContext db, string status)
    {
        var now = DateTime.UtcNow;
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Title = "Game",
            Status = status,
            CreatedAtUtc = now,
            MinPlayersPerTeam = 1,
            MaxPlayersPerTeam = 2
        };
        var team = new GameTeam
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            SlotId = Guid.NewGuid(),
            Name = "Original name",
            Status = TeamStatusValue.Forming,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        var slot = new GameTeamSlot
        {
            Id = team.SlotId,
            GameId = game.Id,
            SlotIndex = 1,
            SlotType = TeamSlotTypeValue.Public,
            CreatedAtUtc = now
        };
        db.AddRange(game, team, slot);
        return (game, team);
    }

    private static ApplicationDbContext CreateDbContext() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static DbGameRegistrationPersistence CreatePersistence(ApplicationDbContext db) => new(
        db, new GameRegistrationReadStore(db), NullLogger<DbGameRegistrationPersistence>.Instance, TimeProvider.System);
}
