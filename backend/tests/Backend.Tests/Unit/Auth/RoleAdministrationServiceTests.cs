using backend.Application.Abstractions.Auth;
using backend.Data;
using backend.Data.Entities;
using backend.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;

namespace Backend.Tests.Unit.Auth;

public sealed class RoleAdministrationServiceTests
{
    [Fact]
    public async Task UpdateRolesAsync_GrantsInheritedAdminAndWritesAppendOnlyAudit()
    {
        await using var dbContext = CreateDbContext();
        var timestamp = new DateTimeOffset(2026, 9, 9, 19, 0, 0, TimeSpan.Zero);
        var actor = CreateUser("111", "owner", timestamp.UtcDateTime);
        var target = CreateUser("222", "member", timestamp.UtcDateTime);
        dbContext.AddRange(actor, target);
        dbContext.Roles.AddRange(CreateRoles(timestamp.UtcDateTime));
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext, timestamp, "111");

        var granted = await service.UpdateRolesAsync(
            actor.Id,
            target.Id,
            [AuthRoleCodes.SuperAdmin],
            CancellationToken.None
        );

        Assert.Equal(UpdateUserRolesOutcome.Updated, granted.Outcome);
        Assert.Equal(
            [AuthRoleCodes.Viewer, AuthRoleCodes.Admin, AuthRoleCodes.SuperAdmin],
            granted.User?.Roles
        );
        Assert.Equal(2, await dbContext.UserRoles.CountAsync());
        Assert.Equal(2, await dbContext.UserRoleAuditEvents.CountAsync());
        Assert.All(
            await dbContext.UserRoleAuditEvents.ToArrayAsync(),
            audit =>
            {
                Assert.Equal(UserRoleAuditEvent.GrantedAction, audit.Action);
                Assert.Equal(actor.Id, audit.ChangedByUserId);
            }
        );

        var revoked = await service.UpdateRolesAsync(
            actor.Id,
            target.Id,
            [],
            CancellationToken.None
        );

        Assert.Equal([AuthRoleCodes.Viewer], revoked.User?.Roles);
        Assert.Empty(await dbContext.UserRoles.ToArrayAsync());
        Assert.Equal(4, await dbContext.UserRoleAuditEvents.CountAsync());
        Assert.Equal(
            2,
            await dbContext.UserRoleAuditEvents.CountAsync(audit =>
                audit.Action == UserRoleAuditEvent.RevokedAction
            )
        );
    }

    [Fact]
    public async Task UpdateRolesAsync_RejectsRemovalFromPermanentOwner()
    {
        await using var dbContext = CreateDbContext();
        var timestamp = new DateTimeOffset(2026, 9, 9, 19, 30, 0, TimeSpan.Zero);
        var owner = CreateUser("111", "owner", timestamp.UtcDateTime);
        dbContext.Users.Add(owner);
        dbContext.Roles.AddRange(CreateRoles(timestamp.UtcDateTime));
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext, timestamp, "111");

        var result = await service.UpdateRolesAsync(
            owner.Id,
            owner.Id,
            [],
            CancellationToken.None
        );

        Assert.Equal(UpdateUserRolesOutcome.PermanentSuperAdminProtected, result.Outcome);
        Assert.Empty(await dbContext.UserRoles.ToArrayAsync());
        Assert.Empty(await dbContext.UserRoleAuditEvents.ToArrayAsync());
    }

    [Fact]
    public async Task UpdateRolesAsync_RejectsViewerAsAnAssignableRole()
    {
        await using var dbContext = CreateDbContext();
        var timestamp = new DateTimeOffset(2026, 9, 9, 20, 0, 0, TimeSpan.Zero);
        var user = CreateUser("222", "member", timestamp.UtcDateTime);
        dbContext.Users.Add(user);
        dbContext.Roles.AddRange(CreateRoles(timestamp.UtcDateTime));
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext, timestamp, "111");

        var result = await service.UpdateRolesAsync(
            Guid.NewGuid(),
            user.Id,
            [AuthRoleCodes.Viewer],
            CancellationToken.None
        );

        Assert.Equal(UpdateUserRolesOutcome.InvalidRoles, result.Outcome);
    }

    private static RoleAdministrationService CreateService(
        ApplicationDbContext dbContext,
        DateTimeOffset timestamp,
        params string[] permanentIds
    ) => new(
        dbContext,
        Options.Create(
            new TwitchAuthOptions { PermanentSuperAdminTwitchUserIds = permanentIds }
        ),
        new FixedTimeProvider(timestamp)
    );

    private static User CreateUser(string twitchUserId, string login, DateTime timestamp) =>
        new()
        {
            Id = Guid.NewGuid(),
            TwitchUserId = twitchUserId,
            Login = login,
            DisplayName = login,
            IsActive = true,
            CreatedAtUtc = timestamp,
            UpdatedAtUtc = timestamp
        };

    private static Role[] CreateRoles(DateTime timestamp) =>
    [
        CreateRole(1, AuthRoleCodes.Viewer, timestamp),
        CreateRole(2, AuthRoleCodes.Moderator, timestamp),
        CreateRole(3, AuthRoleCodes.Admin, timestamp),
        CreateRole(4, AuthRoleCodes.SuperAdmin, timestamp)
    ];

    private static Role CreateRole(short id, string code, DateTime timestamp) =>
        new()
        {
            Id = id,
            Code = code,
            Name = code,
            CreatedAtUtc = timestamp,
            UpdatedAtUtc = timestamp
        };

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"role-administration-tests-{Guid.NewGuid():N}")
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new ApplicationDbContext(options);
    }

    private sealed class FixedTimeProvider(DateTimeOffset timestamp) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => timestamp;
    }
}
