namespace backend.Application.Contracts;

public enum UpdateDraftSetupRepositoryStatus
{
    Updated,
    NotFound,
    StaleVersion,
}

public sealed record UpdateDraftSetupRepositoryResult(
    UpdateDraftSetupRepositoryStatus Status,
    GameBoardSnapshot? Snapshot = null
);
