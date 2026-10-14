using System.Security.Cryptography;
using System.Text;
using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;

namespace backend.Application.Features.GameOverlay;

public sealed class GameOverlayService(IGameOverlayRepository repository) : IGameOverlayService
{
    public async Task<string> RotateKeyAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var key = Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(32));
        await repository.ReplaceKeyAsync(ownerId, Hash(key), cancellationToken);
        return key;
    }

    public Task RevokeKeyAsync(Guid ownerId, CancellationToken cancellationToken) =>
        repository.RevokeKeyAsync(ownerId, cancellationToken);

    public Task<GameOverlaySnapshot> ReadAsync(CancellationToken cancellationToken) =>
        repository.ReadAsync(cancellationToken);

    public Task<bool> ValidateKeyAsync(string key, CancellationToken cancellationToken) =>
        IsValidFormat(key) ? repository.ValidateKeyAsync(Hash(key), cancellationToken) : Task.FromResult(false);

    private static bool IsValidFormat(string key) =>
        key.Length == 64 && key.All(char.IsAsciiHexDigitLower);

    private static string Hash(string key) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(key)));
}
