using backend.Application.Contracts;

namespace backend.Application.Abstractions;

public enum UploadDraftGameSetupCellMediaOutcome
{
    Uploaded,
    NoDraft,
    CellNotFound,
    InvalidFile,
    StorageFailed
}

public sealed record UploadDraftGameSetupCellMediaResult(
    UploadDraftGameSetupCellMediaOutcome Outcome,
    GameBoardCellMedia? Media = null
);

public enum DeleteDraftGameSetupCellMediaOutcome
{
    Deleted,
    NoDraft,
    CellNotFound,
    MediaNotFound
}

public sealed record DeleteDraftGameSetupCellMediaResult(DeleteDraftGameSetupCellMediaOutcome Outcome);

public interface IGameSetupCellMediaService
{
    Task<UploadDraftGameSetupCellMediaResult> UploadAsync(
        Guid cellId,
        Stream content,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken = default
    );

    Task<DeleteDraftGameSetupCellMediaResult> DeleteAsync(
        Guid cellId,
        CancellationToken cancellationToken = default
    );
}
