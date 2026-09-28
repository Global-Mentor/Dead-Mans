using backend.Application.Abstractions;
using backend.Application.Contracts;

namespace backend.Application.Abstractions.Repositories;

public enum SubmitQuizAnswerRepositoryOutcome
{
    Accepted,
    Existing,
    AlreadyAnswered,
    QuestionSessionNotFound,
    QuestionSessionClosed,
    OptionNotFound,
    PlayerNotFound
}

public sealed record SubmitQuizAnswerRepositoryResult(
    SubmitQuizAnswerRepositoryOutcome Outcome,
    GameQuizSubmissionReceipt? Receipt = null,
    Guid? ClosedGameId = null
);

public sealed record CloseExpiredQuizQuestionSessionsResult(
    IReadOnlyList<Guid> ClosedGameIds,
    int ClosedQuizQuestionCount
);

public enum AskQuizQuestionRepositoryOutcome
{
    Asked,
    Unavailable,
    ModifierOrderingActive
}

public sealed record AskQuizQuestionRepositoryResult(
    AskQuizQuestionRepositoryOutcome Outcome,
    AskedQuizQuestion? Question = null
);

public interface IGameQuizRepository
{
    Task<Guid?> GetActiveGameIdAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AvailableGameQuizQuestion>> GetAvailableQuizQuestionsAsync(
        CancellationToken cancellationToken = default
    );

    Task<AskQuizQuestionRepositoryResult> AskQuizQuestionAsync(
        Guid gameId,
        Guid? questionId,
        GameQuizQuestionDelivery delivery,
        CancellationToken cancellationToken = default
    );

    Task<SubmitQuizAnswerRepositoryResult> SubmitQuizAnswerAsync(
        Guid questionSessionId,
        SubmitGameQuizAnswerInput input,
        CancellationToken cancellationToken = default
    );

    Task<CurrentGameQuizState?> GetCurrentQuizStateAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    );

    Task<CloseExpiredQuizQuestionSessionsResult> CloseExpiredQuizQuestionSessionsAsync(
        CancellationToken cancellationToken = default
    );

    Task<ManualQuizAwardResult> AwardManualQuizPointsAsync(
        ManualQuizAwardInput input,
        Guid awardedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<ManualQuizAwardPlayer>> GetManualQuizAwardPlayersAsync(
        CancellationToken cancellationToken = default
    );
}
