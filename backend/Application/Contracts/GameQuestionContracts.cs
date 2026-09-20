namespace backend.Application.Contracts;

public sealed record GameQuestionOption(Guid OptionId, string Text, bool IsCorrect, int SortOrder);

public sealed record GameQuestionOptionInput(string Text, bool IsCorrect);

public sealed record GameQuestionCatalogItem(
    Guid QuestionId,
    string QuestionCode,
    Guid CategoryId,
    string CategoryName,
    string Text,
    IReadOnlyList<GameQuestionOption> Options,
    int Reward,
    int Priority,
    bool IsEnabled,
    int AskedTotalCount,
    int SubmissionTotalCount,
    int CorrectSubmissionTotalCount,
    decimal CorrectPercentage,
    DateTime? LastAskedAtUtc
);

public sealed record GameQuestionCategoryItem(Guid Id, string Name, int QuestionCount, bool IsProtected);

public sealed record CreateGameQuestionInput(
    string? ExternalCode,
    Guid CategoryId,
    string Text,
    IReadOnlyList<GameQuestionOptionInput> Options,
    int Reward,
    bool IsEnabled,
    int Priority
);

public sealed record ImportGameQuestionInput(
    int RowNumber,
    Guid CategoryId,
    string? Text,
    IReadOnlyList<GameQuestionOptionInput> Options,
    int? Reward,
    string? ExternalCode,
    bool? IsEnabled,
    int? Priority,
    ImportGameQuestionSource SourceQuestion
);

public sealed record ImportGameQuestionSource(
    string? Text,
    IReadOnlyList<GameQuestionOptionInput>? Options,
    int? Reward,
    string? CategoryId,
    string? ExternalCode,
    bool? IsEnabled,
    int? Priority
);

public sealed record ImportGameQuestionCandidate(
    int RowNumber,
    string QuestionText,
    CreateGameQuestionInput Question,
    ImportGameQuestionSource SourceQuestion
);

public sealed record ImportGameQuestionSkippedItem(
    int RowNumber,
    string? QuestionText,
    string ReasonCode,
    string Reason,
    ImportGameQuestionSource? SourceQuestion = null
);

public sealed record UpdateGameQuestionInput(
    Guid CategoryId,
    string Text,
    IReadOnlyList<GameQuestionOptionInput> Options,
    int Reward,
    bool IsEnabled,
    int Priority
);

public sealed record GameQuizOption(Guid OptionId, string Text, int DisplayOrder);

public sealed record AvailableGameQuizQuestion(
    Guid QuestionId,
    string QuestionCode,
    string CategoryName,
    string Text
);

public sealed record AskedQuizQuestion(
    Guid QuestionSessionId,
    Guid GameId,
    int AskOrder,
    Guid QuestionId,
    string QuestionCode,
    string CategoryName,
    string Text,
    IReadOnlyList<GameQuizOption> Options,
    int Reward,
    DateTime AskedAtUtc,
    DateTime ClosesAtUtc
);

public abstract record GameQuizQuestionDelivery;
public sealed record ManualGameQuizQuestionDelivery(Guid AskedByUserId) : GameQuizQuestionDelivery;
public sealed record TwitchGameQuizQuestionDelivery(string SourceChannelId, string? SourceMessageId = null)
    : GameQuizQuestionDelivery;

public abstract record GameQuizAnswerSource;
public sealed record WebGameQuizAnswerSource(Guid UserId) : GameQuizAnswerSource;
public sealed record ManualGameQuizAnswerSource(
    Guid CapturedByUserId,
    Guid AwardedToUserId,
    string? ReportedDisplayName
) : GameQuizAnswerSource;
public sealed record TwitchGameQuizAnswerSource(
    string TwitchUserId,
    string Login,
    string DisplayName,
    string SourceChannelId,
    string SourceMessageId
) : GameQuizAnswerSource;

public sealed record SubmitGameQuizAnswerInput(Guid SelectedOptionId, GameQuizAnswerSource Source);

public sealed record GameQuizSubmissionReceipt(
    Guid SubmissionId,
    Guid QuestionSessionId,
    Guid UserId,
    Guid SelectedOptionId,
    DateTime SubmittedAtUtc,
    bool IsExisting
);

public sealed record GameQuizOptionResult(Guid OptionId, int AnswerCount, decimal Percentage);

public sealed record CurrentGameQuizState(
    Guid QuestionSessionId,
    Guid GameId,
    int AskOrder,
    Guid QuestionId,
    string QuestionCode,
    string CategoryName,
    string Text,
    IReadOnlyList<GameQuizOption> Options,
    int? Reward,
    string Status,
    DateTime AskedAtUtc,
    DateTime ClosesAtUtc,
    DateTime? ClosedAtUtc,
    Guid? MySelectedOptionId,
    DateTime? MySubmittedAtUtc,
    Guid? CorrectOptionId,
    bool? MyIsCorrect,
    int? MyAwardedPoints,
    int? TotalSubmissions,
    IReadOnlyList<GameQuizOptionResult>? OptionResults
);


public sealed record ManualQuizAwardInput(
    Guid AwardedToUserId,
    string OperationType,
    int Points,
    string Reason,
    Guid RequestId
);

public sealed record ManualQuizAwardPlayer(
    Guid UserId,
    string Login,
    string DisplayName,
    int EarnedQuizPoints,
    int SpentQuizPoints,
    int AvailableQuizPoints
);

public sealed record ManualQuizAwardSummary(
    Guid AwardId,
    Guid GameId,
    Guid AwardedToUserId,
    string AwardedToDisplayName,
    Guid AwardedByUserId,
    string AwardedByDisplayName,
    string OperationType,
    int PointsDelta,
    string Reason,
    int AvailablePointsBefore,
    int AvailablePointsAfter,
    Guid RequestId,
    DateTime AwardedAtUtc
);

public static class GameQuizStateChangeKinds
{
    public const string QuestionAsked = "question_asked";
    public const string QuestionClosed = "question_closed";
    public const string ManualAdjustmentApplied = "manual_adjustment_applied";
}

public sealed record GameQuizStateChangedEvent(Guid GameId, string ChangeKind, DateTime OccurredAtUtc);
