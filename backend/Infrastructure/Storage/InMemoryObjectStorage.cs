using System.Collections.Concurrent;
using backend.Application.Abstractions;

namespace backend.Infrastructure.Storage;

public sealed class InMemoryObjectStorage : IObjectStorage
{
    private readonly ConcurrentDictionary<string, byte[]> _objects = new(StringComparer.Ordinal);

    public Task PutObjectAsync(
        string bucketName,
        string objectKey,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default
    )
    {
        using var memory = new MemoryStream();
        content.CopyTo(memory);
        _objects[$"{bucketName}/{objectKey}"] = memory.ToArray();
        return Task.CompletedTask;
    }

    public Task DeleteObjectAsync(
        string bucketName,
        string objectKey,
        CancellationToken cancellationToken = default
    )
    {
        _objects.TryRemove($"{bucketName}/{objectKey}", out _);
        return Task.CompletedTask;
    }

    public Task DeleteObjectsByPrefixAsync(
        string bucketName,
        string keyPrefix,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(keyPrefix))
        {
            throw new ArgumentException("Object key prefix is required.", nameof(keyPrefix));
        }

        var storagePrefix = BuildStoragePrefix(bucketName, keyPrefix);
        foreach (var key in _objects.Keys.Where(key => key.StartsWith(storagePrefix, StringComparison.Ordinal)).ToArray())
        {
            _objects.TryRemove(key, out _);
        }

        return Task.CompletedTask;
    }

    internal IReadOnlyList<string> ListObjectKeys(string bucketName, string? keyPrefix = null)
    {
        var storagePrefix = string.IsNullOrWhiteSpace(keyPrefix)
            ? $"{bucketName}/"
            : BuildStoragePrefix(bucketName, keyPrefix);

        return _objects.Keys
            .Where(key => key.StartsWith(storagePrefix, StringComparison.Ordinal))
            .Select(key => key[(bucketName.Length + 1)..])
            .ToArray();
    }

    private static string BuildStoragePrefix(string bucketName, string keyPrefix)
    {
        return $"{bucketName}/{keyPrefix.TrimStart('/')}";
    }
}
