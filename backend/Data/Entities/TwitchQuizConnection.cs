namespace backend.Data.Entities;

public sealed class TwitchQuizConnection
{
    public string Role { get; set; } = string.Empty;
    public string TwitchUserId { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string ProtectedAccessToken { get; set; } = string.Empty;
    public string ProtectedRefreshToken { get; set; } = string.Empty;
    public string[] Scopes { get; set; } = Array.Empty<string>();
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? LastError { get; set; }
}
