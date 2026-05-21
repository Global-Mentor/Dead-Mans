using backend.Infrastructure.Storage;

namespace Backend.Tests.Unit.Infrastructure.Storage;

public sealed class InMemoryObjectStorageTests
{
    [Fact]
    public async Task DeleteObjectsByPrefixAsync_RemovesOnlyMatchingKeys()
    {
        var storage = new InMemoryObjectStorage();
        await storage.PutObjectAsync("bucket", "games/a/cards/1-1.png", new MemoryStream([1]), "image/png");
        await storage.PutObjectAsync("bucket", "games/b/cards/1-1.png", new MemoryStream([2]), "image/png");
        await storage.PutObjectAsync("bucket", "other/a.png", new MemoryStream([3]), "image/png");

        await storage.DeleteObjectsByPrefixAsync("bucket", "games/a/");

        Assert.Empty(storage.ListObjectKeys("bucket", "games/a/"));
        Assert.Single(storage.ListObjectKeys("bucket", "games/b/"));
        Assert.Single(storage.ListObjectKeys("bucket", "other/"));
    }
}
