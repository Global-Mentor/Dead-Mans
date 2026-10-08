namespace backend.Api.Contracts;

public sealed record RoleAdministrationUserDto(
    Guid UserId,
    string TwitchLogin,
    string DisplayName,
    bool IsActive,
    IReadOnlyList<AuthRole> Roles,
    bool IsPermanentSuperAdmin,
    DateTime CreatedAtUtc,
    DateTime? LastLoginAtUtc
);

public sealed record RoleAdministrationPageDto(
    IReadOnlyList<RoleAdministrationUserDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    RoleAdministrationSummaryDto Summary
);

public sealed record RoleAdministrationSummaryDto(int TotalUsers, int LoggedInUsers, int NewUsers);

public sealed record UpdateUserRolesRequestDto(IReadOnlyList<AuthRole> Roles);

public sealed record UpdateUserAccessRequestDto(bool? IsActive);
