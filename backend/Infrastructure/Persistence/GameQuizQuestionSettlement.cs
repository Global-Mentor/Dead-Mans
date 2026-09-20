using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

internal static class GameQuizQuestionSettlement
{
    // The caller owns the game FOR UPDATE lock and the transaction, and saves
    // these changes while the game is still active. Used by closure and finalization.
    public static async Task CloseAsync(
        ApplicationDbContext dbContext,
        GameQuizQuestionSession session,
        CancellationToken cancellationToken)
    {
        if (session.Status != GameQuizQuestionSessionStatusValue.Open)
        {
            return;
        }

        var correctSubmissions = await dbContext.GameQuizSubmissions
            .Where(x => x.QuestionSessionId == session.Id && x.IsCorrect)
            .ToArrayAsync(cancellationToken);
        var userIds = correctSubmissions.Select(x => x.UserId).ToArray();
        var balances = await dbContext.GameQuizPointLedgerEntries.AsNoTracking()
            .Where(x => x.GameId == session.GameId && userIds.Contains(x.UserId))
            .GroupBy(x => x.UserId)
            .Select(group => new { UserId = group.Key, Balance = group.Sum(x => (long)x.PointsDelta) })
            .ToDictionaryAsync(x => x.UserId, x => x.Balance, cancellationToken);
        foreach (var submission in correctSubmissions)
        {
            submission.AwardedPoints = session.RewardSnapshot;
            if (session.RewardSnapshot <= 0)
            {
                continue;
            }

            var availableBefore = balances.GetValueOrDefault(submission.UserId);
            dbContext.GameQuizPointLedgerEntries.Add(new GameQuizPointLedgerEntry
            {
                Id = Guid.NewGuid(),
                GameId = session.GameId,
                UserId = submission.UserId,
                EntryType = GameQuizPointEntryTypeValue.QuizReward,
                PointsDelta = session.RewardSnapshot,
                QuizSubmissionId = submission.Id,
                AvailablePointsBefore = availableBefore,
                AvailablePointsAfter = availableBefore + session.RewardSnapshot,
                OccurredAtUtc = session.ClosesAtUtc
            });
        }

        session.Status = GameQuizQuestionSessionStatusValue.Closed;
        session.ClosedAtUtc = session.ClosesAtUtc;
    }
}
