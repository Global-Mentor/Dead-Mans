using backend.Domain.Persistence;

namespace backend.Application.Contracts;

public sealed record GameQuestionCatalogItem(
    Guid QuestionId,
    string VectorCode,
    string QuestionCode,
    string Category,
    string Text,
    string Answer,
    int Reward,
    bool IsEnabled,
    int AskedTotalCount,
    int CorrectTotalCount,
    DateTime? LastAskedAtUtc
);

public sealed record AskedGameQuestion(
    Guid RoundId,
    Guid GameId,
    int AskOrder,
    Guid QuestionId,
    string VectorCode,
    string QuestionCode,
    string Category,
    string Text,
    int Reward,
    DateTime AskedAtUtc
);

public sealed record GameQuestionRoundSummary(
    Guid RoundId,
    Guid GameId,
    int AskOrder,
    Guid QuestionId,
    string QuestionText,
    string Category,
    int Reward,
    string Status,
    DateTime AskedAtUtc,
    DateTime? AnsweredAtUtc,
    string? AnsweredByDisplayName,
    Guid? AnsweredByUserId,
    string? SubmittedAnswer,
    bool? IsCorrect,
    int? AwardedPoints
);

public static class GameQuestionRoundSummaryFactory
{
    public static GameQuestionRoundSummary Create(
        Guid roundId,
        Guid gameId,
        int askOrder,
        Guid questionId,
        string questionText,
        string category,
        int reward,
        string status,
        DateTime askedAtUtc,
        DateTime? answeredAtUtc,
        string? answeredByDisplayName,
        Guid? answeredByUserId,
        string? submittedAnswer,
        bool? isCorrect,
        int? awardedPoints
    )
    {
        var normalizedStatus = string.IsNullOrWhiteSpace(status)
            ? GameQuestionRoundStatusValue.Asked
            : status;

        return new GameQuestionRoundSummary(
            roundId,
            gameId,
            askOrder,
            questionId,
            questionText,
            category,
            reward,
            normalizedStatus,
            askedAtUtc,
            answeredAtUtc,
            answeredByDisplayName,
            answeredByUserId,
            submittedAnswer,
            isCorrect,
            awardedPoints
        );
    }
}
