using backend.Application.Abstractions.Repositories;
using backend.Application.Configuration;
using backend.Domain.Persistence;

namespace backend.Application.Features.GameSetup;

internal static class GameSetupCellMediaValidator
{
    public static bool IsAllowedUpload(string? contentType, long length, out string normalizedMimeType)
    {
        normalizedMimeType = string.Empty;
        if (length <= 0 || length > GameSetupCellMediaLimits.MaxUploadBytes)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(contentType)
            || !GameSetupCellMediaLimits.AllowedMimeTypes.Contains(contentType.Trim()))
        {
            return false;
        }

        normalizedMimeType = contentType.Trim();
        return true;
    }

    public static string BuildObjectKey(
        MediaStorageSettings storageSettings,
        GameSetupDraftCellRef draftCell,
        string extension
    )
    {
        return GameMediaObjectKeyFormat.BuildCardImageKey(
            storageSettings.GamesPrefix,
            draftCell.GameId,
            storageSettings.CardsGroup,
            draftCell.RowIndex,
            draftCell.ColIndex,
            extension
        );
    }

    public static string ResolveExtension(string mimeType)
    {
        return mimeType.ToLowerInvariant() switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            _ => string.Empty,
        };
    }
}
