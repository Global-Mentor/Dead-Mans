namespace backend.Infrastructure.Persistence;

internal static class GameBoardMediaUrlBuilder
{
    public static string Build(string publicBaseUrl, string bucket, string objectKey)
    {
        return $"{publicBaseUrl.TrimEnd('/')}/{bucket}/{objectKey}";
    }
}
