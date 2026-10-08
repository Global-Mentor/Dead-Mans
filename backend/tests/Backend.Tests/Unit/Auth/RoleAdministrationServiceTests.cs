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
    public async Task UpdateRolesAsync_GrantsInheritedRolesAndWritesAppendOnlyAudit()
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
            [AuthRoleCodes.Viewer, AuthRoleCodes.Moderator, AuthRoleCodes.Admin, AuthRoleCodes.SuperAdmin],
            granted.User?.Roles
        );
        Assert.Equal(3, await dbContext.UserRoles.CountAsync());
        Assert.Equal(3, await dbContext.UserRoleAuditEvents.CountAsync());
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
        Assert.Equal(6, await dbContext.UserRoleAuditEvents.CountAsync());
        Assert.Equal(
            3,
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

    [Fact]
    public async Task UpdateAccessAsync_BlockAndUnblockPreserveRolesAndLoginHistory()
    {
        await using var dbContext = CreateDbContext();
        var timestamp = new DateTimeOffset(2026, 10, 7, 15, 0, 0, TimeSpan.Zero);
        var actor = CreateUser("111", "owner", timestamp.AddDays(-1).UtcDateTime);
        var target = CreateUser("222", "member", timestamp.AddDays(-1).UtcDateTime);
        target.LastLoginAtUtc = timestamp.AddHours(-1).UtcDateTime;
        dbContext.AddRange(actor, target);
        dbContext.Roles.AddRange(CreateRoles(timestamp.UtcDateTime));
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext, timestamp, "111");
        await service.UpdateRolesAsync(actor.Id, target.Id, [AuthRoleCodes.Admin], CancellationToken.None);
        var assignments = await dbContext.UserRoles.CountAsync();
        var audits = await dbContext.UserRoleAuditEvents.CountAsync();

        foreach (var isActive in new[] { false, false, true, true })
        {
            var result = await service.UpdateAccessAsync(actor.Id, target.Id, isActive, CancellationToken.None);
            Assert.Equal(UpdateUserAccessOutcome.Updated, result.Outcome);
            Assert.Equal(isActive, result.User?.IsActive);
            Assert.Equal([AuthRoleCodes.Viewer, AuthRoleCodes.Moderator, AuthRoleCodes.Admin], result.User?.Roles);
            Assert.Equal(timestamp.AddHours(-1).UtcDateTime, result.User?.LastLoginAtUtc);
            Assert.Equal(timestamp.AddDays(-1).UtcDateTime, result.User?.CreatedAtUtc);
            Assert.Equal(timestamp.UtcDateTime, target.UpdatedAtUtc);
            Assert.Equal(assignments, await dbContext.UserRoles.CountAsync());
            Assert.Equal(audits, await dbContext.UserRoleAuditEvents.CountAsync());
        }
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task UpdateAccessAsync_ProtectsPermanentOwnerAndSelf(bool permanentOwner)
    {
        await using var dbContext = CreateDbContext();
        var timestamp = DateTimeOffset.UtcNow;
        var user = CreateUser("111", "owner", timestamp.AddDays(-1).UtcDateTime);
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext, timestamp, permanentOwner ? ["111"] : []);
        var result = await service.UpdateAccessAsync(user.Id, user.Id, false, CancellationToken.None);
        Assert.Equal(permanentOwner ? UpdateUserAccessOutcome.PermanentSuperAdminProtected : UpdateUserAccessOutcome.SelfBlockProtected, result.Outcome);
        Assert.True(user.IsActive);
        Assert.Equal(timestamp.AddDays(-1).UtcDateTime, user.UpdatedAtUtc);
    }

    [Fact]
    public async Task UpdateAccessAsync_UnknownUserReturnsNotFound()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(dbContext, DateTimeOffset.UtcNow);
        var result = await service.UpdateAccessAsync(Guid.NewGuid(), Guid.NewGuid(), false, CancellationToken.None);
        Assert.Equal(UpdateUserAccessOutcome.UserNotFound, result.Outcome);
        Assert.Null(result.User);
    }

    [Fact]
    public async Task GetUsersAsync_NewUsersSummaryIncludesThirtyDayBoundaryIndependentlyOfFilters()
    {
        await using var db = CreateDbContext();
        var timestamp = new DateTimeOffset(2026, 10, 7, 15, 0, 0, TimeSpan.Zero);
        db.Users.AddRange(
            CreateUser("new", "new", timestamp.UtcDateTime),
            CreateUser("twenty", "twenty", timestamp.AddDays(-20).UtcDateTime),
            CreateUser("boundary", "boundary", timestamp.AddDays(-30).UtcDateTime),
            CreateUser("old", "old", timestamp.AddDays(-30).AddTicks(-1).UtcDateTime)
        );
        await db.SaveChangesAsync();
        var service = CreateService(db, timestamp);
        var page = await service.GetUsersAsync(null, 1, 25, new(IsActive: false), CancellationToken.None);
        Assert.Empty(page.Items);
        Assert.Equal(new RoleAdministrationSummary(4, 0, 3), page.Summary);
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
