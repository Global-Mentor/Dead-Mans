using backend.Application.Contracts;

namespace backend.Application.Abstractions;

public interface IGameOverlayService
{
    Task<string> RotateKeyAsync(Guid ownerId, CancellationToken cancellationToken);
    Task RevokeKeyAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<bool> ValidateKeyAsync(string key, CancellationToken cancellationToken);
    Task<GameOverlaySnapshot> ReadAsync(string key, CancellationToken cancellationToken);
    Task<GameOverlayTestState> ReadTestStateAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<GameOverlayTestState> SetTestEnabledAsync(Guid ownerId, bool enabled, CancellationToken cancellationToken);
}
