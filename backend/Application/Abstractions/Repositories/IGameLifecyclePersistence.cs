using backend.Application.Abstractions;

namespace backend.Application.Abstractions.Repositories;

public interface IGameLifecyclePersistence
{
    Task<GameLifecycleResult> OpenRegistrationAsync(
        Guid draftGameId,
        CancellationToken cancellationToken = default
    );

    Task<GameLifecycleResult> StartGameAsync(
        Guid readyGameId,
        CancellationToken cancellationToken = default
    );

    Task<GameLifecycleResult> FinishGameAsync(
        Guid activeGameId,
        CancellationToken cancellationToken = default
    );
}
