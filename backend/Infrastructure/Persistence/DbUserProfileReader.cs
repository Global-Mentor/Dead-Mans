using System.Data;
using backend.Application.Abstractions;
using backend.Application.Contracts;
using backend.Application.Features.Scoring;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Domain.Questions;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbUserProfileReader(ApplicationDbContext db, TimeProvider timeProvider) : IUserProfileReader
{
    public async Task<UserProfile?> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var transaction = db.Database.IsRelational() && db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, cancellationToken) : null;
        var playerGames = ParticipatedGames(userId, UserProfileParticipation.Player);
        var quizGames = ParticipatedGames(userId, UserProfileParticipation.Quiz);
        var answers = ClosedAnswers(userId);
        var row = await db.Users.AsNoTracking().Where(user => user.Id == userId && user.IsActive)
            .Select(user => new
            {
                user.Id,
                user.Login,
                user.DisplayName,
                user.ProfileImageUrl,
                PlayerGameCount = playerGames.Count(),
                QuizGameCount = quizGames.Count(),
                AnswerCount = answers.Count(),
                CorrectAnswerCount = answers.Count(answer => answer.IsCorrect),
                FinishedPlayerGameCount = playerGames.Count(game => game.Status == GameStatusValue.Finished),
                CompletedRoundCount = db.GameRoundParticipants.Count(participant => participant.UserId == userId
                    && participant.Round.Status == GameRoundStatusValue.Completed
                    && !participant.Round.Game.IsDeleted && participant.Round.Game.Status != GameStatusValue.Draft),
                AwardedQuizPoints = answers.Sum(answer => (long)answer.AwardedPoints)
            })
            .SingleOrDefaultAsync(cancellationToken);
        if (row is null) return null;
        var statistics = await ReadStatisticsAsync(userId, row.FinishedPlayerGameCount,
            row.CompletedRoundCount, SaturatingInt32.From(row.AwardedQuizPoints), cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return new(row.Id, row.Login, row.DisplayName, row.ProfileImageUrl,
            row.PlayerGameCount, row.QuizGameCount, row.AnswerCount, row.CorrectAnswerCount, statistics);
    }

    public async Task<UserProfileGamesPage?> GetGamesAsync(Guid userId, UserProfileParticipation participation, int page, int pageSize,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = db.Database.IsRelational() && db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, cancellationToken) : null;
        if (!await db.Users.AnyAsync(user => user.Id == userId && user.IsActive, cancellationToken)) return null;
        var games = ParticipatedGames(userId, participation);
        var total = await games.CountAsync(cancellationToken);
        page = Math.Clamp(page, 1, Math.Max(1, (int)Math.Ceiling((double)total / pageSize)));
        var pageGames = games.OrderByDescending(game => game.StartedAtUtc ?? game.CreatedAtUtc).ThenByDescending(game => game.Id)
            .Skip((page - 1) * pageSize).Take(pageSize);
        var items = await ProjectGames(pageGames, userId).ToArrayAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return new(items, total, page, pageSize);
    }

    public async Task<UserProfileAnswersPage?> GetAnswersAsync(Guid userId, Guid? gameId, int page, int pageSize,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = db.Database.IsRelational() && db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, cancellationToken) : null;
        if (!await db.Users.AnyAsync(user => user.Id == userId && user.IsActive, cancellationToken)) return null;
        var answers = ClosedAnswers(userId);
        if (gameId is { } selectedGame) answers = answers.Where(answer => answer.GameId == selectedGame);
        var total = await answers.CountAsync(cancellationToken);
        page = Math.Clamp(page, 1, Math.Max(1, (int)Math.Ceiling((double)total / pageSize)));
        var rows = await answers.OrderByDescending(answer => answer.SubmittedAtUtc).ThenByDescending(answer => answer.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(answer => new
            {
                answer.QuestionSessionId,
                answer.QuestionSession.QuestionId,
                answer.GameId,
                GameTitle = answer.QuestionSession.Game!.Title,
                answer.QuestionSession.QuestionTextSnapshot,
                answer.QuestionSession.CategoryNameSnapshot,
                answer.SelectedOptionId,
                answer.SelectedOptionTextSnapshot,
                answer.IsCorrect,
                answer.AwardedPoints,
                answer.SubmittedAtUtc,
                answer.QuestionSession.ImageSnapshotJson
            }).ToArrayAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return new(rows.Select(row => new UserProfileAnswer(row.QuestionSessionId, row.QuestionId, row.GameId, row.GameTitle,
            row.QuestionTextSnapshot, row.CategoryNameSnapshot, row.SelectedOptionId, row.SelectedOptionTextSnapshot,
            row.IsCorrect, row.AwardedPoints, row.SubmittedAtUtc, QuizImageSnapshot.FromJson(row.ImageSnapshotJson))).ToArray(),
            total, page, pageSize);
    }

    private IQueryable<UserProfileGame> ProjectGames(IQueryable<Game> games, Guid userId)
    {
        var answers = ClosedAnswers(userId);
        return games.Select(game => new UserProfileGame(game.Id, game.Title, game.Status, game.StartedAtUtc, game.FinishedAtUtc,
            db.GameRoundParticipants.Count(participant => participant.UserId == userId && participant.Round.GameId == game.Id
                && participant.Round.Status == GameRoundStatusValue.Completed),
            answers.Count(answer => answer.GameId == game.Id),
            answers.Count(answer => answer.GameId == game.Id && answer.IsCorrect)));
    }

    private IQueryable<Game> ParticipatedGames(Guid userId, UserProfileParticipation participation)
    {
        var games = db.Games.AsNoTracking().Where(game => !game.IsDeleted && game.Status != GameStatusValue.Draft);
        return participation switch
        {
            UserProfileParticipation.Player => games.Where(game =>
                db.GameTeamMembers.Any(member => member.GameId == game.Id && member.UserId == userId && member.LeftAtUtc == null)
                || db.GameRoundParticipants.Any(participant => participant.UserId == userId && participant.Round.GameId == game.Id)),
            UserProfileParticipation.Quiz => games.Where(game => db.GameQuizSubmissions.Any(answer =>
                answer.UserId == userId && answer.GameId == game.Id && answer.QuestionSession.Status == GameQuizQuestionSessionStatusValue.Closed)),
            _ => throw new ArgumentOutOfRangeException(nameof(participation), participation, null)
        };
    }

    private IQueryable<GameQuizSubmission> ClosedAnswers(Guid userId) => db.GameQuizSubmissions.AsNoTracking()
        .Where(answer => answer.UserId == userId && answer.QuestionSession.Status == GameQuizQuestionSessionStatusValue.Closed
            && answer.QuestionSession.Game != null && !answer.QuestionSession.Game.IsDeleted
            && answer.QuestionSession.Game.Status != GameStatusValue.Draft);
}
