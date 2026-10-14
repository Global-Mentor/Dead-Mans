namespace backend.Data.Entities;

public sealed class GameRoundBroadcastDraft
{
    public Guid RoundId { get; set; }
    public int RoundVersion { get; set; }
    public int KillsCount { get; set; }
    public int BountyCount { get; set; }
    public string? ScoreDetailsJson { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public GameRound Round { get; set; } = default!;
}
