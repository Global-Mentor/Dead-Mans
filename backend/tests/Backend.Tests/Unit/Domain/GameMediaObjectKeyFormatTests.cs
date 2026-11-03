using backend.Domain.Persistence;

namespace Backend.Tests.Unit.Domain;

public sealed class GameMediaObjectKeyFormatTests
{
    [Fact]
    public void BuildGameMediaPrefix_UsesConfiguredGamesPrefix()
    {
        var gameId = Guid.Parse("c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a");

        var prefix = GameMediaObjectKeyFormat.BuildGameMediaPrefix("games", gameId);

        Assert.Equal($"games/{gameId}/", prefix);
    }

    [Fact]
    public void BuildCardImageKey_UsesConfiguredLayoutMatchingSeedMigration()
    {
        var gameId = Guid.Parse("c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a");
        var mediaAssetId = Guid.Parse("d7d7a1eb-1ce2-4f1c-aa3f-0b5d0d9c8e7b");

        var objectKey = GameMediaObjectKeyFormat.BuildCardImageKey(
            "games",
            gameId,
            "cards",
            0,
            0,
            mediaAssetId,
            ".png"
        );

        Assert.Equal($"games/{gameId}/cards/1-1/{mediaAssetId:N}.png", objectKey);
    }
}
