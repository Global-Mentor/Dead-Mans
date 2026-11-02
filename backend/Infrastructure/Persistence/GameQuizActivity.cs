using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

internal static class GameQuizActivity
{
    // Callers hold the game row lock before deciding whether another activity can start.
    public static async Task<bool> BlocksModifiersAsync(ApplicationDbContext db, Guid gameId, DateTime now,
        CancellationToken cancellationToken) =>
        await db.GameQuizQuestionSessions.AsNoTracking().AnyAsync(x => x.GameId == gameId
            && x.Status == GameQuizQuestionSessionStatusValue.Open && x.ClosesAtUtc > now, cancellationToken)
        || await db.Set<GameQuizPresentation>().AnyAsync(x => x.GameId == gameId, cancellationToken)
        || await HasPublicationAsync(db, gameId, cancellationToken);

    public static Task<bool> HasPublicationAsync(ApplicationDbContext db, Guid gameId, CancellationToken cancellationToken) =>
        db.TwitchQuizPublications.AsNoTracking().AnyAsync(x => x.GameId == gameId && x.QuestionSessionId == null
            && (x.Status == TwitchQuizPublicationStatuses.Publishing || x.Status == TwitchQuizPublicationStatuses.Failed
                || x.Status == TwitchQuizPublicationStatuses.Uncertain || x.Status == TwitchQuizPublicationStatuses.CancelPending), cancellationToken);

    public static async Task PresentAsync(ApplicationDbContext db, GameQuizQuestionSession session,
        CancellationToken cancellationToken)
    {
        var presentation = await db.Set<GameQuizPresentation>().SingleOrDefaultAsync(x => x.GameId == session.GameId,
            cancellationToken);
        if (session.ImageSnapshotJson is null)
        {
            if (presentation is not null) db.Remove(presentation);
        }
        else if (presentation is null)
            db.Add(new GameQuizPresentation { GameId = session.GameId, QuestionSessionId = session.Id });
        else presentation.QuestionSessionId = session.Id;
    }
}
