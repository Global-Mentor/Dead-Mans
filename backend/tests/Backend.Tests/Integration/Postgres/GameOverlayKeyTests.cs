using Backend.Tests.Support;
using backend.Application.Features.GameOverlay;
using backend.Data.Entities;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Integration.Postgres;

public sealed class GameOverlayKeyTests(PostgresTestDatabase database) : IClassFixture<PostgresTestDatabase>
{
    [Theory]
    [InlineData("moderator")]
    [InlineData("admin")]
    [InlineData("superadmin")]
    public async Task Key_RequiresAnActiveOwnerWithAnUnexpiredStaffRole(string roleCode)
    {
        await using var db = database.CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var clock = new MutableTimeProvider(now);
        var ownerId = Guid.NewGuid();
        var owner = new User { Id = ownerId, TwitchUserId = ownerId.ToString(), Login = "role-owner", DisplayName = "Owner", CreatedAtUtc = now.UtcDateTime, UpdatedAtUtc = now.UtcDateTime };
        var assignment = new UserRole
        {
            User = owner,
            RoleId = await db.Roles.Where(role => role.Code == roleCode).Select(role => role.Id).SingleAsync(),
            AssignedAtUtc = now.UtcDateTime,
            ExpiresAtUtc = now.AddMinutes(1).UtcDateTime
        };
        db.UserRoles.Add(assignment);
        await db.SaveChangesAsync();
        var service = new GameOverlayService(new DbGameOverlayRepository(db,
            Microsoft.Extensions.Options.Options.Create(new backend.Infrastructure.Configuration.StorageOptions()), clock));
        var key = await service.RotateKeyAsync(ownerId, default);
        Assert.True(await service.ValidateKeyAsync(key, default));
        clock.UtcNow = now.AddMinutes(1);
        Assert.False(await service.ValidateKeyAsync(key, default));
        clock.UtcNow = now;
        owner.IsActive = false;
        await db.SaveChangesAsync();
        Assert.False(await service.ValidateKeyAsync(key, default));
        owner.IsActive = true;
        db.UserRoles.Remove(assignment);
        await db.SaveChangesAsync();
        Assert.False(await service.ValidateKeyAsync(key, default));
    }

    [Fact]
    public async Task RotateAndRevoke_PersistOnlyHashes_AndInvalidatePreviousLinks()
    {
        await using var db = database.CreateDbContext();
        var now = DateTime.UtcNow;
        var owner = new User { Id = Guid.NewGuid(), TwitchUserId = "overlay-owner", Login = "overlay-owner", DisplayName = "Owner", CreatedAtUtc = now, UpdatedAtUtc = now };
        db.Users.Add(owner);
        db.UserRoles.Add(new UserRole { User = owner, RoleId = await db.Roles.Where(role => role.Code == "moderator").Select(role => role.Id).SingleAsync(), AssignedAtUtc = now });
        await db.SaveChangesAsync();
        var service = new GameOverlayService(new DbGameOverlayRepository(db, Microsoft.Extensions.Options.Options.Create(new backend.Infrastructure.Configuration.StorageOptions { PublicBaseUrl = "https://media.example.test" }), TimeProvider.System));
        var first = await service.RotateKeyAsync(owner.Id, default);
        Assert.Equal(64, first.Length);
        Assert.NotEqual(first, (await db.Set<GameOverlayKey>().AsNoTracking().SingleAsync(key => key.OwnerId == owner.Id)).KeyHash);
        Assert.True(await service.ValidateKeyAsync(first, default));
        var second = await service.RotateKeyAsync(owner.Id, default);
        Assert.NotEqual(first, second);
        Assert.False(await service.ValidateKeyAsync(first, default));
        Assert.True(await service.ValidateKeyAsync(second, default));
        await service.RevokeKeyAsync(owner.Id, default);
        await service.RevokeKeyAsync(owner.Id, default);
        Assert.False(await service.ValidateKeyAsync(second, default));
    }

    [Fact]
    public async Task SimultaneousFirstIssue_LeavesExactlyOneValidKey()
    {
        var ownerId = Guid.NewGuid();
        await using (var db = database.CreateDbContext())
        {
            var now = DateTime.UtcNow;
            db.Users.Add(new User { Id = ownerId, TwitchUserId = ownerId.ToString(), Login = "concurrent", DisplayName = "Owner", CreatedAtUtc = now, UpdatedAtUtc = now });
            db.UserRoles.Add(new UserRole { UserId = ownerId, RoleId = await db.Roles.Where(role => role.Code == "admin").Select(role => role.Id).SingleAsync(), AssignedAtUtc = now });
            await db.SaveChangesAsync();
        }
        async Task<string> Rotate()
        {
            await using var db = database.CreateDbContext();
            return await new GameOverlayService(new DbGameOverlayRepository(db, Microsoft.Extensions.Options.Options.Create(new backend.Infrastructure.Configuration.StorageOptions { PublicBaseUrl = "https://media.example.test" }), TimeProvider.System)).RotateKeyAsync(ownerId, default);
        }
        var keys = await Task.WhenAll(Rotate(), Rotate());
        await using var reader = database.CreateDbContext();
        var service = new GameOverlayService(new DbGameOverlayRepository(reader, Microsoft.Extensions.Options.Options.Create(new backend.Infrastructure.Configuration.StorageOptions()), TimeProvider.System));
        var valid = 0;
        foreach (var key in keys)
        {
            if (await service.ValidateKeyAsync(key, default)) valid += 1;
        }
        Assert.Equal(1, valid);
        Assert.Equal(1, await reader.Set<GameOverlayKey>().CountAsync(key => key.OwnerId == ownerId));
    }
}
