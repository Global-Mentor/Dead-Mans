namespace backend.Domain.Persistence;
public static class GameStatusValue
{
    public const string Draft = "draft";
    public const string Ready = "ready";
    public const string Active = "active";
    public const string Finished = "finished";
    public static string CheckSqlAllowedStatuses { get; } =
        $"\"Status\" IN ('{Draft}','{Ready}','{Active}','{Finished}')";
    public static string CheckSqlFinishedAtSemantics { get; } = BuildCheckSqlFinishedAtSemantics();

    public static string CheckSqlLifecycleTimestampSemantics { get; } =
        BuildCheckSqlLifecycleTimestampSemantics();

    public static string CheckSqlTeamSizeLimits { get; } =
        "\"MinPlayersPerTeam\" > 0 AND \"MaxPlayersPerTeam\" >= \"MinPlayersPerTeam\"";

    private static string BuildCheckSqlFinishedAtSemantics()
    {
        string Q(string id) => "\"" + id + "\"";
        return
            "(("
            + Q("Status")
            + " IN ('"
            + Draft
            + "','"
            + Ready
            + "','"
            + Active
            + "')) AND "
            + Q("FinishedAtUtc")
            + " IS NULL) OR (("
            + Q("Status")
            + " = '"
            + Finished
            + "') AND "
            + Q("FinishedAtUtc")
            + " IS NOT NULL)";
    }

    private static string BuildCheckSqlLifecycleTimestampSemantics()
    {
        string Q(string id) => "\"" + id + "\"";
        return
            "(("
            + Q("Status")
            + " = '"
            + Draft
            + "') AND "
            + Q("ReadyAtUtc")
            + " IS NULL AND "
            + Q("StartedAtUtc")
            + " IS NULL AND "
            + Q("FinishedAtUtc")
            + " IS NULL) OR (("
            + Q("Status")
            + " = '"
            + Ready
            + "') AND "
            + Q("ReadyAtUtc")
            + " IS NOT NULL AND "
            + Q("StartedAtUtc")
            + " IS NULL AND "
            + Q("FinishedAtUtc")
            + " IS NULL) OR (("
            + Q("Status")
            + " = '"
            + Active
            + "') AND "
            + Q("ReadyAtUtc")
            + " IS NOT NULL AND "
            + Q("StartedAtUtc")
            + " IS NOT NULL AND "
            + Q("FinishedAtUtc")
            + " IS NULL) OR (("
            + Q("Status")
            + " = '"
            + Finished
            + "') AND "
            + Q("ReadyAtUtc")
            + " IS NOT NULL AND "
            + Q("StartedAtUtc")
            + " IS NOT NULL AND "
            + Q("FinishedAtUtc")
            + " IS NOT NULL)";
    }
}
