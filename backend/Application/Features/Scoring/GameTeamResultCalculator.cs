namespace backend.Application.Features.Scoring;

public sealed record GameTeamRoundScoreFact(
    Guid RoundId,
    int FinalScore,
    int PenaltyTotal,
    int BonusDelta,
    int TotalKills,
    int TotalBounties,
    DateTime FinishedAtUtc
);

public sealed record GameTeamRoundScoreValue(int FinalScore, int PenaltyTotal)
{
    public static GameTeamRoundScoreValue FromPersistedFinalScore(int finalScore) =>
        new(
            finalScore,
            finalScore < 0 ? SaturatingInt32.From(Math.Abs((long)finalScore)) : 0
        );
}

public sealed record CalculatedGameTeamScore(int BestScore, int PenaltyTotal, int FinalScore);

public sealed record GameTeamResultCalculationInput(
    Guid TeamId,
    string? TeamName,
    int TeamSlotIndex,
    IReadOnlyList<string> ParticipantNames,
    IReadOnlyList<GameTeamRoundScoreFact> Rounds
);

public sealed record CalculatedGameTeamResult(
    Guid TeamId,
    string? TeamName,
    int TeamSlotIndex,
    IReadOnlyList<string> ParticipantNames,
    int RoundsPlayed,
    int? BestScore,
    int PenaltyTotal,
    int? FinalScore,
    int TotalScore,
    int AverageScore,
    int TotalBonusDelta,
    int TotalKills,
    int TotalBounties,
    int? Placement,
    Guid? BestRoundId,
    Guid? LatestRoundId,
    DateTime? LastFinishedAtUtc,
    IReadOnlyList<Guid> RoundIdsByRecency
);

public static class GameTeamResultCalculator
{
    // Version 2 finalizations include only teams that opened a card, including cancelled rounds.
    public const int CalculationVersion = 2;

    public static CalculatedGameTeamScore? CalculateScore(
        IReadOnlyList<GameTeamRoundScoreValue> rounds
    )
    {
        if (rounds.Count == 0)
        {
            return null;
        }

        var bestScore = rounds.Max(round => Math.Max(0L, (long)round.FinalScore + round.PenaltyTotal));
        var penaltyTotal = rounds.Sum(round => (long)round.PenaltyTotal);
        return new CalculatedGameTeamScore(
            SaturatingInt32.From(bestScore),
            SaturatingInt32.From(penaltyTotal),
            SaturatingInt32.From(bestScore - penaltyTotal)
        );
    }

    public static IReadOnlyList<CalculatedGameTeamResult> Calculate(
        IEnumerable<GameTeamResultCalculationInput> teams
    )
    {
        var calculated = teams.Select(CalculateTeam).ToArray();
        var played = calculated
            .Where(x => x.FinalScore.HasValue)
            .OrderByDescending(x => x.FinalScore)
            .ThenByDescending(x => x.BestScore)
            .ThenByDescending(x => x.TotalScore)
            .ThenByDescending(x => x.LastFinishedAtUtc)
            .ThenBy(x => x.TeamSlotIndex)
            .ToArray();

        var ranked = new List<CalculatedGameTeamResult>(calculated.Length);
        int? previousScore = null;
        var previousPlacement = 0;
        for (var index = 0; index < played.Length; index += 1)
        {
            var team = played[index];
            var placement = previousScore.HasValue && previousScore.Value == team.FinalScore
                ? previousPlacement
                : index + 1;
            ranked.Add(team with { Placement = placement });
            previousScore = team.FinalScore;
            previousPlacement = placement;
        }

        ranked.AddRange(
            calculated
                .Where(x => !x.FinalScore.HasValue)
                .OrderBy(x => x.TeamSlotIndex)
        );
        return ranked;
    }

    private static CalculatedGameTeamResult CalculateTeam(GameTeamResultCalculationInput team)
    {
        if (team.Rounds.Count == 0)
        {
            return new CalculatedGameTeamResult(
                team.TeamId,
                team.TeamName,
                team.TeamSlotIndex,
                team.ParticipantNames,
                0,
                null,
                0,
                null,
                0,
                0,
                0,
                0,
                0,
                null,
                null,
                null,
                null,
                Array.Empty<Guid>()
            );
        }

        var orderedByScore = team.Rounds
            .OrderByDescending(x => (long)x.FinalScore + x.PenaltyTotal)
            .ThenByDescending(x => x.BonusDelta)
            .ThenByDescending(x => x.FinishedAtUtc)
            .ToArray();
        var orderedByTime = team.Rounds.OrderByDescending(x => x.FinishedAtUtc).ToArray();
        var bestRound = orderedByScore[0];
        var latestRound = orderedByTime[0];
        var score = CalculateScore(
            team.Rounds.Select(round => new GameTeamRoundScoreValue(round.FinalScore, round.PenaltyTotal)).ToArray()
        ) ?? throw new InvalidOperationException("A team with completed rounds must have a score.");
        var totalScore = team.Rounds.Sum(x => (long)x.FinalScore);

        return new CalculatedGameTeamResult(
            team.TeamId,
            team.TeamName,
            team.TeamSlotIndex,
            team.ParticipantNames,
            team.Rounds.Count,
            score.BestScore,
            score.PenaltyTotal,
            score.FinalScore,
            SaturatingInt32.From(totalScore),
            SaturatingInt32.From(Math.Round((decimal)totalScore / team.Rounds.Count)),
            SaturatingInt32.From(team.Rounds.Sum(x => (long)x.BonusDelta)),
            SaturatingInt32.From(team.Rounds.Sum(x => (long)x.TotalKills)),
            SaturatingInt32.From(team.Rounds.Sum(x => (long)x.TotalBounties)),
            null,
            bestRound.RoundId,
            latestRound.RoundId,
            latestRound.FinishedAtUtc,
            orderedByTime.Select(x => x.RoundId).ToArray()
        );
    }
}
