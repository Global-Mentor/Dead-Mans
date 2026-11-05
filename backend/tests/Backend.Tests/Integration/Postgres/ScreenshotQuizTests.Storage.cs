using backend.Application.Abstractions;
using backend.Application.Contracts;
using backend.Application.Features.GameQuestions;
using backend.Data.Entities;
using backend.Domain.Questions;
using backend.Infrastructure.Persistence;
using backend.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class ScreenshotQuizTests
{
    [Theory]
    [InlineData("quiz/screenshots/")]
    [InlineData("quiz/thumbnails/")]
    public async Task StorageWriteFailureAfterRemoteSuccessCleansObjectsAndAllowsSameRequestRetry(string failingPrefix)
    {
        var storage = new FailAfterWriteStorage(failingPrefix);
        UploadQuizScreenshotInput input;
        await using (var db = database.CreateDbContext())
        {
            input = await ManualInputAsync(db);
            var service = new QuizScreenshotService(new DbQuizScreenshotRepository(db, storage,
                Options.Create(Storage), TimeProvider.System, NullLogger<DbQuizScreenshotRepository>.Instance));

            await Assert.ThrowsAsync<IOException>(() => UploadAsync(service, input));
        }

        Assert.Empty(storage.Objects.ListObjectKeys(Storage.BucketName));
        Assert.Equal(2, storage.DeletedKeys.Count);
        await using (var verify = database.CreateDbContext())
        {
            Assert.False(await verify.Set<QuestionScreenshot>().AnyAsync(row => row.UploadRequestId == input.RequestId));
            Assert.False(await verify.QuestionDefinitions.AnyAsync(row => row.CategoryId == input.CategoryId));
            Assert.False(await verify.MediaAssets.AnyAsync(row => storage.WrittenKeys.Contains(row.ObjectKey)));
        }

        await using var retryDb = database.CreateDbContext();
        var retryService = new QuizScreenshotService(new DbQuizScreenshotRepository(retryDb, storage,
            Options.Create(Storage), TimeProvider.System, NullLogger<DbQuizScreenshotRepository>.Instance));
        var retry = await UploadAsync(retryService, input);
        Assert.Equal(UploadQuizScreenshotOutcome.Created, retry.Outcome);
        Assert.Equal(retry.QuestionId, (await UploadAsync(retryService, input)).QuestionId);
        Assert.Equal(2, storage.Objects.ListObjectKeys(Storage.BucketName).Count);
        var snapshot = QuizImageSnapshot.FromJson(await retryDb.QuestionDefinitions
            .Where(row => row.Id == retry.QuestionId).Select(row => row.ImageSnapshotJson).SingleAsync())!;
        Assert.NotNull(snapshot.ThumbnailPath);
        Assert.Contains(snapshot.MediaPath[(Storage.BucketName.Length + 1)..], storage.Objects.ListObjectKeys(Storage.BucketName));
        Assert.Contains(snapshot.ThumbnailPath[(Storage.BucketName.Length + 1)..], storage.Objects.ListObjectKeys(Storage.BucketName));
        Assert.Equal(1, await retryDb.Set<QuestionScreenshot>().CountAsync(row => row.UploadRequestId == input.RequestId));
    }

    private sealed class FailAfterWriteStorage(string failingPrefix) : IObjectStorage
    {
        private bool _failed;
        public InMemoryObjectStorage Objects { get; } = new();
        public List<string> WrittenKeys { get; } = [];
        public List<string> DeletedKeys { get; } = [];

        public async Task PutObjectAsync(string bucketName, string objectKey, Stream content, string contentType,
            CancellationToken cancellationToken = default)
        {
            await Objects.PutObjectAsync(bucketName, objectKey, content, contentType, cancellationToken);
            WrittenKeys.Add(objectKey);
            if (!_failed && objectKey.StartsWith(failingPrefix, StringComparison.Ordinal))
            {
                _failed = true;
                throw new IOException("Storage acknowledged the write remotely but the connection failed.");
            }
        }

        public Task DeleteObjectAsync(string bucketName, string objectKey, CancellationToken cancellationToken = default)
        {
            DeletedKeys.Add(objectKey);
            return Objects.DeleteObjectAsync(bucketName, objectKey, cancellationToken);
        }

        public Task DeleteObjectsByPrefixAsync(string bucketName, string keyPrefix, CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("Failure recovery must only delete the two unique upload objects.");
    }
}
