namespace backend.Application.Contracts;

public enum UpdateDraftSetupRepositoryStatus
{
    Updated,
    NotFound,
    StaleVersion,
    InvalidEnabledQuestions,
}

public sealed record UpdateDraftSetupRepositoryResult(
    UpdateDraftSetupRepositoryStatus Status,
    GameBoardSnapshot? Snapshot = null
);
