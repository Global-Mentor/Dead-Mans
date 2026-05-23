namespace backend.Application.Abstractions;

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

public interface IGameLifecycleService
{
    Task<GameLifecycleResult> OpenRegistrationAsync(CancellationToken cancellationToken = default);

    Task<GameLifecycleResult> StartGameAsync(CancellationToken cancellationToken = default);

    Task<GameLifecycleResult> FinishGameAsync(CancellationToken cancellationToken = default);
}
