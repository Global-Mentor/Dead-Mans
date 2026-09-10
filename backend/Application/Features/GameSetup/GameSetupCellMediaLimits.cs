namespace backend.Application.Features.GameSetup;

public static class GameSetupCellMediaLimits
{
    public const long MaxUploadBytes = 5 * 1024 * 1024;

    public static readonly IReadOnlySet<string> AllowedMimeTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    };
}
