namespace backend.Domain.Persistence;

public static class GameRoundStatusValue
{
    public const string CardOpened = "card_opened";
    public const string AwaitingModifiers = "awaiting_modifiers";
    public const string Preparing = "preparing";
    public const string PreparationCompleted = "preparation_completed";
    public const string InProgress = "in_progress";
    public const string ReviewingResults = "reviewing_results";
    public const string ShowingResults = "showing_results";
    public const string Completed = "completed";
    public const string Cancelled = "cancelled";

    public static string CheckSqlAllowedStatuses { get; } =
        $"status IN ('{CardOpened}','{AwaitingModifiers}','{Preparing}','{PreparationCompleted}','{InProgress}','{ReviewingResults}','{ShowingResults}','{Completed}','{Cancelled}')";

    public static string CheckSqlFinishedAtSemantics { get; } =
        $"((status IN ('{CardOpened}','{AwaitingModifiers}','{Preparing}','{PreparationCompleted}','{InProgress}','{ReviewingResults}')) AND finished_at_utc IS NULL) "
        + $"OR ((status IN ('{ShowingResults}','{Completed}','{Cancelled}')) AND finished_at_utc IS NOT NULL)";
}
