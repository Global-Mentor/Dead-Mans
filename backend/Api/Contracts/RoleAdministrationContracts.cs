namespace backend.Api.Contracts;

public sealed record RoleAdministrationUserDto(
    Guid UserId,
    string TwitchLogin,
    string DisplayName,
    bool IsActive,
    IReadOnlyList<AuthRole> Roles,
    bool IsPermanentSuperAdmin
);

public sealed record RoleAdministrationPageDto(
    IReadOnlyList<RoleAdministrationUserDto> Items,
    int Page,
    int PageSize,
    int TotalCount
);

public sealed record UpdateUserRolesRequestDto(IReadOnlyList<AuthRole> Roles);
