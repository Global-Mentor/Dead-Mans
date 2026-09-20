using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameQuizRepository
{
    public async Task<CloseExpiredQuizQuestionSessionsResult> CloseExpiredQuizQuestionSessionsAsync(
        CancellationToken cancellationToken = default
    )
    {
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var dueQuestionSessionIds = await _dbContext.GameQuizQuestionSessions.AsNoTracking()
            .Where(x =>
                x.Status == GameQuizQuestionSessionStatusValue.Open
                && x.ClosesAtUtc <= now
                && x.Game != null
                && x.Game.Status == GameStatusValue.Active
                && !x.Game.IsDeleted)
            .Select(x => new { x.Id, x.GameId })
            .ToArrayAsync(cancellationToken);
        if (dueQuestionSessionIds.Length == 0)
        {
            return new(Array.Empty<Guid>(), 0);
        }

        var closedGameIds = new HashSet<Guid>();
        foreach (var due in dueQuestionSessionIds)
        {
            var useTransaction = _dbContext.Database.IsRelational();
            await using var transaction = useTransaction
                ? await _dbContext.Database.BeginTransactionAsync(cancellationToken)
                : null;
            if (useTransaction)
            {
                await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"SELECT 1 FROM games WHERE id = {due.GameId} FOR UPDATE", cancellationToken);
                await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"SELECT 1 FROM game_quiz_question_sessions WHERE id = {due.Id} FOR UPDATE",
                    cancellationToken);
            }
            var session = await _dbContext.GameQuizQuestionSessions
                .SingleOrDefaultAsync(x => x.Id == due.Id, cancellationToken);
            if (session is null) continue;
            if (useTransaction) await _dbContext.Entry(session).ReloadAsync(cancellationToken);
            if (session.Status != GameQuizQuestionSessionStatusValue.Open) continue;

            await CloseQuestionSessionAsync(session, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
            if (transaction is not null)
            {
                await transaction.CommitAsync(cancellationToken);
            }
            closedGameIds.Add(session.GameId);
        }

        return new(closedGameIds.ToArray(), closedGameIds.Count);
    }

    private Task CloseQuestionSessionAsync(GameQuizQuestionSession session, CancellationToken cancellationToken) =>
        GameQuizQuestionSettlement.CloseAsync(_dbContext, session, cancellationToken);

}
