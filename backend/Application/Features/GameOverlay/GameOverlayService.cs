using System.Security.Cryptography;
using System.Text;
using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Application.Abstractions.Realtime;
using backend.Application.Realtime;

namespace backend.Application.Features.GameOverlay;

public sealed class GameOverlayService(IGameOverlayRepository repository,
    IGameBoardEventsPublisher eventsPublisher, ILogger<GameOverlayService> logger) : IGameOverlayService
{
    public async Task<string> RotateKeyAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var key = Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(32));
        await repository.ReplaceKeyAsync(ownerId, Hash(key), cancellationToken);
        return key;
    }

    public Task RevokeKeyAsync(Guid ownerId, CancellationToken cancellationToken) =>
        repository.RevokeKeyAsync(ownerId, cancellationToken);

    public async Task<GameOverlaySnapshot> ReadAsync(string key, CancellationToken cancellationToken) =>
        await repository.IsTestEnabledAsync(Hash(key), cancellationToken)
            ? new GameOverlaySnapshot(null, "test", null, null)
            : await repository.ReadAsync(cancellationToken);

    public Task<GameOverlayTestState> ReadTestStateAsync(Guid ownerId, CancellationToken cancellationToken) =>
        repository.ReadTestStateAsync(ownerId, cancellationToken);

    public async Task<GameOverlayTestState> SetTestEnabledAsync(Guid ownerId, bool enabled, CancellationToken cancellationToken)
    {
        var state = await repository.SetTestEnabledAsync(ownerId, enabled, cancellationToken);
        if (state.HasKey)
        {
            await RealtimePublishGuard.TryPublishAsync(eventsPublisher.PublishOverlayFrameChangedAsync,
                logger, "Failed to publish overlay test state change.");
        }
        return state;
    }

    public Task<bool> ValidateKeyAsync(string key, CancellationToken cancellationToken) =>
        IsValidFormat(key) ? repository.ValidateKeyAsync(Hash(key), cancellationToken) : Task.FromResult(false);

    private static bool IsValidFormat(string key) =>
        key.Length == 64 && key.All(char.IsAsciiHexDigitLower);

    private static string Hash(string key) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(key)));
}
