using backend.Application.Abstractions.Auth;
using backend.Data;
using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Infrastructure.Auth;

public sealed class RoleAdministrationService : IRoleAdministrationService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly HashSet<string> _permanentSuperAdminTwitchUserIds;
    private readonly TimeProvider _timeProvider;

    public RoleAdministrationService(
        ApplicationDbContext dbContext,
        IOptions<TwitchAuthOptions> options,
        TimeProvider timeProvider
    )
    {
        _dbContext = dbContext;
        _permanentSuperAdminTwitchUserIds = options.Value.PermanentSuperAdminTwitchUserIds
            .Select(id => id.Trim())
            .ToHashSet(StringComparer.Ordinal);
        _timeProvider = timeProvider;
    }

    public async Task<RoleAdministrationPage> GetUsersAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken
    )
    {
        var query = _dbContext.Users.AsNoTracking();
        var normalizedSearch = search?.Trim();
        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            var pattern = $"%{EscapeLikePattern(normalizedSearch)}%";
            query = query.Where(user =>
                EF.Functions.ILike(user.Login, pattern, "\\")
                || EF.Functions.ILike(user.DisplayName, pattern, "\\")
            );
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var users = await query
            .OrderByDescending(user => user.LastLoginAtUtc)
            .ThenBy(user => user.DisplayName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(user => new UserSnapshot(
                user.Id,
                user.TwitchUserId,
                user.Login,
                user.DisplayName,
                user.IsActive
            ))
            .ToArrayAsync(cancellationToken);
        var roleCodesByUserId = await GetRoleCodesByUserIdAsync(
            users.Select(user => user.UserId).ToArray(),
            cancellationToken
        );
        var items = users
            .Select(user => ToAdministrationUser(user, roleCodesByUserId.GetValueOrDefault(user.UserId)))
            .ToArray();

        return new RoleAdministrationPage(items, page, pageSize, totalCount);
    }

    public async Task<UpdateUserRolesResult> UpdateRolesAsync(
        Guid actorUserId,
        Guid targetUserId,
        IReadOnlyCollection<string> roleCodes,
        CancellationToken cancellationToken
    )
    {
        var requestedRoles = roleCodes.ToHashSet(StringComparer.Ordinal);
        if (
            requestedRoles.Count != roleCodes.Count
            || requestedRoles.Any(role => !AuthRoleCodes.Assignable.Contains(role, StringComparer.Ordinal))
        )
        {
            return new UpdateUserRolesResult(UpdateUserRolesOutcome.InvalidRoles);
        }

        var targetUser = await _dbContext.Users
            .SingleOrDefaultAsync(user => user.Id == targetUserId, cancellationToken);
        if (targetUser is null)
        {
            return new UpdateUserRolesResult(UpdateUserRolesOutcome.UserNotFound);
        }

        var isPermanentSuperAdmin = _permanentSuperAdminTwitchUserIds.Contains(
            targetUser.TwitchUserId
        );
        if (isPermanentSuperAdmin && !requestedRoles.Contains(AuthRoleCodes.SuperAdmin))
        {
            return new UpdateUserRolesResult(UpdateUserRolesOutcome.PermanentSuperAdminProtected);
        }
        if (requestedRoles.Contains(AuthRoleCodes.SuperAdmin))
        {
            requestedRoles.Add(AuthRoleCodes.Admin);
        }

        var rolesByCode = await _dbContext.Roles
            .Where(role => AuthRoleCodes.Assignable.Contains(role.Code))
            .ToDictionaryAsync(role => role.Code, StringComparer.Ordinal, cancellationToken);
        if (rolesByCode.Count != AuthRoleCodes.Assignable.Length)
        {
            throw new InvalidOperationException("One or more assignable roles are missing.");
        }

        var assignments = await _dbContext.UserRoles
            .Where(userRole =>
                userRole.UserId == targetUserId
                && rolesByCode.Values.Select(role => role.Id).Contains(userRole.RoleId)
            )
            .ToDictionaryAsync(userRole => userRole.RoleId, cancellationToken);
        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;

        foreach (var (roleCode, role) in rolesByCode)
        {
            var shouldBeAssigned = requestedRoles.Contains(roleCode);
            assignments.TryGetValue(role.Id, out var assignment);
            var isEffective = assignment is not null
                && (!assignment.ExpiresAtUtc.HasValue || assignment.ExpiresAtUtc > utcNow);

            if (shouldBeAssigned && !isEffective)
            {
                if (assignment is null)
                {
                    _dbContext.UserRoles.Add(
                        new UserRole
                        {
                            UserId = targetUserId,
                            RoleId = role.Id,
                            AssignedByUserId = actorUserId,
                            AssignedAtUtc = utcNow
                        }
                    );
                }
                else
                {
                    assignment.AssignedByUserId = actorUserId;
                    assignment.AssignedAtUtc = utcNow;
                    assignment.ExpiresAtUtc = null;
                }

                AddAuditEvent(targetUserId, role.Id, actorUserId, UserRoleAuditEvent.GrantedAction, utcNow);
            }
            else if (!shouldBeAssigned && assignment is not null)
            {
                _dbContext.UserRoles.Remove(assignment);
                AddAuditEvent(targetUserId, role.Id, actorUserId, UserRoleAuditEvent.RevokedAction, utcNow);
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var updatedRoleCodes = await GetRoleCodesByUserIdAsync([targetUserId], cancellationToken);
        return new UpdateUserRolesResult(
            UpdateUserRolesOutcome.Updated,
            ToAdministrationUser(
                new UserSnapshot(
                    targetUser.Id,
                    targetUser.TwitchUserId,
                    targetUser.Login,
                    targetUser.DisplayName,
                    targetUser.IsActive
                ),
                updatedRoleCodes.GetValueOrDefault(targetUserId)
            )
        );
    }

    private async Task<Dictionary<Guid, string[]>> GetRoleCodesByUserIdAsync(
        Guid[] userIds,
        CancellationToken cancellationToken
    )
    {
        if (userIds.Length == 0)
        {
            return [];
        }

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        var rows = await _dbContext.UserRoles
            .AsNoTracking()
            .Where(userRole =>
                userIds.Contains(userRole.UserId)
                && (userRole.ExpiresAtUtc == null || userRole.ExpiresAtUtc > utcNow)
            )
            .Join(
                _dbContext.Roles,
                userRole => userRole.RoleId,
                role => role.Id,
                (userRole, role) => new { userRole.UserId, role.Code }
            )
            .ToArrayAsync(cancellationToken);

        return rows
            .GroupBy(row => row.UserId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(row => row.Code).ToArray()
            );
    }

    private RoleAdministrationUser ToAdministrationUser(
        UserSnapshot user,
        IEnumerable<string>? assignedRoleCodes
    )
    {
        var isPermanentSuperAdmin = _permanentSuperAdminTwitchUserIds.Contains(user.TwitchUserId);
        var roleCodes = assignedRoleCodes?.ToList() ?? [];
        roleCodes.Add(AuthRoleCodes.Viewer);
        if (isPermanentSuperAdmin)
        {
            roleCodes.Add(AuthRoleCodes.SuperAdmin);
        }
        if (roleCodes.Contains(AuthRoleCodes.SuperAdmin, StringComparer.Ordinal))
        {
            roleCodes.Add(AuthRoleCodes.Admin);
        }

        return new RoleAdministrationUser(
            user.UserId,
            user.TwitchLogin,
            user.DisplayName,
            user.IsActive,
            UserRoleService.NormalizeRoles(roleCodes),
            isPermanentSuperAdmin
        );
    }

    private void AddAuditEvent(
        Guid userId,
        short roleId,
        Guid changedByUserId,
        string action,
        DateTime occurredAtUtc
    )
    {
        _dbContext.UserRoleAuditEvents.Add(
            new UserRoleAuditEvent
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                RoleId = roleId,
                ChangedByUserId = changedByUserId,
                Action = action,
                OccurredAtUtc = occurredAtUtc
            }
        );
    }

    private static string EscapeLikePattern(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
    }

    private sealed record UserSnapshot(
        Guid UserId,
        string TwitchUserId,
        string TwitchLogin,
        string DisplayName,
        bool IsActive
    );
}
