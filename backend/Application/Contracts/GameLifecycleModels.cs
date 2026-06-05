namespace backend.Application.Contracts;

public sealed record DraftGameLifecycleContext(
    Guid GameId,
    short MinPlayersPerTeam,
    short MaxPlayersPerTeam
);

public enum GameLifecycleErrorCode
{
    None,
    DraftNotFound,
    ReadyGameAlreadyExists,
    ActiveGameAlreadyExists,
    GameNotReady,
    GameNotActive,
    NoParticipationSlots,
    InvalidTeamSizeLimits,
}

public sealed record GameLifecycleResult(bool Success, Guid? GameId, GameLifecycleErrorCode Error);
