using System.Text.Json.Serialization;

namespace backend.Api.Contracts;

public enum AuthRole
{
    [JsonStringEnumMemberName("superadmin")]
    SuperAdmin,
    Admin,
    Moderator,
    Viewer
}

public sealed record AuthSessionDto(
    Guid UserId,
    string DisplayName,
    IReadOnlyList<AuthRole> Roles
);

public sealed record ErrorResponse(string Error, string? Code = null, string? RequestId = null);
