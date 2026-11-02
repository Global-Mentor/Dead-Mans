using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameQuizRepository
{
    public async Task<Guid?> HideScreenshotAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        var gameId = await _dbContext.GameQuizQuestionSessions.AsNoTracking().Where(x => x.Id == sessionId)
            .Select(x => (Guid?)x.GameId).SingleOrDefaultAsync(cancellationToken);
        if (gameId is null) return null;
        await using var transaction = _dbContext.Database.IsRelational()
            ? await _dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
        if (transaction is not null)
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM games WHERE id = {gameId.Value} FOR UPDATE", cancellationToken);
        var session = await _dbContext.GameQuizQuestionSessions.AsNoTracking().SingleAsync(x => x.Id == sessionId, cancellationToken);
        if (session.Status == GameQuizQuestionSessionStatusValue.Open || session.ImageSnapshotJson is null) return null;
        var presentation = await _dbContext.Set<GameQuizPresentation>().SingleOrDefaultAsync(x => x.GameId == gameId, cancellationToken);
        // A delayed hide command must not dismiss a newer screenshot.
        if (presentation is not null && presentation.QuestionSessionId != sessionId) return null;
        if (presentation is not null) _dbContext.Remove(presentation);
        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return gameId;
    }
}
