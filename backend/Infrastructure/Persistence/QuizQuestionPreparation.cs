using backend.Data;
using backend.Data.Entities;
using backend.Domain.Questions;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

internal static class QuizQuestionPreparation
{
    public static PreparedQuizQuestionSnapshot Prepare(GameEnabledQuestion question)
    {
        if (question.OptionIdsSnapshot.Length != question.OptionTextsSnapshot.Length
            || question.OptionIdsSnapshot.Length < 2
            || question.OptionIdsSnapshot.Distinct().Count() != question.OptionIdsSnapshot.Length
            || !question.OptionIdsSnapshot.Contains(question.CorrectOptionIdSnapshot))
            throw new InvalidOperationException("The published question option snapshot is invalid.");
        var options = question.OptionIdsSnapshot.Zip(question.OptionTextsSnapshot, (id, text) => (Id: id, Text: text)).ToArray();
        Random.Shared.Shuffle(options);
        return new(question.QuestionId, question.QuestionRevisionSnapshot, question.QuestionCodeSnapshot,
            question.CategoryNameSnapshot, question.QuestionTextSnapshot, question.ImageSnapshotJson,
            options.Select(x => x.Id).ToArray(), options.Select(x => x.Text).ToArray(),
            question.CorrectOptionIdSnapshot, question.RewardSnapshot);
    }

    public static async Task<GameEnabledQuestion> SelectAsync(
        ApplicationDbContext db, Guid gameId, IReadOnlyList<GameEnabledQuestion> candidates,
        bool avoidConsecutiveLocations, CancellationToken cancellationToken)
    {
        var eligible = candidates;
        if (avoidConsecutiveLocations)
        {
            var previousQuestionId = await db.GameQuizQuestionSessions.AsNoTracking()
                .Where(x => x.GameId == gameId && x.ImageSnapshotJson != null)
                .OrderByDescending(x => x.AskOrder)
                .Select(x => (Guid?)x.QuestionId).FirstOrDefaultAsync(cancellationToken);
            var previousLocation = await db.Set<QuestionScreenshot>().AsNoTracking()
                .Where(x => x.QuestionId == previousQuestionId).Select(x => x.LocationId)
                .FirstOrDefaultAsync(cancellationToken);
            if (previousLocation.HasValue)
            {
                var candidateIds = candidates.Select(x => x.QuestionId).ToArray();
                var sameLocationIds = await db.Set<QuestionScreenshot>().AsNoTracking()
                    .Where(x => candidateIds.Contains(x.QuestionId) && x.LocationId == previousLocation)
                    .Select(x => x.QuestionId).ToArrayAsync(cancellationToken);
                var alternatives = candidates.Where(x => !sameLocationIds.Contains(x.QuestionId)).ToArray();
                if (alternatives.Length > 0) eligible = alternatives;
            }
        }
        var ids = eligible.Select(x => x.QuestionId).ToArray();
        var usage = await db.GameQuizQuestionSessions.AsNoTracking()
            .Where(x => ids.Contains(x.QuestionId)).GroupBy(x => x.QuestionId)
            .Select(group => new { QuestionId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(x => x.QuestionId, x => x.Count, cancellationToken);
        return QuizQuestionSelection.Select(eligible, x => usage.GetValueOrDefault(x.QuestionId), x => x.PrioritySnapshot);
    }
}

internal sealed record PreparedQuizQuestionSnapshot(
    Guid QuestionId, int QuestionRevisionSnapshot, string QuestionCodeSnapshot,
    string CategoryNameSnapshot, string QuestionTextSnapshot, string? ImageSnapshotJson,
    Guid[] OptionIdsSnapshot, string[] OptionTextsSnapshot, Guid CorrectOptionIdSnapshot, int RewardSnapshot);
