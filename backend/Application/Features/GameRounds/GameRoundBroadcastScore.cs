using backend.Application.Contracts;
using backend.Application.Features.Scoring;

namespace backend.Application.Features.GameRounds;

public static class GameRoundBroadcastScore
{
    public static GameRoundScoreDetails CreateInitial(int scoreUnit, IReadOnlyList<(Guid Id, string Name)> modifiers) =>
        Create(new GameRoundScoreDetails(scoreUnit, 0, 0, 0, 0, 0, false, 0, 0, 0, 0, 0,
        [
            new("kills", null, null, 0, 0, 0, null, null, []),
            new("bounties", null, null, 0, 0, 0, null, null, [])
        ]), modifiers);

    public static GameRoundScoreDetails Create(GameRoundScoreDetails score,
        IReadOnlyList<(Guid Id, string Name)> modifiers)
    {
        var eligible = modifiers.Select(modifier => modifier.Id.ToString()).ToHashSet();
        var lines = score.CalculationLines.Where(line => line.ModifierId is null
            || eligible.Contains(line.ModifierId) || line.PointsDelta != 0).ToList();
        var present = lines.Where(line => line.ModifierId is not null).Select(line => line.ModifierId).ToHashSet();
        foreach (var group in modifiers.GroupBy(modifier => modifier.Id))
        {
            if (present.Contains(group.Key.ToString())) continue;
            lines.Add(new GameRoundScoreCalculationLine("modifierPoints",
                group.Key.ToString(), group.First().Name, group.Count(), 0, 0, null, null, []));
        }
        var order = modifiers.Select((modifier, index) => (modifier.Id, Index: index)).GroupBy(item => item.Id)
            .ToDictionary(group => group.Key.ToString(), group => group.First().Index);
        decimal total = 0;
        lines = lines.OrderBy(line => line.ModifierId is null
                ? line.Kind == "emptyCardPenalty" ? int.MaxValue : -1
                : order.GetValueOrDefault(line.ModifierId, int.MaxValue - 1))
            .Select(line =>
            {
                total += line.PointsDelta;
                return line with { RunningTotal = SaturatingInt32.From(total) };
            }).ToList();
        return score with { CalculationLines = lines };
    }
}
