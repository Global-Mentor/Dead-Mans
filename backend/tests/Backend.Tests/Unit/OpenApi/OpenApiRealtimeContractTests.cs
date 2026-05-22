using backend.Api.Contracts;

namespace Backend.Tests.Unit.OpenApi;

public sealed class OpenApiRealtimeContractTests
{
    private static string ReadOpenApiYaml()
    {
        var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));
        var openApiPath = Path.Combine(repoRoot, "openapi", "deadmans.v1.yaml");
        return File.ReadAllText(openApiPath);
    }

    [Fact]
    public void OpenApiDocumentsGameBoardRealtimeHub()
    {
        var yaml = ReadOpenApiYaml();

        Assert.Contains($"path: {RealtimeHubContracts.GameBoard.HubPath}", yaml, StringComparison.Ordinal);
        Assert.Contains(RealtimeHubContracts.GameBoard.CellOpenedEvent + ":", yaml, StringComparison.Ordinal);
        Assert.Contains("GameCellOpenedEventDto:", yaml, StringComparison.Ordinal);
    }

    [Fact]
    public void OpenApiDocumentsGameSetupRealtimeHub()
    {
        var yaml = ReadOpenApiYaml();

        Assert.Contains($"path: {RealtimeHubContracts.GameSetup.HubPath}", yaml, StringComparison.Ordinal);
        Assert.Contains(RealtimeHubContracts.GameSetup.DraftChangedEvent + ":", yaml, StringComparison.Ordinal);
        Assert.Contains("GameSetupDraftChangedEventDto:", yaml, StringComparison.Ordinal);
    }
}
