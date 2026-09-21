namespace backend.Application.Configuration;

public sealed class TwitchBotOptions
{
    public const string SectionName = "TwitchBot";
    public const string LegacySectionName = "TwitchQuiz";

    public bool Enabled { get; set; }
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public string WebhookCallbackUrl { get; set; } = string.Empty;
    public string OAuthCallbackUrl { get; set; } = string.Empty;
    public string FrontendRedirectUrl { get; set; } = string.Empty;
    public string ExpectedBotUserId { get; set; } = string.Empty;
    public string ExpectedBroadcasterUserId { get; set; } = string.Empty;
    public string OAuthBaseUrl { get; set; } = "https://id.twitch.tv";
    public string ApiBaseUrl { get; set; } = "https://api.twitch.tv";

    public static readonly string[] BotScopes = ["user:read:chat", "user:write:chat", "user:bot"];
    public static readonly string[] BroadcasterScopes = ["channel:bot"];

    public bool IsComplete()
    {
        if (!Enabled) return true;
        return ClientId.Trim().Length >= 3
            && ClientSecret.Trim().Length >= 10
            && WebhookSecret.Trim().Length is >= 20 and <= 100
            && IsHttpUrl(WebhookCallbackUrl)
            && IsHttpUrl(OAuthCallbackUrl)
            && IsHttpUrl(FrontendRedirectUrl)
            && IsOriginUrl(OAuthBaseUrl)
            && IsOriginUrl(ApiBaseUrl)
            && IsPositiveTwitchId(ExpectedBotUserId)
            && IsPositiveTwitchId(ExpectedBroadcasterUserId)
            && ExpectedBotUserId.Trim() != ExpectedBroadcasterUserId.Trim();
    }

    private static bool IsPositiveTwitchId(string value) =>
        ulong.TryParse(value?.Trim(), out var id) && id > 0;

    private static bool IsOriginUrl(string value) =>
        IsHttpUrl(value) && Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && uri.AbsolutePath == "/" && string.IsNullOrEmpty(uri.Query);

    private static bool IsHttpUrl(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
        && string.IsNullOrEmpty(uri.UserInfo)
        && string.IsNullOrEmpty(uri.Fragment);

    public bool UsesHttpsExternalUrls() => !Enabled || new[]
    {
        WebhookCallbackUrl, OAuthCallbackUrl, FrontendRedirectUrl, OAuthBaseUrl, ApiBaseUrl
    }.All(value => Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps);
}
