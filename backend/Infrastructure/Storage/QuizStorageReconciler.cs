using System.Text.Json;
using Amazon.S3;
using Amazon.S3.Model;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Storage;

public sealed record QuizStorageReference(string Source, string Id);
public sealed record QuizStorageFinding(string Path, string Kind, IReadOnlyList<QuizStorageReference> References);
public sealed record QuizStorageReconciliationReport(
    string Bucket,
    int ReferencedObjects,
    int ListedObjects,
    IReadOnlyList<QuizStorageFinding> Findings);

// Deliberately exposes no repair/delete operation. A listing and the database cannot share a transaction.
public sealed class QuizStorageReconciler(ApplicationDbContext db, IAmazonS3 storage)
{
    private static readonly string[] Prefixes = ["quiz/screenshots/", "quiz/thumbnails/"];

    public async Task<QuizStorageReconciliationReport> ScanAsync(string bucket, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(bucket);
        var references = new Dictionary<string, List<QuizStorageReference>>(StringComparer.Ordinal);
        var findings = new List<QuizStorageFinding>();

        await foreach (var asset in db.MediaAssets.AsNoTracking()
            .Where(asset => asset.ObjectKey.StartsWith("quiz/screenshots/") || asset.ObjectKey.StartsWith("quiz/thumbnails/"))
            .Select(asset => new { asset.Id, asset.Bucket, asset.ObjectKey }).AsAsyncEnumerable()
            .WithCancellation(cancellationToken))
        {
            AddReference($"{asset.Bucket}/{asset.ObjectKey}", new("media_assets", asset.Id.ToString()));
        }

        await ReadSnapshotsAsync(db.QuestionDefinitions.AsNoTracking()
            .Where(row => row.ImageSnapshotJson != null)
            .Select(row => new SnapshotRow(row.Id, null, row.ImageSnapshotJson!)), "question_definitions");
        await ReadSnapshotsAsync(db.GameEnabledQuestions.AsNoTracking()
            .Where(row => row.ImageSnapshotJson != null)
            .Select(row => new SnapshotRow(row.GameId, row.QuestionId, row.ImageSnapshotJson!)), "game_enabled_questions");
        await ReadSnapshotsAsync(db.GameQuizQuestionSessions.AsNoTracking()
            .Where(row => row.ImageSnapshotJson != null)
            .Select(row => new SnapshotRow(row.Id, null, row.ImageSnapshotJson!)), "game_quiz_question_sessions");
        await ReadSnapshotsAsync(db.TwitchQuizPublications.AsNoTracking()
            .Where(row => row.ImageSnapshotJson != null)
            .Select(row => new SnapshotRow(row.Id, null, row.ImageSnapshotJson!)), "twitch_quiz_publications");

        var listed = new HashSet<string>(StringComparer.Ordinal);
        foreach (var prefix in Prefixes)
        {
            var request = new ListObjectsV2Request { BucketName = bucket, Prefix = prefix };
            var seenTokens = new HashSet<string>(StringComparer.Ordinal);
            do
            {
                var page = await storage.ListObjectsV2Async(request, cancellationToken);
                foreach (var item in page.S3Objects ?? [])
                {
                    if (item.Key is null || !item.Key.StartsWith(prefix, StringComparison.Ordinal))
                    {
                        throw new InvalidOperationException("Object storage returned an object outside the requested prefix.");
                    }

                    var path = $"{bucket}/{item.Key}";
                    listed.Add(path);
                    if (!references.TryGetValue(path, out var sources))
                    {
                        findings.Add(new(path, "unreferenced", []));
                    }
                    else if (item.Size == 0)
                    {
                        findings.Add(new(path, "empty", sources));
                    }
                }

                if (page.IsTruncated != true)
                {
                    break;
                }

                if (string.IsNullOrWhiteSpace(page.NextContinuationToken) || !seenTokens.Add(page.NextContinuationToken))
                {
                    throw new InvalidOperationException("Object storage returned an invalid continuation token.");
                }

                request.ContinuationToken = page.NextContinuationToken;
            } while (true);
        }

        foreach (var (path, sources) in references)
        {
            if (!Prefixes.Any(prefix => path.StartsWith($"{bucket}/{prefix}", StringComparison.Ordinal)))
            {
                findings.Add(new(path, "outside_scan_scope", sources));
            }
            else if (!listed.Contains(path))
            {
                findings.Add(new(path, "missing", sources));
            }
        }

        return new(bucket, references.Count, listed.Count,
            findings.OrderBy(finding => finding.Kind, StringComparer.Ordinal)
                .ThenBy(finding => finding.Path, StringComparer.Ordinal).ToArray());

        void AddReference(string path, QuizStorageReference source)
        {
            if (!references.TryGetValue(path, out var sources))
            {
                references[path] = sources = [];
            }

            sources.Add(source);
        }

        async Task ReadSnapshotsAsync(IQueryable<SnapshotRow> query, string source)
        {
            await foreach (var row in query.AsAsyncEnumerable().WithCancellation(cancellationToken))
            {
                var id = row.SecondId is { } second ? $"{row.Id}/{second}" : row.Id.ToString();
                var reference = new QuizStorageReference(source, id);
                try
                {
                    using var document = JsonDocument.Parse(row.Json);
                    var root = document.RootElement;
                    if (root.ValueKind != JsonValueKind.Object
                        || !root.TryGetProperty("MediaPath", out var mediaPath)
                        || mediaPath.ValueKind != JsonValueKind.String
                        || string.IsNullOrWhiteSpace(mediaPath.GetString()))
                    {
                        findings.Add(new(string.Empty, "invalid_snapshot", [reference]));
                        continue;
                    }

                    AddReference(mediaPath.GetString()!, reference);
                    if (root.TryGetProperty("ThumbnailPath", out var thumbnail) && thumbnail.ValueKind != JsonValueKind.Null)
                    {
                        if (thumbnail.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(thumbnail.GetString()))
                        {
                            AddReference(thumbnail.GetString()!, reference);
                        }
                        else
                        {
                            findings.Add(new(string.Empty, "invalid_snapshot", [reference]));
                        }
                    }
                }
                catch (JsonException)
                {
                    findings.Add(new(string.Empty, "invalid_snapshot", [reference]));
                }
            }
        }
    }

    private sealed record SnapshotRow(Guid Id, Guid? SecondId, string Json);
}
