using backend.Application.Abstractions.Auth;
using backend.Data;
using backend.Data.Entities;
using backend.Infrastructure.Auth;
using Backend.Tests.Support;
using Microsoft.Extensions.Options;

namespace Backend.Tests.Integration.Postgres;

public sealed class RoleAdministrationQueryTests(PostgresTestDatabase database) : IClassFixture<PostgresTestDatabase>
{
    private static readonly DateTime Now = new(2026, 10, 6, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task FiltersSearchAndDates_DistinguishChatIdentitiesFromDisabledAccounts()
    {
        await database.ResetAsync();
        await using var db = database.CreateDbContext();
        var site = User("11", "site", -20, Now.AddDays(-1));
        var chat = User("22", "chat", -1, null);
        var disabled = User("33", "disabled", -2, Now.AddDays(-2));
        disabled.IsActive = false;
        var escaped = User("44", "under_score", -3, null);
        var similar = User("55", "underXscore", -4, null);
        db.Users.AddRange(site, chat, disabled, escaped, similar);
        await db.SaveChangesAsync();
        var service = Service(db);
        var never = await service.GetUsersAsync(null, 1, 25, new(HasLoggedIn: false), default);
        Assert.Equal(3, never.TotalCount);
        Assert.All(never.Items, user => { Assert.True(user.IsActive); Assert.Null(user.LastLoginAtUtc); });
        Assert.Equal(new RoleAdministrationSummary(5, 2, 5), never.Summary);
        var blocked = await service.GetUsersAsync(null, 1, 25, new(IsActive: false), default);
        var blockedUser = Assert.Single(blocked.Items);
        Assert.Equal(disabled.Id, blockedUser.UserId);
        Assert.Equal(disabled.CreatedAtUtc, blockedUser.CreatedAtUtc);
        Assert.Equal(disabled.LastLoginAtUtc, blockedUser.LastLoginAtUtc);
        var recent = await service.GetUsersAsync(null, 1, 25, new(RegisteredWithinDays: 7, HasLoggedIn: true), default);
        Assert.Equal(disabled.Id, Assert.Single(recent.Items).UserId);
        var literal = await service.GetUsersAsync("UNDER_", 1, 25, new(), default);
        Assert.Equal(escaped.Id, Assert.Single(literal.Items).UserId);
        var descending = await service.GetUsersAsync(null, 1, 25, new(Sort: "lastLoginDesc"), default);
        Assert.Equal(site.Id, descending.Items[0].UserId);
        Assert.All(descending.Items.Skip(2), user => Assert.Null(user.LastLoginAtUtc));
        var lastPage = await service.GetUsersAsync(null, int.MaxValue, 2, new(Sort: "createdDesc"), default);
        Assert.Equal(3, lastPage.Page);
        Assert.Equal(site.Id, Assert.Single(lastPage.Items).UserId);
        var empty = await service.GetUsersAsync("doesnotexist", 99, 25, new(), default);
        Assert.Equal(1, empty.Page);
        Assert.Empty(empty.Items);
    }

    [Fact]
    public async Task RoleFilters_IncludePermanentAndInheritedPrivilegesButExcludeExpiredGrants()
    {
        await database.ResetAsync();
        await using var db = database.CreateDbContext();
        var owner = User("owner", "owner", -30, Now);
        var inherited = User("inherited", "inherited", -3, Now);
        var expired = User("expired", "expired", -2, Now);
        var moderator = User("moderator", "moderator", -1, null);
        db.Users.AddRange(owner, inherited, expired, moderator);
        db.Roles.AddRange(
            new Role { Id = 1, Code = AuthRoleCodes.Admin, Name = "Admin", CreatedAtUtc = Now, UpdatedAtUtc = Now },
            new Role { Id = 2, Code = AuthRoleCodes.SuperAdmin, Name = "Superadmin", CreatedAtUtc = Now, UpdatedAtUtc = Now },
            new Role { Id = 3, Code = AuthRoleCodes.Moderator, Name = "Moderator", CreatedAtUtc = Now, UpdatedAtUtc = Now });
        db.UserRoles.AddRange(
            new UserRole { UserId = inherited.Id, RoleId = 2, AssignedAtUtc = Now.AddDays(-3) },
            new UserRole { UserId = expired.Id, RoleId = 1, AssignedAtUtc = Now.AddDays(-3), ExpiresAtUtc = Now.AddDays(-1) },
            new UserRole { UserId = moderator.Id, RoleId = 3, AssignedAtUtc = Now });
        await db.SaveChangesAsync();
        var service = Service(db, "owner");
        var admins = await service.GetUsersAsync(null, 1, 25, new(Role: AuthRoleCodes.Admin), default);
        Assert.Equal(2, admins.TotalCount);
        Assert.Contains(admins.Items, user => user.UserId == owner.Id && user.IsPermanentSuperAdmin);
        Assert.Contains(admins.Items, user => user.UserId == inherited.Id && user.Roles.Contains(AuthRoleCodes.Admin));
        var moderators = await service.GetUsersAsync(null, 1, 25, new(Role: AuthRoleCodes.Moderator), default);
        Assert.Equal(3, moderators.TotalCount);
        Assert.Contains(moderators.Items, user => user.UserId == moderator.Id);
        Assert.Contains(moderators.Items, user => user.UserId == owner.Id && user.Roles.Contains(AuthRoleCodes.Moderator));
        Assert.Contains(moderators.Items, user => user.UserId == inherited.Id && user.Roles.Contains(AuthRoleCodes.Moderator));
        Assert.DoesNotContain(moderators.Items, user => user.UserId == expired.Id);
    }

    [Fact]
    public async Task RoleSorting_UsesHighestEffectiveRoleBeforePagingWithStableTies()
    {
        await database.ResetAsync();
        await using var db = database.CreateDbContext();
        var owner = User("owner", "owner", -1, null);
        var superAdmin = User("super", "super", -2, Now);
        var admin = User("admin", "admin", -3, null);
        var moderator = User("mod", "mod", -4, Now);
        var expired = User("expired", "expired", -5, null);
        var boundary = User("boundary", "boundary", -6, Now);
        var viewer = User("viewer", "viewer", -7, null);
        owner.IsActive = false;
        db.Users.AddRange(viewer, expired, admin, moderator, boundary, owner, superAdmin);
        db.Roles.AddRange(
            new Role { Id = 1, Code = AuthRoleCodes.SuperAdmin, Name = "Superadmin", CreatedAtUtc = Now, UpdatedAtUtc = Now },
            new Role { Id = 2, Code = AuthRoleCodes.Admin, Name = "Admin", CreatedAtUtc = Now, UpdatedAtUtc = Now },
            new Role { Id = 3, Code = AuthRoleCodes.Moderator, Name = "Moderator", CreatedAtUtc = Now, UpdatedAtUtc = Now });
        db.UserRoles.AddRange(
            new UserRole { UserId = superAdmin.Id, RoleId = 1, AssignedAtUtc = Now },
            new UserRole { UserId = superAdmin.Id, RoleId = 2, AssignedAtUtc = Now },
            new UserRole { UserId = admin.Id, RoleId = 1, AssignedAtUtc = Now.AddDays(-1), ExpiresAtUtc = Now.AddTicks(-1) },
            new UserRole { UserId = admin.Id, RoleId = 2, AssignedAtUtc = Now, ExpiresAtUtc = Now.AddTicks(10) },
            new UserRole { UserId = admin.Id, RoleId = 3, AssignedAtUtc = Now },
            new UserRole { UserId = moderator.Id, RoleId = 3, AssignedAtUtc = Now },
            new UserRole { UserId = expired.Id, RoleId = 2, AssignedAtUtc = Now.AddDays(-2), ExpiresAtUtc = Now.AddDays(-1) },
            new UserRole { UserId = boundary.Id, RoleId = 1, AssignedAtUtc = Now.AddDays(-1), ExpiresAtUtc = Now });
        await db.SaveChangesAsync();
        var service = Service(db, "owner");
        var superIds = new[] { owner.Id, superAdmin.Id }.Order().ToArray();
        var viewerIds = new[] { viewer.Id, expired.Id, boundary.Id }.Order().ToArray();
        Guid[] descending = [.. superIds, admin.Id, moderator.Id, .. viewerIds];
        Guid[] ascending = [.. viewerIds, moderator.Id, admin.Id, .. superIds];
        foreach (var (sort, expected) in new[] { ("roleDesc", descending), ("roleAsc", ascending) })
        {
            var actual = new List<RoleAdministrationUser>();
            for (var page = 1; page <= 4; page++)
            {
                var result = await service.GetUsersAsync(null, page, 2, new(Sort: sort), default);
                Assert.Equal(7, result.TotalCount);
                Assert.Equal(page, result.Page);
                actual.AddRange(result.Items);
            }
            Assert.Equal(expected, actual.Select(user => user.UserId));
            Assert.All(actual.Where(user => viewerIds.Contains(user.UserId)), user =>
                Assert.Equal([AuthRoleCodes.Viewer], user.Roles));
        }
        var filtered = await service.GetUsersAsync(null, 1, 2, new(IsActive: true, Role: AuthRoleCodes.Admin, Sort: "roleDesc"), default);
        Assert.Equal(new[] { superAdmin.Id, admin.Id }, filtered.Items.Select(user => user.UserId));
    }

    private static User User(string twitchId, string login, int days, DateTime? lastLogin) => new()
    {
        Id = Guid.NewGuid(),
        TwitchUserId = twitchId,
        Login = login,
        DisplayName = login,
        CreatedAtUtc = Now.AddDays(days),
        UpdatedAtUtc = Now,
        LastLoginAtUtc = lastLogin,
        IsActive = true,
    };
    private static RoleAdministrationService Service(ApplicationDbContext db, params string[] owners) =>
        new(db, Options.Create(new TwitchAuthOptions { PermanentSuperAdminTwitchUserIds = owners }), new FixedClock());
    private sealed class FixedClock : TimeProvider { public override DateTimeOffset GetUtcNow() => new(Now); }
}
