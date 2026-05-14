namespace backend.Application.Abstractions.Auth;

public sealed record AuthUserSummary(Guid UserId, string DisplayName, bool IsActive);

public sealed record AuthSession(Guid UserId, string DisplayName, IReadOnlyList<string> Roles);

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
