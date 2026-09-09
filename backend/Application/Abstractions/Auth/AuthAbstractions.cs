namespace backend.Application.Abstractions.Auth;

public sealed record AuthUserSummary(Guid UserId, string DisplayName, bool IsActive);

public sealed record AuthSession(Guid UserId, string DisplayName, IReadOnlyList<string> Roles);

public sealed record RoleAdministrationUser(
    Guid UserId,
    string TwitchLogin,
    string DisplayName,
    bool IsActive,
    IReadOnlyList<string> Roles,
    bool IsPermanentSuperAdmin
);

public sealed record RoleAdministrationPage(
    IReadOnlyList<RoleAdministrationUser> Items,
    int Page,
    int PageSize,
    int TotalCount
);

public enum UpdateUserRolesOutcome
{
    Updated,
    UserNotFound,
    InvalidRoles,
    PermanentSuperAdminProtected
}

public sealed record UpdateUserRolesResult(
    UpdateUserRolesOutcome Outcome,
    RoleAdministrationUser? User = null
);

public sealed record TwitchAuthenticatedUser(
    Guid UserId,
    string TwitchUserId,
    string DisplayName,
    string[] Roles,
    bool IsNewUser
);

public sealed record TwitchLoginChallenge(string State, string AuthorizeUrl);

public sealed record TwitchLoginCompletion(TwitchAuthenticatedUser? AuthenticatedUser, string FrontendRedirectUrl);

public interface IAuthUserReader
{
    Task<AuthUserSummary?> FindByIdAsync(Guid userId, CancellationToken cancellationToken);
}

public interface IAuthSessionService
{
    Task<AuthSession?> GetSessionAsync(Guid userId, CancellationToken cancellationToken);
}

public interface IUserRoleService
{
    Task<string[]> GetEffectiveRolesAsync(Guid userId, CancellationToken cancellationToken);

    Task<string[]> EnsureEffectiveRolesAsync(Guid userId, CancellationToken cancellationToken);
}

public interface IRoleAdministrationService
{
    Task<RoleAdministrationPage> GetUsersAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken
    );

    Task<UpdateUserRolesResult> UpdateRolesAsync(
        Guid actorUserId,
        Guid targetUserId,
        IReadOnlyCollection<string> roleCodes,
        CancellationToken cancellationToken
    );
}

public interface ITwitchLoginService
{
    string BuildAuthorizeUrl(string state);

    Task<TwitchAuthenticatedUser> AuthenticateAsync(string code, CancellationToken cancellationToken);
}

public interface ITwitchAuthFlowService
{
    TwitchLoginChallenge BeginLogin();

    Task<TwitchLoginCompletion> CompleteLoginAsync(string code, CancellationToken cancellationToken);

    string BuildFrontendRedirect(string status, string? reason = null);
}
