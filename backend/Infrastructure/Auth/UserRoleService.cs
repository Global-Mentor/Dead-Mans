using backend.Application.Abstractions.Auth;
using backend.Data;
using backend.Data.Entities;
using backend.Messaging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Infrastructure.Auth;

public sealed class UserRoleService : IUserRoleService
{
    private const string ViewerRoleCode = AuthRoleCodes.Viewer;

    private readonly ApplicationDbContext _dbContext;
    private readonly HashSet<string> _permanentSuperAdminTwitchUserIds;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<UserRoleService> _logger;

    public UserRoleService(
        ApplicationDbContext dbContext,
        IOptions<TwitchAuthOptions> options,
        TimeProvider timeProvider,
        ILogger<UserRoleService> logger
    )
    {
        _dbContext = dbContext;
        _permanentSuperAdminTwitchUserIds = options.Value.PermanentSuperAdminTwitchUserIds
            .Select(id => id.Trim())
            .ToHashSet(StringComparer.Ordinal);
        _timeProvider = timeProvider;
        _logger = logger;
    }

    internal UserRoleService(
        ApplicationDbContext dbContext,
        TimeProvider timeProvider,
        ILogger<UserRoleService> logger
    ) : this(dbContext, Options.Create(new TwitchAuthOptions()), timeProvider, logger)
    {
    }

    public async Task<string[]> EnsureEffectiveRolesAsync(
        Guid userId,
        CancellationToken cancellationToken
    )
    {
        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;

        var twitchUserId = await _dbContext.Users
            .Where(x => x.Id == userId)
            .Select(x => x.TwitchUserId)
            .SingleOrDefaultAsync(cancellationToken);
        var isPermanentSuperAdmin = twitchUserId is not null
            && _permanentSuperAdminTwitchUserIds.Contains(twitchUserId);
        var requiredRoleCodes = isPermanentSuperAdmin
            ? new[] { ViewerRoleCode, AuthRoleCodes.Admin, AuthRoleCodes.SuperAdmin }
            : [ViewerRoleCode];
        var requiredRoles = await _dbContext.Roles
            .Where(x => requiredRoleCodes.Contains(x.Code))
            .ToDictionaryAsync(x => x.Code, StringComparer.Ordinal, cancellationToken);

        if (!requiredRoles.TryGetValue(ViewerRoleCode, out _))
        {
            _logger.LogError(AppMessages.Logs.ViewerRoleMissingFromTable, ViewerRoleCode);
            throw new InvalidOperationException(AppMessages.Exceptions.ViewerRoleMissing);
        }
        if (requiredRoles.Count != requiredRoleCodes.Length)
        {
            throw new InvalidOperationException("One or more permanent super administrator roles are missing.");
        }

        var existingAssignments = await _dbContext.UserRoles
            .Where(x => x.UserId == userId)
            .Join(
                _dbContext.Roles,
                userRole => userRole.RoleId,
                role => role.Id,
                (userRole, role) => new UserRoleAssignmentSnapshot
                {
                    UserRole = userRole,
                    RoleCode = role.Code
                }
            )
            .ToListAsync(cancellationToken);

        foreach (var requiredRoleCode in requiredRoleCodes)
        {
            var requiredRole = requiredRoles[requiredRoleCode];
            var assignment = existingAssignments
                .FirstOrDefault(x => x.RoleCode == requiredRoleCode)?.UserRole;
            if (assignment is null)
            {
                _dbContext.UserRoles.Add(
                    new UserRole
                    {
                        UserId = userId,
                        RoleId = requiredRole.Id,
                        AssignedAtUtc = utcNow,
                        ExpiresAtUtc = null
                    }
                );
                AddAuditEvent(userId, requiredRole.Id, utcNow);
                continue;
            }

            if (assignment.ExpiresAtUtc.HasValue && assignment.ExpiresAtUtc <= utcNow)
            {
                assignment.AssignedAtUtc = utcNow;
                assignment.AssignedByUserId = null;
                assignment.ExpiresAtUtc = null;
                AddAuditEvent(userId, requiredRole.Id, utcNow);
            }
        }

        if (_dbContext.ChangeTracker.HasChanges())
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return await GetEffectiveRolesAsync(userId, cancellationToken);
    }

    private void AddAuditEvent(Guid userId, short roleId, DateTime occurredAtUtc)
    {
        _dbContext.UserRoleAuditEvents.Add(
            new UserRoleAuditEvent
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                RoleId = roleId,
                ChangedByUserId = null,
                Action = UserRoleAuditEvent.GrantedAction,
                OccurredAtUtc = occurredAtUtc
            }
        );
    }

    public async Task<string[]> GetEffectiveRolesAsync(
        Guid userId,
        CancellationToken cancellationToken
    )
    {
        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        var user = await _dbContext.Users
            .Where(x => x.Id == userId)
            .Select(x => new { x.TwitchUserId })
            .SingleOrDefaultAsync(cancellationToken);
        var effectiveRoles = await _dbContext.UserRoles
            .Where(x => x.UserId == userId && (x.ExpiresAtUtc == null || x.ExpiresAtUtc > utcNow))
            .Join(_dbContext.Roles, userRole => userRole.RoleId, role => role.Id, (_, role) => role.Code)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (user is not null && _permanentSuperAdminTwitchUserIds.Contains(user.TwitchUserId))
        {
            effectiveRoles.Add(AuthRoleCodes.SuperAdmin);
        }

        if (effectiveRoles.Contains(AuthRoleCodes.SuperAdmin, StringComparer.Ordinal))
        {
            effectiveRoles.Add(AuthRoleCodes.Admin);
        }

        if (!effectiveRoles.Contains(ViewerRoleCode, StringComparer.Ordinal))
        {
            effectiveRoles.Add(ViewerRoleCode);
        }

        return NormalizeRoles(effectiveRoles);
    }

    internal static string[] NormalizeRoles(IEnumerable<string> roleCodes)
    {
        return roleCodes
            .Distinct(StringComparer.Ordinal)
            .OrderBy(RoleOrder)
            .ThenBy(code => code, StringComparer.Ordinal)
            .ToArray();
    }

    private static int RoleOrder(string roleCode)
    {
        return roleCode switch
        {
            AuthRoleCodes.Viewer => 0,
            AuthRoleCodes.Moderator => 1,
            AuthRoleCodes.Admin => 2,
            AuthRoleCodes.SuperAdmin => 3,
            _ => 4
        };
    }

    private sealed class UserRoleAssignmentSnapshot
    {
        public UserRole UserRole { get; init; } = default!;

        public string RoleCode { get; init; } = string.Empty;
    }
}
