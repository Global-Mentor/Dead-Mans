using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Configuration;
using backend.Application.Contracts;
using backend.Application.Media;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Questions;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Infrastructure.Persistence;

public sealed class DbQuizScreenshotRepository(ApplicationDbContext db, IObjectStorage storage,
    IOptions<MediaStorageSettings> settings, TimeProvider clock, ILogger<DbQuizScreenshotRepository> logger) : IQuizScreenshotRepository
{
    public async Task<IReadOnlyList<HuntMapItem>> GetMapsAsync(CancellationToken cancellationToken = default)
    {
        var maps = await db.HuntMaps.AsNoTracking().Where(x => x.IsEnabled)
            .Include(x => x.Translations).Include(x => x.Locations.Where(location => location.IsEnabled))
            .ThenInclude(x => x.Translations).AsSplitQuery().OrderBy(x => x.Code).ToArrayAsync(cancellationToken);
        return maps.Select(map => new HuntMapItem(map.Id, map.Code,
            map.Translations.ToDictionary(x => x.Locale, x => x.Name),
            map.Locations.OrderBy(x => x.Code).Select(location => new HuntLocationItem(location.Id, location.Code,
                location.Translations.ToDictionary(x => x.Locale, x => x.Name))).ToArray())).ToArray();
    }

    public async Task<UploadQuizScreenshotResult> CreateAsync(UploadQuizScreenshotInput input, Stream content,
        string contentType, long length, string fingerprint, CancellationToken cancellationToken = default)
    {
        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(cancellationToken) : null;
        if (transaction is not null)
            await db.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT pg_advisory_xact_lock(hashtextextended({input.RequestId.ToString()}, 0))", cancellationToken);
        var previous = await db.Set<QuestionScreenshot>().AsNoTracking()
            .SingleOrDefaultAsync(x => x.UploadRequestId == input.RequestId, cancellationToken);
        if (previous is not null)
            return previous.UploadFingerprint == fingerprint
                ? new(UploadQuizScreenshotOutcome.Existing, previous.QuestionId)
                : new(UploadQuizScreenshotOutcome.RequestConflict);

        var maps = await GetMapsAsync(cancellationToken);
        var map = maps.SingleOrDefault(x => x.Locations.Any(location => location.Id == input.LocationId));
        if (map is null || map.Locations.Count < 6
            || !await db.QuestionCategories.AnyAsync(x => x.Id == input.CategoryId && x.Format == "screenshot", cancellationToken))
            return new(UploadQuizScreenshotOutcome.InvalidSelection);
        var correct = map.Locations.Single(x => x.Id == input.LocationId);
        var distractors = map.Locations.Where(x => x.Id != correct.Id).ToArray();
        Random.Shared.Shuffle(distractors);
        var locations = new[] { correct }.Concat(distractors.Take(5)).ToArray();
        string[] locales = ["en", "ru", "uk", "pl"];
        if (locales.Any(locale => !map.Names.ContainsKey(locale)
            || locations.Any(location => !location.Names.ContainsKey(locale))))
            return new(UploadQuizScreenshotOutcome.InvalidSelection);
        if (!TwitchQuizMessageFormatter.FormatForValidation(input.Text,
                locations.Select(location => location.Names["ru"]).ToArray(), 3600, input.Reward).IsCompatible)
            return new(UploadQuizScreenshotOutcome.InvalidSelection);

        var now = clock.GetUtcNow().UtcDateTime;
        var questionId = Guid.NewGuid();
        var mediaId = Guid.NewGuid();
        var asset = new MediaAsset
        {
            Id = mediaId,
            Bucket = settings.Value.BucketName,
            ObjectKey = $"quiz/screenshots/{mediaId:N}{ImageUploadValidator.ResolveExtension(contentType)}",
            MimeType = contentType,
            SizeBytes = length,
            CreatedAtUtc = now
        };
        var options = locations.Select((location, index) => new QuestionOption
        {
            Id = Guid.NewGuid(),
            QuestionId = questionId,
            Text = location.Names["ru"],
            NormalizedText = QuestionAnswerNormalizer.Normalize(location.Names["ru"]),
            IsCorrect = location.Id == correct.Id,
            SortOrder = index,
            CreatedAtUtc = now
        }).ToArray();
        var image = new QuizImageSnapshot(mediaId, $"{asset.Bucket}/{asset.ObjectKey}", map.Names,
            options.Select((option, index) => (option.Id, locations[index].Names)).ToDictionary(x => x.Id, x => x.Names));
        var question = new QuestionDefinition
        {
            Id = questionId,
            ExternalCode = $"s_{questionId:N}",
            CategoryId = input.CategoryId,
            Text = input.Text,
            Reward = input.Reward,
            Priority = input.Priority,
            IsEnabled = input.IsEnabled,
            Revision = 1,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            Options = options,
            ImageSnapshotJson = image.ToJson()
        };
        // Use opaque, unique storage keys. A retry never overwrites another question's object.
        await storage.PutObjectAsync(asset.Bucket, asset.ObjectKey, content, contentType, cancellationToken);
        db.MediaAssets.Add(asset);
        db.QuestionDefinitions.Add(question);
        db.Set<QuestionScreenshot>().Add(new QuestionScreenshot
        {
            QuestionId = questionId,
            LocationId = correct.Id,
            MediaAssetId = mediaId,
            UploadRequestId = input.RequestId,
            UploadFingerprint = fingerprint
        });
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // Commit has not started, so this unique object cannot belong to a committed question.
            try { await storage.DeleteObjectAsync(asset.Bucket, asset.ObjectKey, CancellationToken.None); }
            catch (Exception cleanupError)
            {
                logger.LogError(cleanupError, "Failed to remove uncommitted quiz screenshot asset {AssetId}.", mediaId);
            }
            throw;
        }
        // Preserve the object if commit has an uncertain outcome; the same request can safely retry.
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return new(UploadQuizScreenshotOutcome.Created, questionId);
    }
}
