using backend.Application.Contracts;

namespace backend.Application.Abstractions;

public enum AskGameQuizQuestionOutcome
{
    Asked,
    NoActiveGame,
    NoAvailableQuestions,
    ModifierOrderingActive,
    InvalidDelivery
}

public sealed record AskGameQuizQuestionResult(
    AskGameQuizQuestionOutcome Outcome,
    AskedQuizQuestion? AskedQuestion = null
);

public enum SubmitGameQuizAnswerOutcome
{
    Accepted,
    Existing,
    AlreadyAnswered,
    QuestionSessionNotFound,
    QuestionSessionClosed,
    OptionNotFound,
    PlayerNotFound,
    InvalidRequest,
    InvalidSource
}

public sealed record SubmitGameQuizAnswerResult(
    SubmitGameQuizAnswerOutcome Outcome,
    GameQuizSubmissionReceipt? Receipt = null
);

public enum ManualQuizAwardOutcome
{
    Awarded,
    NoActiveGame,
    PlayerNotFound,
    InvalidPoints,
    InvalidOperation,
    InvalidReason,
    InsufficientPoints,
    DuplicateRequestConflict
}

public sealed record ManualQuizAwardResult(
    ManualQuizAwardOutcome Outcome,
    ManualQuizAwardSummary? Award = null,
    bool StateChanged = false
);

public interface IGameQuizService
{
    Task<IReadOnlyList<AvailableGameQuizQuestion>> GetAvailableQuizQuestionsAsync(
        CancellationToken cancellationToken = default
    );

    Task<AskGameQuizQuestionResult> AskQuizQuestionAsync(
        Guid? questionId,
        GameQuizQuestionDelivery delivery,
        CancellationToken cancellationToken = default
    );

    Task<SubmitGameQuizAnswerResult> SubmitQuizAnswerAsync(
        Guid questionSessionId,
        SubmitGameQuizAnswerInput input,
        CancellationToken cancellationToken = default
    );

    Task<CurrentGameQuizState?> GetCurrentQuizStateAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    );

    Task<int> CloseExpiredQuizQuestionSessionsAsync(CancellationToken cancellationToken = default);

    Task<ManualQuizAwardResult> AwardManualQuizPointsAsync(
        ManualQuizAwardInput input,
        Guid awardedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<ManualQuizAwardPlayer>> GetManualQuizAwardPlayersAsync(
        CancellationToken cancellationToken = default
    );
}
