using backend.Application.Contracts;

namespace backend.Application.Abstractions.Repositories;

public interface IGameRoundRepository
{
    Task<PreviewGameRoundScoreResult> BroadcastSummaryAsync(Guid roundId,
        BroadcastGameRoundSummaryInput input, Guid userId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<GameRoundTeamOption>> GetEligibleTeamsAsync(
        CancellationToken cancellationToken = default
    );

    Task<GameRoundDetails?> GetActiveAsync(CancellationToken cancellationToken = default);

    Task<StartGameRoundResult> StartAsync(
        StartGameRoundInput input,
        Guid startedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<TransitionGameRoundResult> StartModifierOrderingAsync(
        Guid roundId,
        GameRoundVersionCommandInput input,
        Guid initiatedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<TransitionGameRoundResult> FinishPresentationAsync(
        Guid roundId,
        GameRoundVersionCommandInput input,
        Guid initiatedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<TransitionGameRoundResult> ReviewAsync(
        Guid roundId,
        GameRoundVersionCommandInput input,
        Guid reviewedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<TransitionGameRoundResult> PrepareAsync(
        Guid roundId,
        GameRoundVersionCommandInput input,
        Guid initiatedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<TransitionGameRoundResult> CompletePreparationAsync(
        Guid roundId,
        GameRoundVersionCommandInput input,
        Guid initiatedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<TransitionGameRoundResult> BeginGameplayAsync(
        Guid roundId,
        GameRoundVersionCommandInput input,
        Guid initiatedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<TransitionGameRoundResult> ResumeGameplayAsync(
        Guid roundId,
        GameRoundVersionCommandInput input,
        Guid initiatedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<TransitionGameRoundResult> RebuildAsync(
        Guid roundId,
        GameRoundVersionCommandInput input,
        Guid initiatedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<TransitionGameRoundResult> TechnicalCancelAsync(
        Guid roundId,
        TechnicalCancelGameRoundInput input,
        Guid initiatedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<FinalizeGameRoundResult> FinalizeAsync(
        Guid roundId,
        FinalizeGameRoundInput input,
        Guid resolvedByUserId,
        CancellationToken cancellationToken = default
    );

    Task<PreviewGameRoundScoreResult> PreviewScoreAsync(
        Guid roundId,
        FinalizeGameRoundInput input,
        Guid resolvedByUserId,
        CancellationToken cancellationToken = default
    );
}
