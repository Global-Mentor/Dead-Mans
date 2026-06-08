namespace backend.Domain.Persistence;
public static class MediaAssetPersistence
{
    public const string ScopePrivate = "private";
    public const string StatusPending = "pending";
    public const string StatusActive = "active";
    public static string CheckSqlAllowedScopes { get; } =
        $"\"Scope\" IN ('{ScopePrivate}')";
    public static string CheckSqlAllowedStatuses { get; } =
        $"\"Status\" IN ('{StatusPending}','{StatusActive}')";
}
