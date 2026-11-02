using backend.Application.Contracts;

namespace backend.Application.Abstractions.Repositories;

public interface IGameOverlayRepository
{
    Task ReplaceKeyAsync(Guid ownerId, string hash, string key, CancellationToken cancellationToken);
    Task<string?> ReadKeyAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<GameOverlayLeaderboardState?> ReadLeaderboardStateAsync(Guid gameId, CancellationToken cancellationToken);
    Task<GameOverlayLeaderboardState?> SetLeaderboardStateAsync(Guid gameId, bool enabled, CancellationToken cancellationToken, int? page = null, string kind = "teams");
    Task RevokeKeyAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<bool> ValidateKeyAsync(string hash, CancellationToken cancellationToken);
    Task<GameOverlayTestState> ReadTestStateAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<GameOverlayTestState> SetTestEnabledAsync(Guid ownerId, bool enabled, CancellationToken cancellationToken);
    Task<bool> IsTestEnabledAsync(string hash, CancellationToken cancellationToken);
    Task<GameOverlaySnapshot> ReadAsync(CancellationToken cancellationToken);
}
