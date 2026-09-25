using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using backend.Messaging;

namespace backend.Application.Contracts;

public static partial class TwitchQuizChatCommandParser
{
    [GeneratedRegex("^!(10|[1-9])$", RegexOptions.CultureInvariant)]
    private static partial Regex AnswerCommandRegex();

    public static bool TryParseAnswer(string? message, out int optionNumber)
    {
        optionNumber = 0;
        if (message is null)
        {
            return false;
        }

        var match = AnswerCommandRegex().Match(message.Trim());
        return match.Success
            && int.TryParse(match.Groups[1].Value, CultureInfo.InvariantCulture, out optionNumber);
    }
}

public sealed record TwitchQuizMessageSet(
    string Question,
    string Options,
    string ResultTemplate,
    int QuestionLength,
    int OptionsLength,
    int ResultMaximumLength,
    bool IsCompatible,
    string? ErrorCode
);

public static class TwitchQuizMessageFormatter
{
    public const int MaximumMessageLength = 500;
    public const int MaximumReservedQuestionNumber = 999_999;
    public const int MaximumReservedParticipantCount = 2_147_483_647;

    public static TwitchQuizMessageSet FormatForValidation(
        string question,
        IReadOnlyList<string> options,
        int durationSeconds,
        int reward)
    {
        var normalizedQuestion = Normalize(question);
        var normalizedOptions = options.Select(Normalize).ToArray();
        var questionMessage = ComposeQuestion(MaximumReservedQuestionNumber, normalizedQuestion);
        var optionsMessage = ComposeOptions(normalizedOptions, durationSeconds);
        var longestOption = normalizedOptions.OrderByDescending(CountCharacters).FirstOrDefault() ?? string.Empty;
        var result = ComposeResult(
            Math.Min(10, Math.Max(1, normalizedOptions.Length)),
            longestOption,
            MaximumReservedParticipantCount,
            MaximumReservedParticipantCount,
            reward
        );
        var questionLength = CountCharacters(questionMessage);
        var optionsLength = CountCharacters(optionsMessage);
        var resultLength = CountCharacters(result);
        var compatible = questionLength <= MaximumMessageLength
            && optionsLength <= MaximumMessageLength
            && resultLength <= MaximumMessageLength;
        var error = questionLength > MaximumMessageLength
            ? AppMessages.ErrorCodes.TwitchQuizQuestionMessageTooLong
            : optionsLength > MaximumMessageLength
                ? AppMessages.ErrorCodes.TwitchQuizOptionsMessageTooLong
                : resultLength > MaximumMessageLength
                    ? AppMessages.ErrorCodes.TwitchQuizResultMessageTooLong
                    : null;
        return new(
            questionMessage,
            optionsMessage,
            result,
            questionLength,
            optionsLength,
            resultLength,
            compatible,
            error
        );
    }

    public static string FormatQuestion(int askOrder, string question) =>
        EnsureLength(ComposeQuestion(askOrder, question));

    public static string FormatOptions(IReadOnlyList<string> options, int durationSeconds)
    {
        return EnsureLength(ComposeOptions(options, durationSeconds));
    }

    public static string FormatResult(
        int correctOptionNumber,
        string correctOption,
        int correctCount,
        int participantCount,
        int reward)
    {
        return EnsureLength(ComposeResult(correctOptionNumber, correctOption, correctCount, participantCount, reward));
    }

    private static string ComposeQuestion(int askOrder, string question) =>
        $"Вопрос №{askOrder}: {Normalize(question)}".Normalize(NormalizationForm.FormC);

    private static string ComposeOptions(IReadOnlyList<string> options, int durationSeconds)
    {
        var choices = string.Join(" | ", options.Select((text, index) => $"!{index + 1} [{Normalize(text)}]"));
        return $"{choices} | На ответ: {durationSeconds} {RussianPlural(durationSeconds, "секунда", "секунды", "секунд")}. Одна попытка.".Normalize(NormalizationForm.FormC);
    }

    private static string ComposeResult(int correctOptionNumber, string correctOption, int correctCount, int participantCount, int reward)
    {
        var answer = $"Правильный ответ: !{correctOptionNumber} [{Normalize(correctOption)}].";
        if (participantCount == 0)
        {
            return $"{answer} Ответов не было, очки не начислялись.";
        }
        if (correctCount == 0)
        {
            return $"{answer} Никто из {FormatParticipants(participantCount)} не ответил верно, очки не начислялись.";
        }
        if (reward <= 0)
        {
            return $"{answer} {FormatCorrectCount(correctCount, participantCount)}. Награда за вопрос: 0 очков.";
        }
        return $"{answer} {FormatCorrectCount(correctCount, participantCount)}. Каждому начислено {reward} {RussianPlural(reward, "очко", "очка", "очков")}.";
    }

    private static string FormatCorrectCount(int correctCount, int participantCount) =>
        $"Верно {RussianPlural(correctCount, "ответил", "ответили", "ответили")} {correctCount} из {FormatParticipants(participantCount)}";

    private static string FormatParticipants(int count) =>
        $"{count} {RussianPlural(count, "участника", "участников", "участников")}";

    private static string RussianPlural(int value, string one, string few, string many)
    {
        var absolute = Math.Abs(value) % 100;
        if (absolute is >= 11 and <= 14) return many;
        return (absolute % 10) switch { 1 => one, 2 or 3 or 4 => few, _ => many };
    }

    public static string FormatCancellation(int askOrder) =>
        EnsureLength($"Вопрос №{askOrder} отменён. Ответы не учитываются, очки не начисляются.");

    public static string Normalize(string value) =>
        string.Join(' ', (value ?? string.Empty).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
            .Replace('\u2013', '-').Replace('\u2014', '-').Normalize(NormalizationForm.FormC);

    private static string EnsureLength(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormC);
        if (CountCharacters(normalized) > MaximumMessageLength)
        {
            throw new ArgumentOutOfRangeException(nameof(value), "Twitch chat message exceeds 500 characters.");
        }
        return normalized;
    }

    private static int CountCharacters(string value) => value.EnumerateRunes().Count();
}

public static class TwitchQuizPublicationStatuses
{
    public const string Publishing = "publishing";
    public const string Open = "open";
    public const string Failed = "failed";
    public const string Uncertain = "uncertain";
    public const string CancelPending = "cancel_pending";
    public const string Cancelled = "cancelled";
    public const string Completed = "completed";
}

public static class TwitchQuizDeliveryStatuses
{
    public const string Pending = "pending";
    public const string Sending = "sending";
    public const string Sent = "sent";
    public const string Failed = "failed";
    public const string Uncertain = "uncertain";
    public const string Skipped = "skipped";
}

public sealed record TwitchQuizPublicationState(
    Guid PublicationId,
    Guid GameId,
    Guid QuestionId,
    Guid? QuestionSessionId,
    int AskOrder,
    string Status,
    string QuestionDeliveryStatus,
    string OptionsDeliveryStatus,
    string OutcomeDeliveryStatus,
    string QuestionMessage,
    string OptionsMessage,
    string? LastError,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);

public enum PrepareTwitchQuizQuestionOutcome
{
    Prepared,
    Disabled,
    NotConnected,
    NoActiveGame,
    NoAvailableQuestions,
    ModifierOrderingActive,
    PublicationInProgress,
    PendingOutcome,
    IncompatibleQuestion
}

public sealed record PrepareTwitchQuizQuestionResult(
    PrepareTwitchQuizQuestionOutcome Outcome,
    TwitchQuizPublicationState? Publication = null,
    string? ErrorCode = null
);
