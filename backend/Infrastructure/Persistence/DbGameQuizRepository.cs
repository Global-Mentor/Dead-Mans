using backend.Domain.Questions;
using backend.Infrastructure.Twitch;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameQuizRepository : IGameQuizRepository
{
    private readonly ApplicationDbContext _dbContext;
    private readonly TimeProvider _timeProvider;

    public DbGameQuizRepository(ApplicationDbContext dbContext, TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _timeProvider = timeProvider;
    }

    public async Task<Guid?> GetActiveGameIdAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.Games
            .AsNoTracking()
            .Where(x => x.Status == GameStatusValue.Active && !x.IsDeleted)
            .OrderByDescending(x => x.StartedAtUtc ?? x.CreatedAtUtc)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<AvailableGameQuizQuestion>> GetAvailableQuizQuestionsAsync(
        CancellationToken cancellationToken = default
    )
    {
        var gameId = await GetActiveGameIdAsync(cancellationToken);
        if (!gameId.HasValue)
        {
            return Array.Empty<AvailableGameQuizQuestion>();
        }

        var candidates = await _dbContext.GameEnabledQuestions
            .AsNoTracking()
            .Where(enabled =>
                enabled.GameId == gameId.Value
                && enabled.QuestionDefinition.IsEnabled
                && !enabled.QuestionDefinition.IsDeleted
                && !_dbContext.GameQuizQuestionSessions.Any(session =>
                    session.GameId == gameId.Value && session.QuestionId == enabled.QuestionId))
            .OrderByDescending(enabled => enabled.PrioritySnapshot)
            .ThenBy(enabled => enabled.QuestionCodeSnapshot)
            .ToArrayAsync(cancellationToken);
        var game = await _dbContext.Games.AsNoTracking().SingleAsync(x => x.Id == gameId.Value, cancellationToken);
        var recommendations = new HashSet<Guid>();
        foreach (var screenshot in new[] { false, true })
        {
            var compatible = candidates.Where(x => (x.ImageSnapshotJson != null) == screenshot
                && TwitchQuizMessageFormatter.FormatForValidation(x.QuestionTextSnapshot, x.OptionTextsSnapshot,
                    screenshot ? game.ScreenshotAnswerDurationSeconds : game.QuizAnswerDurationSeconds, x.RewardSnapshot).IsCompatible).ToArray();
            if (compatible.Length > 0)
                recommendations.Add((await QuizQuestionPreparation.SelectAsync(_dbContext, gameId.Value, compatible,
                    game.AvoidConsecutiveScreenshotLocations, cancellationToken)).QuestionId);
        }
        return candidates.Select(question =>
        {
            var prepared = QuizQuestionPreparation.Prepare(question);
            return new AvailableGameQuizQuestion(question.QuestionId, question.QuestionCodeSnapshot,
                question.CategoryNameSnapshot, question.QuestionTextSnapshot)
            {
                Image = QuizImageSnapshot.FromJson(question.ImageSnapshotJson),
                Options = prepared.OptionIdsSnapshot.Zip(prepared.OptionTextsSnapshot,
                    (id, text) => new GameQuizOption(id, text, 0)).ToArray(),
                Recommended = recommendations.Contains(question.QuestionId)
            };
        }).ToArray();
    }

    public async Task<AskQuizQuestionRepositoryResult> AskQuizQuestionAsync(
        Guid gameId,
        Guid? questionId,
        GameQuizQuestionDelivery delivery,
        CancellationToken cancellationToken = default
    )
    {
        var useTransaction = _dbContext.Database.IsRelational();
        await using var transaction = useTransaction
            ? await _dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;

        if (useTransaction)
        {
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM games WHERE id = {gameId} FOR UPDATE",
                cancellationToken
            );
        }

        var answerDurationSeconds = await _dbContext.Games.AsNoTracking()
            .Where(x => x.Id == gameId && x.Status == GameStatusValue.Active && !x.IsDeleted)
            .Select(x => new { x.QuizAnswerDurationSeconds, x.ScreenshotAnswerDurationSeconds, x.AvoidConsecutiveScreenshotLocations })
            .FirstOrDefaultAsync(cancellationToken);
        if (answerDurationSeconds is null)
        {
            return new(AskQuizQuestionRepositoryOutcome.Unavailable);
        }

        if (await _dbContext.GameRounds.AsNoTracking().AnyAsync(
            round => round.GameId == gameId && round.Status == GameRoundStatusValue.AwaitingModifiers,
            cancellationToken))
        {
            return new(AskQuizQuestionRepositoryOutcome.ModifierOrderingActive);
        }

        if (await GameQuizActivity.HasPublicationAsync(_dbContext, gameId, cancellationToken))
            return new(AskQuizQuestionRepositoryOutcome.Unavailable);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var openSession = await _dbContext.GameQuizQuestionSessions
            .FirstOrDefaultAsync(
                session => session.GameId == gameId && session.Status == GameQuizQuestionSessionStatusValue.Open,
                cancellationToken
            );
        if (openSession is not null)
        {
            if (openSession.ClosesAtUtc > now)
            {
                return new(AskQuizQuestionRepositoryOutcome.Unavailable);
            }

            await CloseQuestionSessionAsync(openSession, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var candidates = await _dbContext.GameEnabledQuestions
            .AsNoTracking()
            .Where(enabledQuestion =>
                enabledQuestion.GameId == gameId
                && enabledQuestion.QuestionDefinition.IsEnabled
                && !enabledQuestion.QuestionDefinition.IsDeleted
                && (questionId.HasValue ? enabledQuestion.QuestionId == questionId.Value
                    : (enabledQuestion.ImageSnapshotJson != null) == delivery.Screenshot)
                && !_dbContext.GameQuizQuestionSessions.Any(session =>
                    session.GameId == gameId && session.QuestionId == enabledQuestion.QuestionId))
            .ToArrayAsync(cancellationToken);
        if (candidates.Length == 0)
        {
            return new(AskQuizQuestionRepositoryOutcome.Unavailable);
        }

        var selectedQuestion = questionId.HasValue
            ? candidates[0]
            : await QuizQuestionPreparation.SelectAsync(_dbContext, gameId, candidates,
                answerDurationSeconds.AvoidConsecutiveScreenshotLocations, cancellationToken);
        var nextAskOrder =
            (await _dbContext.GameQuizQuestionSessions
                .Where(x => x.GameId == gameId)
                .MaxAsync(x => (int?)x.AskOrder, cancellationToken) ?? 0) + 1;

        var prepared = QuizQuestionPreparation.Prepare(selectedQuestion);

        var manualDelivery = delivery as ManualGameQuizQuestionDelivery;
        var twitchDelivery = delivery as TwitchGameQuizQuestionDelivery;
        var session = new GameQuizQuestionSession
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            QuestionId = prepared.QuestionId,
            AskOrder = nextAskOrder,
            AskedAtUtc = now,
            ClosesAtUtc = now.AddSeconds(prepared.ImageSnapshotJson is null
                ? answerDurationSeconds.QuizAnswerDurationSeconds : answerDurationSeconds.ScreenshotAnswerDurationSeconds),
            AskedByUserId = manualDelivery?.AskedByUserId,
            Status = GameQuizQuestionSessionStatusValue.Open,
            QuestionRevisionSnapshot = prepared.QuestionRevisionSnapshot,
            QuestionCodeSnapshot = prepared.QuestionCodeSnapshot,
            CategoryNameSnapshot = prepared.CategoryNameSnapshot,
            QuestionTextSnapshot = prepared.QuestionTextSnapshot,
            ImageSnapshotJson = prepared.ImageSnapshotJson,
            OptionIdsSnapshot = prepared.OptionIdsSnapshot,
            OptionTextsSnapshot = prepared.OptionTextsSnapshot,
            CorrectOptionIdSnapshot = prepared.CorrectOptionIdSnapshot,
            RewardSnapshot = prepared.RewardSnapshot,
            DeliveryKind = twitchDelivery is null
                ? GameQuizDeliveryKindValue.Manual
                : GameQuizDeliveryKindValue.Twitch,
            SourceChannelId = twitchDelivery?.SourceChannelId.Trim(),
            SourceMessageId = NormalizeOptionalValue(twitchDelivery?.SourceMessageId)
        };

        _dbContext.GameQuizQuestionSessions.Add(session);
        await GameQuizActivity.PresentAsync(_dbContext, session, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return new(AskQuizQuestionRepositoryOutcome.Asked, MapAskedQuestion(session));
    }

    private static AskedQuizQuestion MapAskedQuestion(GameQuizQuestionSession session) => new(
        session.Id,
        session.GameId,
        session.AskOrder,
        session.QuestionId,
        session.QuestionCodeSnapshot,
        session.CategoryNameSnapshot,
        session.QuestionTextSnapshot,
        MapOptions(session),
        session.RewardSnapshot,
        session.AskedAtUtc,
        session.ClosesAtUtc
    )
    { Image = QuizImageSnapshot.FromJson(session.ImageSnapshotJson) };

}
