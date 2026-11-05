using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using backend.Data;
using backend.Data.Entities;
using backend.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Unit.Infrastructure.Storage;

public sealed class QuizStorageReconcilerTests
{
    [Fact]
    public async Task ScanAsync_PreservesEveryHistoricalSourceAndThumbnailAcrossPages()
    {
        await using var db = CreateDb();
        db.QuestionDefinitions.Add(new QuestionDefinition { Id = Guid.NewGuid(), IsDeleted = true, ImageSnapshotJson = Snapshot("archived") });
        db.GameEnabledQuestions.Add(new GameEnabledQuestion { GameId = Guid.NewGuid(), QuestionId = Guid.NewGuid(), ImageSnapshotJson = Snapshot("published") });
        db.GameQuizQuestionSessions.Add(new GameQuizQuestionSession { Id = Guid.NewGuid(), Status = "closed", ImageSnapshotJson = Snapshot("history", "thumbnail") });
        db.TwitchQuizPublications.Add(new TwitchQuizPublication { Id = Guid.NewGuid(), Status = "failed", ImageSnapshotJson = Snapshot("twitch") });
        db.MediaAssets.Add(new MediaAsset { Id = Guid.NewGuid(), Bucket = "test", ObjectKey = "quiz/screenshots/asset", MimeType = "image/png", SizeBytes = 1 });
        await db.SaveChangesAsync();
        using var storage = new ListingClient([
            Page(true, "page-2", "quiz/screenshots/archived", "quiz/screenshots/published"),
            Page(false, null, "quiz/screenshots/history", "quiz/screenshots/twitch", "quiz/screenshots/asset", "quiz/screenshots/unlinked"),
            Page(false, null, "quiz/thumbnails/thumbnail")
        ]);

        var report = await new QuizStorageReconciler(db, storage).ScanAsync("test");

        Assert.Equal(6, report.ReferencedObjects);
        Assert.Equal(7, report.ListedObjects);
        var finding = Assert.Single(report.Findings);
        Assert.Equal("unreferenced", finding.Kind);
        Assert.Equal("test/quiz/screenshots/unlinked", finding.Path);
        Assert.Equal([null, "page-2", null], storage.Tokens);
        Assert.Equal(["quiz/screenshots/", "quiz/screenshots/", "quiz/thumbnails/"], storage.Prefixes);
    }

    [Fact]
    public async Task ScanAsync_ReportsMissingHistoricalMediaAndMalformedSnapshotsWithoutGuessing()
    {
        await using var db = CreateDb();
        var sessionId = Guid.NewGuid();
        db.GameQuizQuestionSessions.Add(new GameQuizQuestionSession { Id = sessionId, ImageSnapshotJson = Snapshot("missing", "missing-thumb") });
        db.QuestionDefinitions.AddRange(
            new QuestionDefinition { Id = Guid.NewGuid(), ImageSnapshotJson = "not json" },
            new QuestionDefinition { Id = Guid.NewGuid(), ImageSnapshotJson = "{\"MediaPath\":\"other/quiz/screenshots/image\"}" });
        await db.SaveChangesAsync();
        using var storage = new ListingClient([Page(false, null), Page(false, null)]);

        var report = await new QuizStorageReconciler(db, storage).ScanAsync("test");

        Assert.Equal(2, report.Findings.Count(finding => finding.Kind == "missing"));
        Assert.All(report.Findings.Where(finding => finding.Kind == "missing"), finding =>
        {
            var reference = Assert.Single(finding.References);
            Assert.Equal("game_quiz_question_sessions", reference.Source);
            Assert.Equal(sessionId.ToString(), reference.Id);
        });
        Assert.Single(report.Findings, finding => finding.Kind == "invalid_snapshot");
        Assert.Single(report.Findings, finding => finding.Kind == "outside_scan_scope");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("repeated")]
    public async Task ScanAsync_RejectsIncompleteOrLoopingListings(string? token)
    {
        await using var db = CreateDb();
        using var storage = new ListingClient([Page(true, token), Page(true, token)]);

        await Assert.ThrowsAsync<InvalidOperationException>(() => new QuizStorageReconciler(db, storage).ScanAsync("test"));
    }

    private static ApplicationDbContext CreateDb() => new(new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static string Snapshot(string name, string? thumbnail = null) =>
        System.Text.Json.JsonSerializer.Serialize(new
        {
            MediaPath = $"test/quiz/screenshots/{name}",
            ThumbnailPath = thumbnail is null ? null : $"test/quiz/thumbnails/{thumbnail}"
        });

    private static ListObjectsV2Response Page(bool truncated, string? token, params string[] keys) => new()
    {
        IsTruncated = truncated,
        NextContinuationToken = token,
        S3Objects = keys.Select(key => new S3Object { Key = key, Size = 10 }).ToList()
    };

    private sealed class ListingClient(Queue<ListObjectsV2Response> pages) : AmazonS3Client(
        new AnonymousAWSCredentials(), new AmazonS3Config { ServiceURL = "http://localhost:1", ForcePathStyle = true })
    {
        public ListingClient(ListObjectsV2Response[] pages) : this(new Queue<ListObjectsV2Response>(pages)) { }
        public List<string?> Tokens { get; } = [];
        public List<string> Prefixes { get; } = [];

        public override Task<ListObjectsV2Response> ListObjectsV2Async(ListObjectsV2Request request, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Tokens.Add(request.ContinuationToken);
            Prefixes.Add(request.Prefix);
            return Task.FromResult(pages.Dequeue());
        }

        public override Task<PutObjectResponse> PutObjectAsync(PutObjectRequest request, CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("The diagnostic must not write objects.");

        public override Task<DeleteObjectResponse> DeleteObjectAsync(DeleteObjectRequest request, CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("The diagnostic must not delete objects.");

        public override Task<DeleteObjectsResponse> DeleteObjectsAsync(DeleteObjectsRequest request, CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("The diagnostic must not delete objects.");
    }
}
