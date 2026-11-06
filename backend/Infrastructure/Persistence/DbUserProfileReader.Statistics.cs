using System.Globalization;
using backend.Application.Contracts;
using backend.Application.Features.Scoring;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbUserProfileReader
{
    private async Task<UserProfileStatistics> ReadStatisticsAsync(Guid userId, int finishedGames, int completedRounds,
        int earnedPoints, CancellationToken cancellationToken)
    {
        var ownRounds = db.GameRounds.AsNoTracking().Where(round => round.Status == GameRoundStatusValue.Completed
            && !round.Game.IsDeleted && round.Game.Status != GameStatusValue.Draft
            && round.Participants.Any(participant => participant.UserId == userId));
        var rounds = await ownRounds.Select(round => new RoundFact(round.Id, round.GameId, round.TeamId,
            round.FinalScore, Math.Max(0L, (long)round.KillsCount + round.ModifierResults.Sum(result => (long)result.KillDelta)),
            round.BountyCount, round.FinishedAtUtc)).ToArrayAsync(cancellationToken);
        var placements = await db.GameTeamFinalResults.AsNoTracking()
            .Where(result => result.Placement != null && ownRounds.Any(round => round.GameId == result.GameId && round.TeamId == result.TeamId))
            .GroupBy(result => result.GameId).Select(group => group.Min(result => result.Placement!.Value))
            .ToArrayAsync(cancellationToken);
        var teammateCount = await db.GameRoundParticipants.AsNoTracking()
            .Where(participant => participant.UserId != userId && ownRounds.Any(round => round.Id == participant.RoundId))
            .Select(participant => participant.UserId).Distinct().CountAsync(cancellationToken);
        var answers = await ClosedAnswers(userId).Select(answer => new AnswerFact(answer.Id, answer.GameId,
            answer.IsCorrect, answer.AwardedPoints, answer.QuestionSession.CategoryNameSnapshot,
            answer.QuestionSession.ImageSnapshotJson != null, answer.SubmittedAtUtc)).ToArrayAsync(cancellationToken);
        var pointGroups = await db.GameQuizPointLedgerEntries.AsNoTracking()
            .Where(entry => entry.UserId == userId && !entry.Game.IsDeleted && entry.Game.Status != GameStatusValue.Draft)
            .GroupBy(entry => new { entry.EntryType, Positive = entry.PointsDelta > 0 })
            .Select(group => new PointFact(group.Key.EntryType, group.Key.Positive, group.Sum(entry => (long)entry.PointsDelta)))
            .ToArrayAsync(cancellationToken);
        var activations = await db.GameModifierActivations.AsNoTracking()
            .Where(activation => activation.ActivatedByUserId == userId && !activation.Game.IsDeleted && activation.Game.Status != GameStatusValue.Draft)
            .Select(activation => new ModifierFact(activation.Id, activation.GameId, activation.RoundId, activation.ModifierId,
                activation.ModifierNameSnapshot, activation.ModifierCategorySnapshot, activation.ActivationCostSnapshot,
                activation.Status, activation.ActivatedAtUtc,
                activation.Status == GameModifierActivationStatusValue.Consumed && activation.Round.Status == GameRoundStatusValue.Completed
                    ? db.GameRoundModifierResults.Where(result => result.GameModifierActivationId == activation.Id)
                        .Select(result => result.OutcomeStatus).FirstOrDefault() : null))
            .ToArrayAsync(cancellationToken);
        var games = new UserProfileGameStatistics(rounds.Select(round => round.GameId).Distinct().Count(), placements.Length,
            placements.Count(place => place == 1), placements.Count(place => place <= 3), placements.Select(place => (int?)place).Min(),
            rounds.Select(round => round.TeamId).Distinct().Count(), teammateCount,
            SaturatingInt32.From(rounds.Sum(round => (long)(round.Score ?? 0))), rounds.Select(round => round.Score).Max(),
            SaturatingInt32.From(rounds.Sum(round => round.Kills)), SaturatingInt32.From(rounds.Sum(round => (long)round.Bounties)),
            Average(rounds.Sum(round => (long)(round.Score ?? 0)), rounds.Length));
        return new(finishedGames, completedRounds, earnedPoints, games, BuildQuizStatistics(answers),
            BuildPointStatistics(pointGroups, activations.Count(activation => activation.Cost > 0)), BuildModifierStatistics(activations), BuildActivity(rounds, answers, activations));
    }

    private static UserProfileQuizStatistics BuildQuizStatistics(AnswerFact[] answers)
    {
        var streak = 0;
        var longest = 0;
        foreach (var answer in answers.OrderBy(answer => answer.At).ThenBy(answer => answer.Id))
        {
            streak = answer.Correct ? streak + 1 : 0;
            longest = Math.Max(longest, streak);
        }
        static UserProfileQuizFormatStatistics Format(IEnumerable<AnswerFact> values)
        {
            var rows = values.ToArray();
            return new(rows.Length, rows.Count(answer => answer.Correct), SaturatingInt32.From(rows.Sum(answer => (long)answer.Points)));
        }
        var correct = answers.Count(answer => answer.Correct);
        var perGame = answers.GroupBy(answer => answer.GameId).ToArray();
        return new(answers.Length, correct, answers.Length - correct, Format(answers.Where(answer => !answer.Screenshot)),
            Format(answers.Where(answer => answer.Screenshot)), longest,
            perGame.Select(group => group.Count(answer => answer.Correct)).DefaultIfEmpty().Max(),
            SaturatingInt32.From(perGame.Select(group => group.Sum(answer => (long)answer.Points)).DefaultIfEmpty().Max()),
            answers.GroupBy(answer => answer.Category, StringComparer.Ordinal).OrderBy(group => group.Key, StringComparer.Ordinal)
                .Select(group => new UserProfileQuizCategoryStatistics(group.Key, group.Count(), group.Count(answer => answer.Correct),
                    SaturatingInt32.From(group.Sum(answer => (long)answer.Points)))).ToArray(),
            Average(answers.Sum(answer => (long)answer.Points), answers.Length));
    }

    private static UserProfilePointStatistics BuildPointStatistics(PointFact[] groups, int paidOrders)
    {
        long Sum(string type, bool positive) => groups.Where(group => group.Type == type && group.Positive == positive).Sum(group => group.Points);
        var spent = -Sum(GameQuizPointEntryTypeValue.ModifierPurchase, false);
        var refunded = Sum(GameQuizPointEntryTypeValue.ModifierRefund, true);
        return new(SaturatingInt32.From(Sum(GameQuizPointEntryTypeValue.ManualAdjustment, true)),
            SaturatingInt32.From(-Sum(GameQuizPointEntryTypeValue.ManualAdjustment, false)),
            SaturatingInt32.From(spent), SaturatingInt32.From(refunded), SaturatingInt32.From(spent - refunded), Average(spent, paidOrders));
    }

    private static UserProfileModifierStatistics BuildModifierStatistics(ModifierFact[] activations)
    {
        var applied = activations.Where(activation => activation.Outcome is not null).ToArray();
        var mostUsed = applied.GroupBy(activation => activation.ModifierId).OrderByDescending(group => group.Count())
            .ThenBy(group => group.Key).Select(group => new UserProfileModifierCount(
                group.OrderByDescending(activation => activation.At).ThenByDescending(activation => activation.Id).First().Name,
                group.Count())).FirstOrDefault();
        var cancelled = activations.Count(activation => activation.Status == GameModifierActivationStatusValue.Cancelled);
        return new(activations.Length, activations.Count(activation => activation.Cost > 0), activations.Count(activation => activation.Cost == 0),
            applied.Length, cancelled, activations.Length - applied.Length - cancelled,
            activations.Select(activation => activation.ModifierId).Distinct().Count(), activations.Select(activation => activation.GameId).Distinct().Count(),
            activations.Select(activation => activation.RoundId).Distinct().Count(), mostUsed,
            activations.GroupBy(activation => activation.Category, StringComparer.Ordinal).OrderBy(group => group.Key, StringComparer.Ordinal)
                .Select(group => new UserProfileModifierCount(group.Key, group.Count())).ToArray(),
            applied.GroupBy(activation => activation.Outcome!, StringComparer.Ordinal).OrderBy(group => group.Key, StringComparer.Ordinal)
                .Select(group => new UserProfileModifierOutcomeCount(group.Key, group.Count())).ToArray());
    }

    private UserProfileActivityStatistics BuildActivity(RoundFact[] rounds, AnswerFact[] answers, ModifierFact[] modifiers)
    {
        var events = rounds.Where(round => round.At.HasValue).Select(round => new ActivityFact(round.GameId, round.At!.Value, 0))
            .Concat(answers.Select(answer => new ActivityFact(answer.GameId, answer.At, 1)))
            .Concat(modifiers.Select(modifier => new ActivityFact(modifier.GameId, modifier.At, 2))).ToArray();
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-11);
        var byMonth = events.Where(item => item.At >= start && item.At < start.AddMonths(12))
            .ToLookup(item => item.At.ToString("yyyy-MM", CultureInfo.InvariantCulture));
        var months = Enumerable.Range(0, 12).Select(index =>
        {
            var month = start.AddMonths(index).ToString("yyyy-MM", CultureInfo.InvariantCulture);
            var rows = byMonth[month].ToArray();
            return new UserProfileActivityMonth(month, rows.Select(item => item.GameId).Distinct().Count(),
                rows.Count(item => item.Kind == 0), rows.Count(item => item.Kind == 1), rows.Count(item => item.Kind == 2));
        }).ToArray();
        return new(events.Select(item => (DateTime?)item.At).Min(), events.Select(item => (DateTime?)item.At).Max(),
            events.Select(item => item.At.Date).Distinct().Count(), months);
    }

    private static decimal Average(long total, int count) => count == 0 ? 0m : (decimal)total / count;

    private sealed record RoundFact(Guid Id, Guid GameId, Guid TeamId, int? Score, long Kills, int Bounties, DateTime? At);
    private sealed record AnswerFact(Guid Id, Guid GameId, bool Correct, int Points, string Category, bool Screenshot, DateTime At);
    private sealed record PointFact(string Type, bool Positive, long Points);
    private sealed record ModifierFact(Guid Id, Guid GameId, Guid RoundId, Guid ModifierId, string Name, string Category,
        int Cost, string Status, DateTime At, string? Outcome);
    private sealed record ActivityFact(Guid GameId, DateTime At, int Kind);
}
