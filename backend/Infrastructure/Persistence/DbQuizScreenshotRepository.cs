using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Configuration;
using backend.Application.Contracts;
using backend.Application.Media;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Questions;
using backend.Domain.Persistence;
using backend.Infrastructure.Storage;
using backend.Messaging;
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

    public async Task<string?> ValidateAsync(UploadQuizScreenshotInput input, CancellationToken cancellationToken = default) =>
        (await PrepareAsync(input, false, cancellationToken)).Error;

    private sealed record PreparedScreenshot(HuntMapItem? Map, HuntLocationItem[] Locations,
        IReadOnlyList<GameQuestionOptionInput> Choices, string? Error);

    private async Task<PreparedScreenshot> PrepareAsync(UploadQuizScreenshotInput input, bool randomize,
        CancellationToken cancellationToken)
    {
        if (!await db.QuestionCategories.AnyAsync(x => x.Id == input.CategoryId && x.Format == "screenshot", cancellationToken))
            return new(null, [], [], AppMessages.ErrorCodes.GameQuestionInvalidRequest);
        HuntMapItem? map = null;
        HuntLocationItem[] locations = [];
        IReadOnlyList<GameQuestionOptionInput> choices;
        if (input.CategoryId == QuestionCatalogDefaults.LocationScreenshotCategoryId)
        {
            var maps = await GetMapsAsync(cancellationToken);
            map = maps.SingleOrDefault(x => x.Locations.Any(location => location.Id == input.LocationId));
            if (map is null || map.Locations.Count < 6 || input.Options is not null)
                return new(null, [], [], AppMessages.ErrorCodes.GameQuestionInvalidRequest);
            var correct = map.Locations.Single(x => x.Id == input.LocationId);
            var distractors = map.Locations.Where(x => x.Id != correct.Id).ToArray();
            if (randomize) Random.Shared.Shuffle(distractors);
            else distractors = distractors.OrderByDescending(location =>
                TwitchQuizMessageFormatter.Normalize(location.Names.GetValueOrDefault("ru", string.Empty)).EnumerateRunes().Count()).ToArray();
            locations = new[] { correct }.Concat(distractors.Take(5)).ToArray();
            string[] locales = ["en", "ru", "uk", "pl"];
            if (locales.Any(locale => !map.Names.ContainsKey(locale)
                || locations.Any(location => !location.Names.ContainsKey(locale))))
                return new(null, [], [], AppMessages.ErrorCodes.GameQuestionInvalidRequest);
            choices = locations.Select(location => new GameQuestionOptionInput(location.Names["ru"], location.Id == correct.Id)).ToArray();
        }
        else
        {
            if (input.LocationId is not null || input.Options is null) return new(null, [], [], AppMessages.ErrorCodes.GameQuestionInvalidRequest);
            choices = input.Options;
        }
        var preview = TwitchQuizMessageFormatter.FormatForValidation(input.Text,
            choices.Select(choice => choice.Text).ToArray(), 3600, input.Reward);
        if (!preview.IsCompatible)
            return new(null, [], [], preview.ErrorCode);

        return new(map, locations, choices, null);
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

        var prepared = await PrepareAsync(input, true, cancellationToken);
        if (prepared.Error is not null)
            return new(UploadQuizScreenshotOutcome.InvalidSelection, ErrorCode: prepared.Error);
        var (map, locations, choices, _) = prepared;

        var thumbnail = QuizScreenshotImageProcessor.CreateThumbnail(content, contentType);
        if (thumbnail is null) return new(UploadQuizScreenshotOutcome.InvalidFile);

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
        var options = choices.Select((choice, index) => new QuestionOption
        {
            Id = Guid.NewGuid(),
            QuestionId = questionId,
            Text = choice.Text,
            NormalizedText = QuestionAnswerNormalizer.Normalize(choice.Text),
            IsCorrect = choice.IsCorrect,
            SortOrder = index,
            CreatedAtUtc = now
        }).ToArray();
        var image = new QuizImageSnapshot(mediaId, $"{asset.Bucket}/{asset.ObjectKey}",
            map?.Names ?? new Dictionary<string, string>(),
            map is null ? new Dictionary<Guid, IReadOnlyDictionary<string, string>>()
                : options.Select((option, index) => (option.Id, locations[index].Names)).ToDictionary(x => x.Id, x => x.Names))
        { ThumbnailPath = $"{asset.Bucket}/quiz/thumbnails/{mediaId:N}.webp" };
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
            Options = options.ToList(),
            ImageSnapshotJson = image.ToJson()
        };
        db.MediaAssets.Add(asset);
        db.QuestionDefinitions.Add(question);
        db.Set<QuestionScreenshot>().Add(new QuestionScreenshot
        {
            QuestionId = questionId,
            LocationId = input.LocationId,
            MediaAssetId = mediaId,
            UploadRequestId = input.RequestId,
            UploadFingerprint = fingerprint
        });
        try
        {
            // A failed PUT may still have persisted the object remotely. Clean both unique keys
            // on any failure before commit, including a lost response from object storage.
            await storage.PutObjectAsync(asset.Bucket, asset.ObjectKey, content, contentType, cancellationToken);
            await using var thumbnailStream = new MemoryStream(thumbnail, false);
            await storage.PutObjectAsync(asset.Bucket, $"quiz/thumbnails/{mediaId:N}.webp", thumbnailStream,
                "image/webp", cancellationToken);
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
            try { await storage.DeleteObjectAsync(asset.Bucket, $"quiz/thumbnails/{mediaId:N}.webp", CancellationToken.None); }
            catch (Exception cleanupError)
            {
                logger.LogError(cleanupError, "Failed to remove uncommitted quiz screenshot thumbnail {AssetId}.", mediaId);
            }
            throw;
        }
        // Preserve the object if commit has an uncertain outcome; the same request can safely retry.
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return new(UploadQuizScreenshotOutcome.Created, questionId);
    }
}
