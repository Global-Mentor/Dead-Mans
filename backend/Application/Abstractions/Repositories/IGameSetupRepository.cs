using backend.Application.Contracts;

namespace backend.Application.Abstractions.Repositories;

public interface IGameSetupRepository
{
    Task<GameBoardSnapshot?> GetLatestDraftSetupSnapshotAsync(
        CancellationToken cancellationToken = default
    );

    Task<bool> DraftGameExistsAsync(CancellationToken cancellationToken = default);

    Task<GameBoardSnapshot?> CreateDraftSetupAsync(
        string title,
        CancellationToken cancellationToken = default
    );

    Task<UpdateDraftSetupRepositoryResult> UpdateDraftSetupAsync(
        GameSetupDraftUpdate update,
        CancellationToken cancellationToken = default
    );
    Task<Guid?> DeleteDraftSetupAsync(CancellationToken cancellationToken = default);
}
