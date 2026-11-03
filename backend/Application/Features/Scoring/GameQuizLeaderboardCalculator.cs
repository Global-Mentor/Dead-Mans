using backend.Application.Contracts;
using backend.Domain.Persistence;

namespace backend.Application.Features.Scoring;

public sealed record GameQuizLeaderboardFact(Guid UserId, string DisplayName, int Points,
    bool IsAnswer, bool IsCorrect, DateTime OccurredAtUtc, bool IsScreenshot = false);

public static class GameQuizLeaderboardCalculator
{
    public static GameHistoryQuizPlayerSummary[] Calculate(IEnumerable<GameQuizLeaderboardFact> facts,
        IReadOnlyDictionary<Guid, long>? spentPointsByUserId = null) =>
        facts.GroupBy(fact => fact.UserId).Select(group =>
        {
            var points = group.Sum(fact => (long)fact.Points);
            var spent = spentPointsByUserId?.GetValueOrDefault(group.Key) ?? 0;
            return new GameHistoryQuizPlayerSummary(group.Key, group.First().DisplayName,
                SaturatingInt32.From(points), SaturatingInt32.From(spent),
                SaturatingInt32.From(Math.Max(0L, points - spent)),
                group.Count(fact => fact.IsAnswer), group.Count(fact => fact.IsAnswer && fact.IsCorrect),
                group.Max(fact => fact.OccurredAtUtc))
            {
                TextStatistics = FormatStatistics(group.Where(fact => fact.IsAnswer && !fact.IsScreenshot)),
                ScreenshotStatistics = FormatStatistics(group.Where(fact => fact.IsAnswer && fact.IsScreenshot))
            };
        })
        .OrderByDescending(row => row.Points).ThenByDescending(row => row.CorrectAnswers)
        .ThenByDescending(row => row.Attempts).ThenBy(row => row.DisplayName, StringComparer.OrdinalIgnoreCase)
        .ThenBy(row => row.UserId).ToArray();

    private static GameQuizFormatStatistics FormatStatistics(IEnumerable<GameQuizLeaderboardFact> facts)
    {
        var answers = facts.ToArray();
        return new(answers.Length, answers.Count(fact => fact.IsCorrect),
            SaturatingInt32.From(answers.Sum(fact => (long)fact.Points)));
    }
}
