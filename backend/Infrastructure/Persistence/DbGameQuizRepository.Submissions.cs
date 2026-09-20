using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameQuizRepository
{
    public async Task<SubmitQuizAnswerRepositoryResult> SubmitQuizAnswerAsync(
        Guid questionSessionId,
        SubmitGameQuizAnswerInput input,
        CancellationToken cancellationToken = default
    )
    {
        var result = await TrySubmitQuizAnswerAsync(questionSessionId, input, cancellationToken);
        // Release shared locks before acquiring the exclusive closure locks.
        if (result.Outcome == SubmitQuizAnswerRepositoryOutcome.QuestionSessionClosed)
        {
            var closed = await CloseExpiredQuizQuestionSessionsAsync(cancellationToken);
            return result with { ClosedGameId = closed.ClosedGameIds.Count == 0 ? null : closed.ClosedGameIds[0] };
        }
        return result;
    }

    private async Task<SubmitQuizAnswerRepositoryResult> TrySubmitQuizAnswerAsync(
        Guid questionSessionId,
        SubmitGameQuizAnswerInput input,
        CancellationToken cancellationToken
    )
    {
        var gameId = await _dbContext.GameQuizQuestionSessions.AsNoTracking()
            .Where(x => x.Id == questionSessionId && !x.Game!.IsDeleted)
            .Select(x => (Guid?)x.GameId)
            .FirstOrDefaultAsync(cancellationToken);
        if (!gameId.HasValue)
        {
            return new(SubmitQuizAnswerRepositoryOutcome.QuestionSessionNotFound);
        }

        await using var transaction = _dbContext.Database.IsRelational()
            ? await _dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;
        if (transaction is not null)
        {
            // Readers may submit concurrently. Closure/finalization take FOR UPDATE
            // in the same game -> session order and wait for accepted submissions.
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM games WHERE id = {gameId.Value} FOR SHARE", cancellationToken);
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM game_quiz_question_sessions WHERE id = {questionSessionId} FOR SHARE",
                cancellationToken);
        }

        var session = await _dbContext.GameQuizQuestionSessions.AsNoTracking()
            .SingleAsync(x => x.Id == questionSessionId, cancellationToken);
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var attribution = await ResolveAnswerAttributionAsync(input.Source, cancellationToken);
        if (attribution is null)
        {
            return new(SubmitQuizAnswerRepositoryOutcome.PlayerNotFound);
        }

        var existing = await FindSubmissionAsync(questionSessionId, attribution.UserId, cancellationToken);
        if (existing is not null)
        {
            return ExistingSubmissionResult(existing, input.SelectedOptionId);
        }
        if (session.Status != GameQuizQuestionSessionStatusValue.Open || now >= session.ClosesAtUtc)
        {
            return new(SubmitQuizAnswerRepositoryOutcome.QuestionSessionClosed);
        }

        var optionIndex = Array.IndexOf(session.OptionIdsSnapshot, input.SelectedOptionId);
        if (optionIndex < 0)
        {
            return new(SubmitQuizAnswerRepositoryOutcome.OptionNotFound);
        }

        var submission = new GameQuizSubmission
        {
            Id = Guid.NewGuid(),
            GameId = session.GameId,
            QuestionSessionId = session.Id,
            UserId = attribution.UserId,
            CapturedByUserId = attribution.CapturedByUserId,
            SelectedOptionId = input.SelectedOptionId,
            SelectedOptionTextSnapshot = session.OptionTextsSnapshot[optionIndex],
            IsCorrect = input.SelectedOptionId == session.CorrectOptionIdSnapshot,
            AwardedPoints = 0,
            TwitchUserIdSnapshot = attribution.TwitchUserId,
            LoginSnapshot = attribution.Login,
            DisplayNameSnapshot = attribution.DisplayName,
            SourceProvider = attribution.SourceProvider,
            SourceChannelId = attribution.SourceChannelId,
            SourceMessageId = attribution.SourceMessageId,
            SubmittedAtUtc = now
        };
        _dbContext.GameQuizSubmissions.Add(submission);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            if (transaction is not null)
            {
                await transaction.CommitAsync(cancellationToken);
            }
        }
        catch (DbUpdateException exception) when (
            PostgresUniqueViolation.TryGetConstraintName(exception, out var constraint)
            && constraint == "ix_game_quiz_submissions_question_session_id_user_id")
        {
            if (transaction is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }
            _dbContext.Entry(submission).State = EntityState.Detached;
            var winner = await FindSubmissionAsync(questionSessionId, attribution.UserId, cancellationToken);
            if (winner is null) throw;
            return ExistingSubmissionResult(winner, input.SelectedOptionId);
        }

        return new(SubmitQuizAnswerRepositoryOutcome.Accepted, MapReceipt(submission, false));
    }

    private Task<GameQuizSubmission?> FindSubmissionAsync(
        Guid questionSessionId, Guid userId, CancellationToken cancellationToken) =>
        _dbContext.GameQuizSubmissions.AsNoTracking().SingleOrDefaultAsync(
            x => x.QuestionSessionId == questionSessionId && x.UserId == userId, cancellationToken);

    private static SubmitQuizAnswerRepositoryResult ExistingSubmissionResult(
        GameQuizSubmission submission, Guid selectedOptionId) =>
        submission.SelectedOptionId == selectedOptionId
            ? new(SubmitQuizAnswerRepositoryOutcome.Existing, MapReceipt(submission, true))
            : new(SubmitQuizAnswerRepositoryOutcome.AlreadyAnswered);

    private static GameQuizSubmissionReceipt MapReceipt(GameQuizSubmission submission, bool existing) =>
        new(
            submission.Id,
            submission.QuestionSessionId,
            submission.UserId,
            submission.SelectedOptionId,
            submission.SubmittedAtUtc,
            existing
        );

    private async Task<ResolvedQuizAnswerAttribution?> ResolveAnswerAttributionAsync(
        GameQuizAnswerSource source,
        CancellationToken cancellationToken
    )
    {
        if (source is WebGameQuizAnswerSource web)
        {
            var user = await LoadActiveUserAsync(web.UserId, cancellationToken);
            return user is null ? null : FromUser(user, null, GameQuizAnswerSourceValue.Web);
        }

        if (source is ManualGameQuizAnswerSource manual)
        {
            var user = await LoadActiveUserAsync(manual.AwardedToUserId, cancellationToken);
            return user is null
                ? null
                : FromUser(
                    user,
                    manual.CapturedByUserId,
                    GameQuizAnswerSourceValue.Manual
                );
        }

        if (source is not TwitchGameQuizAnswerSource twitch)
        {
            return null;
        }

        var twitchUserId = twitch.TwitchUserId.Trim();
        var userEntity = await _dbContext.Users.AsNoTracking().SingleOrDefaultAsync(
            user => user.TwitchUserId == twitchUserId && user.IsActive, cancellationToken);
        if (userEntity is null) return null;

        return new ResolvedQuizAnswerAttribution(
            userEntity.Id,
            null,
            userEntity.TwitchUserId,
            userEntity.Login,
            userEntity.DisplayName,
            GameQuizAnswerSourceValue.Twitch,
            twitch.SourceChannelId.Trim(),
            twitch.SourceMessageId.Trim()
        );
    }

    private async Task<User?> LoadActiveUserAsync(Guid userId, CancellationToken cancellationToken) =>
        await _dbContext.Users.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == userId && x.IsActive, cancellationToken);

    private static ResolvedQuizAnswerAttribution FromUser(
        User user,
        Guid? capturedByUserId,
        string source
    ) => new(
        user.Id,
        capturedByUserId,
        user.TwitchUserId,
        user.Login,
        user.DisplayName,
        source,
        null,
        null
    );

    private static string? NormalizeOptionalValue(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrEmpty(normalized) ? null : normalized;
    }

    private sealed record ResolvedQuizAnswerAttribution(
        Guid UserId,
        Guid? CapturedByUserId,
        string TwitchUserId,
        string Login,
        string DisplayName,
        string SourceProvider,
        string? SourceChannelId,
        string? SourceMessageId
    );
}
