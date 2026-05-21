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
}
