using backend.Application.Contracts;

namespace backend.Application.Abstractions;

public interface IGameLifecycleService
{
    Task<GameLifecycleResult> OpenRegistrationAsync(CancellationToken cancellationToken = default);

    Task<GameLifecycleResult> StartGameAsync(CancellationToken cancellationToken = default);

    Task<GameLifecycleResult> FinishGameAsync(CancellationToken cancellationToken = default);

    Task<GameLifecycleResult> ArchiveGameAsync(
        Guid gameId,
        CancellationToken cancellationToken = default
    );
}
