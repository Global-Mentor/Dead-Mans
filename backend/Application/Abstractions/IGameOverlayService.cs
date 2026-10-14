using backend.Application.Contracts;

namespace backend.Application.Abstractions;

public interface IGameOverlayService
{
    Task<string> RotateKeyAsync(Guid ownerId, CancellationToken cancellationToken);
    Task RevokeKeyAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<bool> ValidateKeyAsync(string key, CancellationToken cancellationToken);
    Task<GameOverlaySnapshot> ReadAsync(CancellationToken cancellationToken);
}
