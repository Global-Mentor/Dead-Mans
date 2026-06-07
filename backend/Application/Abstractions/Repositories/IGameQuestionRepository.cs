using backend.Application.Contracts;

namespace backend.Application.Abstractions.Repositories;

public interface IGameQuestionRepository
{
    Task<IReadOnlyList<GameQuestionCatalogItem>> GetCatalogAsync(
        string? vectorCode,
        string? category,
        string? search,
        bool includeDisabled,
        CancellationToken cancellationToken = default
    );

    Task<bool> SetQuestionEnabledAsync(
        Guid questionId,
        bool isEnabled,
        CancellationToken cancellationToken = default
    );

    Task<int> SetCategoryEnabledAsync(
        string? vectorCode,
        string category,
        bool isEnabled,
        CancellationToken cancellationToken = default
    );

    Task<Guid?> GetActiveGameIdAsync(CancellationToken cancellationToken = default);

    Task<AskedGameQuestion?> AskNextQuestionAsync(
        Guid gameId,
        Guid? askedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<GameQuestionRoundSummary?> AnswerRoundAsync(
        Guid roundId,
        Guid? answeredByUserId,
        string? answeredByDisplayName,
        string submittedAnswer,
        CancellationToken cancellationToken = default
    );

    Task<GameQuestionRoundSummary?> GetRoundAsync(
        Guid roundId,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<GameQuestionRoundSummary>> GetGameHistoryAsync(
        Guid gameId,
        CancellationToken cancellationToken = default
    );
}
