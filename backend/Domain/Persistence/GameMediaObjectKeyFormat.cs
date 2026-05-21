namespace backend.Domain.Persistence;

/// <summary>
/// Shared object-key layout for game media. Values come from configuration, not literals in feature code.
/// </summary>
public static class GameMediaObjectKeyFormat
{
    public static string BuildGameMediaPrefix(string gamesPrefix, Guid gameId)
    {
        return $"{gamesPrefix.Trim('/')}/{gameId}/";
    }

    public static string BuildCardImageKey(
        string gamesPrefix,
        Guid gameId,
        string cardsGroup,
        int rowIndex,
        int colIndex,
        string fileExtension
    )
    {
        var extension = fileExtension.StartsWith('.') ? fileExtension : $".{fileExtension}";
        return $"{BuildGameMediaPrefix(gamesPrefix, gameId)}{cardsGroup.Trim('/')}/{colIndex + 1}-{rowIndex + 1}{extension}";
    }
}
