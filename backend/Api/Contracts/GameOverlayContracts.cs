namespace backend.Api.Contracts;

public sealed record GameOverlayKeyDto(string Key);
public sealed record GameOverlayTeamDto(string? Name, int SlotIndex, IReadOnlyList<string> Players);
public sealed record GameOverlayCellDto(int Row, int Col, int Cost, string State, string? Title,
    string? ImageUrl = null, GameOverlayCellResultDto? Result = null);
public sealed record GameOverlayCellResultDto(string? TeamName, int TeamSlotIndex, int FinalScore, int PenaltyTotal);
public sealed record GameOverlayBoardDto(
    IReadOnlyList<string> RowLabels,
    IReadOnlyList<string> ColLabels,
    IReadOnlyList<GameOverlayCellDto> Cells
);
public sealed record GameOverlaySnapshotDto(
    string? GameId,
    string Phase,
    GameOverlayTeamDto? Team,
    GameOverlayBoardDto? Board,
    GameOverlayRoundDto? Round,
    GameOverlayGameplayDto? Gameplay = null,
    GameOverlaySummaryDto? Summary = null
);

public sealed record GameOverlayModifierDto(string Id, string Name, string? IconEmoji, string ModifierId);
public sealed record GameOverlayRoundDto(
    string Id, string? Title, int Cost, string? ImageUrl, IReadOnlyList<GameOverlayModifierDto> Modifiers,
    string ColumnLabel, string RowLabel);

public sealed record GameOverlayTimerDto(string Id, long DurationSeconds);
public sealed record GameOverlayGameplayModifierDto(string ModifierId, string Name, string? IconEmoji,
    int ActivationCount, IReadOnlyList<GameOverlayTimerDto> Timers);
public sealed record GameOverlayGameplayDto(string RoundId, DateTime GameplayStartedAtUtc, DateTime ServerNowUtc,
    IReadOnlyList<GameOverlayGameplayModifierDto> Modifiers);

public sealed record GameOverlaySummaryDto(string RoundId, bool IsFinal, GameOverlayRoundDto Card,
    string? TeamName, int TeamSlotIndex, int KillsCount, int BountyCount,
    int KillsScore, int BountyScore, GameRoundScoreDetailsDto ScoreDetails);
