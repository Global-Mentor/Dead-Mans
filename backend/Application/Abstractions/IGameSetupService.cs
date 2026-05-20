using backend.Application.Contracts;

namespace backend.Application.Abstractions;

public enum CreateDraftGameSetupOutcome
{
    Created,
    DraftAlreadyExists,
    InvalidTitle
}

public sealed record CreateDraftGameSetupResult(
    CreateDraftGameSetupOutcome Outcome,
    GameBoardSnapshot? Snapshot = null
);

public interface IGameSetupService
{
    Task<GameBoardSnapshot?> GetDraftSetupAsync(CancellationToken cancellationToken = default);

    Task<CreateDraftGameSetupResult> CreateDraftSetupAsync(
        string title,
        CancellationToken cancellationToken = default
    );
}
