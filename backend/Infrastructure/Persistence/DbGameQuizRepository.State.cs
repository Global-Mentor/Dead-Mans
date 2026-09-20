using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameQuizRepository
{
    public async Task<CurrentGameQuizState?> GetCurrentQuizStateAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        var gameId = await GetActiveGameIdAsync(cancellationToken);
        if (!gameId.HasValue)
        {
            return null;
        }

        var session = await _dbContext.GameQuizQuestionSessions.AsNoTracking()
            .Where(x => x.GameId == gameId.Value)
            .OrderByDescending(x => x.AskOrder)
            .FirstOrDefaultAsync(cancellationToken);
        if (session is null) return null;
        var own = await FindSubmissionAsync(session.Id, userId, cancellationToken);
        var counts = session.Status == GameQuizQuestionSessionStatusValue.Closed
            ? await _dbContext.GameQuizSubmissions.AsNoTracking()
                .Where(x => x.QuestionSessionId == session.Id)
                .GroupBy(x => x.SelectedOptionId)
                .Select(group => new { OptionId = group.Key, Count = group.Count() })
                .ToDictionaryAsync(x => x.OptionId, x => x.Count, cancellationToken)
            : new Dictionary<Guid, int>();
        return MapCurrentState(session, own, counts);
    }

    private static CurrentGameQuizState MapCurrentState(
        GameQuizQuestionSession session, GameQuizSubmission? own, IReadOnlyDictionary<Guid, int> counts)
    {
        var isClosed = session.Status == GameQuizQuestionSessionStatusValue.Closed;
        GameQuizOptionResult[]? results = null;
        if (isClosed)
        {
            var total = counts.Values.Sum();
            results = session.OptionIdsSnapshot.Select(optionId =>
            {
                var count = counts.GetValueOrDefault(optionId);
                return new GameQuizOptionResult(
                    optionId,
                    count,
                    total == 0 ? 0m : Math.Round(100m * count / total, 2)
                );
            }).ToArray();
        }

        return new CurrentGameQuizState(
            session.Id,
            session.GameId,
            session.AskOrder,
            session.QuestionId,
            session.QuestionCodeSnapshot,
            session.CategoryNameSnapshot,
            session.QuestionTextSnapshot,
            MapOptions(session),
            isClosed ? session.RewardSnapshot : null,
            session.Status,
            session.AskedAtUtc,
            session.ClosesAtUtc,
            session.ClosedAtUtc,
            own?.SelectedOptionId,
            own?.SubmittedAtUtc,
            isClosed ? session.CorrectOptionIdSnapshot : null,
            isClosed ? own?.IsCorrect : null,
            isClosed ? own?.AwardedPoints : null,
            isClosed ? counts.Values.Sum() : null,
            results
        );
    }

    private static GameQuizOption[] MapOptions(GameQuizQuestionSession session) =>
        session.OptionIdsSnapshot
            .Zip(session.OptionTextsSnapshot, (id, text) => (id, text))
            .Select((option, index) => new GameQuizOption(option.id, option.text, index))
            .ToArray();

}
