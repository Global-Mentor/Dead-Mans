using backend.Application.Contracts;
using backend.Application.Features.Scoring;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameOverlayRepository
{
    private Task<int> CountLeaderboardEntriesAsync(Guid gameId, string kind, CancellationToken cancellationToken) =>
        kind == "quiz"
            ? db.GameQuizSubmissions.Where(row => row.GameId == gameId
                    && row.QuestionSession.Status == GameQuizQuestionSessionStatusValue.Closed)
                .Select(row => row.UserId)
                .Union(db.GameQuizPointLedgerEntries.Where(row => row.GameId == gameId
                    && row.EntryType == GameQuizPointEntryTypeValue.ManualAdjustment).Select(row => row.UserId))
                .CountAsync(cancellationToken)
            : db.GameTeams.CountAsync(team => team.GameId == gameId
                && team.Status == TeamStatusValue.Confirmed && team.DisbandedAtUtc == null, cancellationToken);

    private async Task<IReadOnlyList<GameOverlayQuizLeaderboardEntry>> ReadQuizLeaderboardAsync(Guid gameId, CancellationToken cancellationToken)
    {
        var answers = await db.GameQuizSubmissions.AsNoTracking()
            .Where(row => row.GameId == gameId && row.QuestionSession.Status == GameQuizQuestionSessionStatusValue.Closed)
            .OrderBy(row => row.SubmittedAtUtc).ThenBy(row => row.Id)
            .Select(row => new GameQuizLeaderboardFact(row.UserId,
                !string.IsNullOrWhiteSpace(row.DisplayNameSnapshot) ? row.DisplayNameSnapshot
                    : !string.IsNullOrWhiteSpace(row.User.DisplayName) ? row.User.DisplayName : row.UserId.ToString(),
                row.AwardedPoints, true, row.IsCorrect, row.SubmittedAtUtc)).ToArrayAsync(cancellationToken);
        var adjustments = await db.GameQuizPointLedgerEntries.AsNoTracking()
            .Where(row => row.GameId == gameId && row.EntryType == GameQuizPointEntryTypeValue.ManualAdjustment)
            .OrderBy(row => row.SequenceNumber)
            .Select(row => new GameQuizLeaderboardFact(row.UserId,
                !string.IsNullOrWhiteSpace(row.User.DisplayName) ? row.User.DisplayName : row.UserId.ToString(),
                row.PointsDelta, false, false, row.OccurredAtUtc)).ToArrayAsync(cancellationToken);
        return GameQuizLeaderboardCalculator.Calculate(answers.Concat(adjustments))
            .Select(row => new GameOverlayQuizLeaderboardEntry(row.DisplayName, row.Points, row.Attempts, row.CorrectAnswers)).ToArray();
    }
}
