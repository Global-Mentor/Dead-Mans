using backend.Application.Contracts;

namespace backend.Application.Abstractions.Repositories;

public sealed record GameSetupDraftCellRef(
    Guid GameId,
    Guid BoardId,
    Guid CellId,
    int RowIndex,
    int ColIndex
);

public sealed record StoredCellMedia(Guid MediaAssetId, string Bucket, string ObjectKey);

public interface IGameSetupCellMediaRepository
{
    Task<GameSetupDraftCellRef?> FindDraftCellAsync(Guid cellId, CancellationToken cancellationToken = default);

    Task<StoredCellMedia?> GetCellMediaAsync(Guid cellId, CancellationToken cancellationToken = default);

    Task<GameBoardCellMedia> AttachMediaAsync(
        Guid cellId,
        Guid mediaAssetId,
        string bucket,
        string objectKey,
        string mimeType,
        long sizeBytes,
        string publicBaseUrl,
        CancellationToken cancellationToken = default
    );

    Task<StoredCellMedia?> DetachMediaAsync(Guid cellId, CancellationToken cancellationToken = default);
}
