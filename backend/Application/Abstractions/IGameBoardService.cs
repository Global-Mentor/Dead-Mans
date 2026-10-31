using backend.Application.Contracts;

namespace backend.Application.Abstractions;

public interface IGameBoardService
{
    Task<GameBoardSnapshot?> GetCurrentBoardAsync(CancellationToken cancellationToken = default);
    Task<GameTeamQueueResult> GetCurrentTeamQueueAsync(
        CancellationToken cancellationToken = default
    );
    Task<SetActiveGameTeamOutcome> SetActiveTeamAsync(
        Guid? teamId,
        CancellationToken cancellationToken = default
    );
    Task<SetGameTeamPlayedStateOutcome> SetGameTeamPlayedStateAsync(
        Guid teamId,
        bool isPlayed,
        CancellationToken cancellationToken = default
    );
    Task<OpenGameCellErrorCode> TryOpenCellAsync(Guid cellId, CancellationToken cancellationToken = default);
}
