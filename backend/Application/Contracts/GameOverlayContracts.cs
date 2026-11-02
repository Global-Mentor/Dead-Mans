namespace backend.Application.Contracts;

public sealed record GameOverlayTestState(bool HasKey, bool Enabled);
public sealed record GameOverlayLeaderboardState(bool Enabled, int Page = 0, int PageCount = 1, string Kind = "teams");
public sealed record GameOverlayQuizLeaderboardEntry(string DisplayName, int Points, int Attempts, int CorrectAnswers);
public sealed record GameOverlayLeaderboardEntry(int? Rank, string? Name, int SlotIndex,
    IReadOnlyList<string> Players, int RoundsPlayed, int TotalKills, int TotalBounties, int? FinalScore);

public sealed record GameOverlayTeam(string? Name, int SlotIndex, IReadOnlyList<string> Players);

public sealed record GameOverlayCell(int Row, int Col, int Cost, string State, string? Title,
    string? ImageUrl = null, GameOverlayCellResult? Result = null);
public sealed record GameOverlayCellResult(string? TeamName, int TeamSlotIndex, int FinalScore, int PenaltyTotal);

public sealed record GameOverlayBoard(
    IReadOnlyList<string> RowLabels,
    IReadOnlyList<string> ColLabels,
    IReadOnlyList<GameOverlayCell> Cells
);

public sealed record GameOverlaySnapshot(
    string? GameId,
    string Phase,
    GameOverlayTeam? Team,
    GameOverlayBoard? Board,
    GameOverlayRound? Round = null,
    GameOverlayGameplay? Gameplay = null,
    GameOverlaySummary? Summary = null,
    IReadOnlyList<GameOverlayLeaderboardEntry>? Leaderboard = null,
    int LeaderboardPage = 0,
    IReadOnlyList<GameOverlayQuizLeaderboardEntry>? QuizLeaderboard = null
);

public sealed record GameOverlayModifier(string Id, string Name, string? IconEmoji, string ModifierId);
public sealed record GameOverlayRound(
    string Id, string? Title, int Cost, string? ImageUrl, IReadOnlyList<GameOverlayModifier> Modifiers,
    string ColumnLabel, string RowLabel);

public sealed record GameOverlayTimer(string Id, long DurationSeconds);
public sealed record GameOverlayGameplayModifier(string ModifierId, string Name, string? IconEmoji,
    int ActivationCount, IReadOnlyList<GameOverlayTimer> Timers);
public sealed record GameOverlayGameplay(string RoundId, DateTime GameplayStartedAtUtc, DateTime ServerNowUtc,
    IReadOnlyList<GameOverlayGameplayModifier> Modifiers);

public sealed record GameOverlaySummary(string RoundId, bool IsFinal, GameOverlayRound Card,
    string? TeamName, int TeamSlotIndex, int KillsCount, int BountyCount,
    int KillsScore, int BountyScore, GameRoundScoreDetails ScoreDetails);
