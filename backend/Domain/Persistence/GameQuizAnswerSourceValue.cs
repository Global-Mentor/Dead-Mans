namespace backend.Domain.Persistence;

public static class GameQuizAnswerSourceValue
{
    public const string Manual = "manual";
    public const string Web = "web";
    public const string Twitch = "twitch";

    public static string CheckSqlAllowed { get; } =
        $"source_provider IN ('{Manual}','{Web}','{Twitch}')";
}
