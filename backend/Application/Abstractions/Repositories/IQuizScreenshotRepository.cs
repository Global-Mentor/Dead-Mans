using backend.Application.Contracts;

namespace backend.Application.Abstractions.Repositories;

public interface IQuizScreenshotRepository
{
    Task<IReadOnlyList<HuntMapItem>> GetMapsAsync(CancellationToken cancellationToken = default);
    Task<UploadQuizScreenshotResult> CreateAsync(UploadQuizScreenshotInput input, Stream content,
        string contentType, long length, string fingerprint, CancellationToken cancellationToken = default);
}
