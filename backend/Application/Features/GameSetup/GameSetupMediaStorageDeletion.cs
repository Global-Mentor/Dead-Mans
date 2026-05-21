using backend.Application.Abstractions;
using backend.Application.Configuration;
using backend.Domain.Persistence;
using backend.Messaging;

namespace backend.Application.Features.GameSetup;

internal static class GameSetupMediaStorageDeletion
{
    public static async Task TryDeleteGameMediaPrefixAsync(
        IObjectStorage objectStorage,
        MediaStorageSettings storageSettings,
        ILogger logger,
        Guid gameId,
        CancellationToken cancellationToken = default
    )
    {
        var prefix = GameMediaObjectKeyFormat.BuildGameMediaPrefix(storageSettings.GamesPrefix, gameId);

        try
        {
            await objectStorage.DeleteObjectsByPrefixAsync(
                storageSettings.BucketName,
                prefix,
                cancellationToken
            );
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                AppMessages.Logs.GameSetupDraftMediaStorageCleanupFailed,
                gameId,
                prefix
            );
        }
    }

    public static async Task TryDeleteObjectAsync(
        IObjectStorage objectStorage,
        ILogger logger,
        Guid cellId,
        string bucket,
        string objectKey,
        Exception? failureCause,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            await objectStorage.DeleteObjectAsync(bucket, objectKey, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                failureCause ?? ex,
                AppMessages.Logs.GameSetupCellMediaObjectCleanupFailed,
                cellId,
                bucket,
                objectKey
            );
        }
    }
}
