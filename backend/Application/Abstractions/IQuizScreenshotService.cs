using backend.Application.Contracts;

namespace backend.Application.Abstractions;

public interface IQuizScreenshotService
{
    Task<IReadOnlyList<HuntMapItem>> GetMapsAsync(CancellationToken cancellationToken = default);
    Task<string?> ValidateAsync(UploadQuizScreenshotInput input, CancellationToken cancellationToken = default);
    Task<UploadQuizScreenshotResult> UploadAsync(UploadQuizScreenshotInput input, Stream content,
        string contentType, long length, CancellationToken cancellationToken = default);
}
