namespace backend.Domain.Persistence;

public static class GameQuizQuestionSessionStatusValue
{
    public const string Open = "open";
    public const string Closed = "closed";
    public const string Skipped = "skipped";

    public static string CheckSqlAllowedStatuses { get; } =
        $"status IN ('{Open}','{Closed}','{Skipped}')";
}
