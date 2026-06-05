using backend.Application.Contracts;

namespace backend.Application.Abstractions.Repositories;

public interface IGameBoardRepository
{
    Task<GameBoardSnapshot?> GetLatestBoardByStatusAsync(
        string status,
        CancellationToken cancellationToken = default
    );

    Task<OpenGameCellResult?> TryOpenCellAsync(Guid cellId, CancellationToken cancellationToken = default);
}
