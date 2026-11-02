namespace backend.Data.Entities;

public sealed class GameOverlayKey
{
    public Guid OwnerId { get; set; }
    public string KeyHash { get; set; } = string.Empty;
    public string? ProtectedKey { get; set; }
    public bool TestEnabled { get; set; }
    public User Owner { get; set; } = default!;
}
