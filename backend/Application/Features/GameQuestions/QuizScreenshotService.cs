using System.Security.Cryptography;
using System.Text;
using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Application.Media;
using backend.Messaging;

namespace backend.Application.Features.GameQuestions;

public sealed class QuizScreenshotService(IQuizScreenshotRepository repository) : IQuizScreenshotService
{
    public Task<IReadOnlyList<HuntMapItem>> GetMapsAsync(CancellationToken cancellationToken = default) =>
        repository.GetMapsAsync(cancellationToken);

    public async Task<UploadQuizScreenshotResult> UploadAsync(UploadQuizScreenshotInput input, Stream content,
        string contentType, long length, CancellationToken cancellationToken = default)
    {
        if (input.RequestId == Guid.Empty || !TryNormalize(ref input))
            return new(UploadQuizScreenshotOutcome.InvalidSelection);
        if (!content.CanSeek || content.Length != length
            || !ImageUploadValidator.IsAllowedUpload(contentType, length, out var mimeType)
            || !ImageUploadValidator.HasMatchingFileSignature(content, mimeType))
            return new(UploadQuizScreenshotOutcome.InvalidFile);
        content.Position = 0;
        var hash = await SHA256.HashDataAsync(content, cancellationToken);
        content.Position = 0;
        var metadata = System.Text.Json.JsonSerializer.Serialize(new { input, mimeType, length, hash = Convert.ToHexString(hash) });
        var fingerprint = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(metadata)));
        return await repository.CreateAsync(input, content, mimeType, length, fingerprint, cancellationToken);
    }

    public Task<string?> ValidateAsync(UploadQuizScreenshotInput input, CancellationToken cancellationToken = default) =>
        TryNormalize(ref input) ? repository.ValidateAsync(input, cancellationToken)
            : Task.FromResult<string?>(AppMessages.ErrorCodes.GameQuestionInvalidRequest);

    private static bool TryNormalize(ref UploadQuizScreenshotInput input)
    {
        if (input.CategoryId == Guid.Empty
            || input.Reward < 0 || !GameQuestionValidator.TryNormalizeText(input.Text, out var text))
            return false;
        if (input.CategoryId == QuestionCatalogDefaults.LocationScreenshotCategoryId)
        {
            if (input.LocationId is null || input.LocationId == Guid.Empty || input.Options is not null)
                return false;
        }
        else
        {
            if (input.LocationId is not null || !GameQuestionValidator.TryNormalizeOptions(input.Options, out var options))
                return false;
            input = input with { Options = options };
        }
        input = input with { Text = text };
        return true;
    }
}
