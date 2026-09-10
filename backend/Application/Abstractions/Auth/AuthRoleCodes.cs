namespace backend.Application.Abstractions.Auth;

public static class AuthRoleCodes
{
    public const string Viewer = "viewer";
    public const string Moderator = "moderator";
    public const string Admin = "admin";
    public const string SuperAdmin = "superadmin";

    public const string ModeratorOrAdmin = Moderator + "," + Admin + "," + SuperAdmin;
    public const string AdminOrSuperAdmin = Admin + "," + SuperAdmin;

    public static readonly string[] Supported =
    [
        Viewer,
        Moderator,
        Admin,
        SuperAdmin
    ];

    public static readonly string[] Assignable =
    [
        Moderator,
        Admin,
        SuperAdmin
    ];
}
