using System.Text.Json.Serialization;

namespace backend.Api.Contracts;

public sealed record GameQuestionOptionDto(string OptionId, string Text, bool IsCorrect, int SortOrder);
public sealed record GameQuestionOptionInputDto(string? Text, bool IsCorrect);

public sealed record TwitchQuizPreviewRequestDto(string? Text, string?[]? Options, int DurationSeconds, int Reward);
public sealed record TwitchQuizPreviewDto(
    string Question,
    string Options,
    string ResultTemplate,
    int QuestionLength,
    int OptionsLength,
    int ResultMaximumLength,
    bool IsCompatible,
    string? ErrorCode,
    int MaximumLength
);

public sealed record GameQuestionCatalogItemDto(
    string QuestionId,
    string QuestionCode,
    string CategoryId,
    string CategoryName,
    string Text,
    GameQuestionOptionDto[] Options,
    int Reward,
    int Priority,
    bool IsEnabled,
    int AskedTotalCount,
    int SubmissionTotalCount,
    int CorrectSubmissionTotalCount,
    decimal CorrectPercentage,
    DateTime? LastAskedAtUtc,
    bool TwitchCompatible,
    string? TwitchCompatibilityErrorCode
);

public sealed record GameQuestionCategoryItemDto(string Id, string Name, int QuestionCount, bool IsProtected);
public sealed record SetGameQuestionEnabledRequestDto(bool IsEnabled);
public sealed record SetGameQuestionCategoryEnabledRequestDto(bool IsEnabled);

[method: JsonConstructor]
public sealed record CreateGameQuestionRequestDto(
    string? ExternalCode,
    string? CategoryId,
    string? Text,
    GameQuestionOptionInputDto[]? Options,
    int Reward,
    bool IsEnabled,
    int Priority
);

public sealed record CreateGameQuestionCategoryRequestDto(string Name);

public sealed record ImportGameQuestionRequestDto(
    string? Text,
    GameQuestionOptionInputDto[]? Options,
    int? Reward,
    string? CategoryId = null,
    string? ExternalCode = null,
    bool? IsEnabled = null,
    int? Priority = null
);

public sealed record ImportGameQuestionSourceDto(
    string? Text,
    GameQuestionOptionInputDto[]? Options,
    int? Reward,
    string? CategoryId,
    string? ExternalCode,
    bool? IsEnabled,
    int? Priority
);

public sealed record ImportGameQuestionSkippedItemDto(
    int RowNumber,
    string? QuestionText,
    string ReasonCode,
    string Reason,
    ImportGameQuestionSourceDto? SourceQuestion
);

public sealed record ImportGameQuestionsResultDto(
    int ImportedCount,
    IReadOnlyList<ImportGameQuestionSkippedItemDto> SkippedQuestions
);

[method: JsonConstructor]
public sealed record UpdateGameQuestionRequestDto(
    string? CategoryId,
    string? Text,
    GameQuestionOptionInputDto[]? Options,
    int Reward,
    bool IsEnabled,
    int Priority
);

public sealed record GameQuizOptionDto(string OptionId, string Text, int DisplayOrder);

public sealed record AvailableGameQuizQuestionDto(
    string QuestionId,
    string QuestionCode,
    string CategoryName,
    string Text
);

public sealed record AskedQuizQuestionDto(
    string QuestionSessionId,
    string GameId,
    int AskOrder,
    string QuestionId,
    string QuestionCode,
    string CategoryName,
    string Text,
    GameQuizOptionDto[] Options,
    int Reward,
    DateTime AskedAtUtc,
    DateTime ClosesAtUtc
);

public sealed record SubmitGameQuizAnswerRequestDto(string? OptionId);

public sealed record GameQuizSubmissionReceiptDto(
    string SubmissionId,
    string QuestionSessionId,
    string UserId,
    string SelectedOptionId,
    DateTime SubmittedAtUtc,
    bool IsExisting
);

public sealed record GameQuizOptionResultDto(string OptionId, int AnswerCount, decimal Percentage);

public sealed record CurrentGameQuizStateDto(
    string QuestionSessionId,
    string GameId,
    int AskOrder,
    string QuestionId,
    string QuestionCode,
    string CategoryName,
    string Text,
    GameQuizOptionDto[] Options,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? Reward,
    string Status,
    DateTime AskedAtUtc,
    DateTime ClosesAtUtc,
    DateTime? ClosedAtUtc,
    string? MySelectedOptionId,
    DateTime? MySubmittedAtUtc,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? CorrectOptionId,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] bool? MyIsCorrect,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? MyAwardedPoints,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? TotalSubmissions,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] GameQuizOptionResultDto[]? OptionResults
);


public sealed record ManualQuizAwardRequestDto(
    string AwardedToUserId,
    string OperationType,
    int Points,
    string Reason,
    string RequestId
);

public sealed record ManualQuizAwardPlayerDto(
    string UserId,
    string Login,
    string DisplayName,
    int EarnedQuizPoints,
    int SpentQuizPoints,
    int AvailableQuizPoints
);

public sealed record ManualQuizAwardSummaryDto(
    string AwardId,
    string GameId,
    string AwardedToUserId,
    string AwardedToDisplayName,
    string AwardedByUserId,
    string AwardedByDisplayName,
    string OperationType,
    int PointsDelta,
    string Reason,
    int AvailablePointsBefore,
    int AvailablePointsAfter,
    string RequestId,
    DateTime AwardedAtUtc
);

public sealed record GameQuizStateChangedEventDto(string GameId, string ChangeKind, DateTime OccurredAtUtc);
