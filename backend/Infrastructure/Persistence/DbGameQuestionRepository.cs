using System.Text;
using System.Linq.Expressions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed class DbGameQuestionRepository : IGameQuestionRepository
{
    private readonly ApplicationDbContext _dbContext;

    public DbGameQuestionRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<GameQuestionCatalogItem>> GetCatalogAsync(
        string? vectorCode,
        string? category,
        string? search,
        bool includeDisabled,
        CancellationToken cancellationToken = default
    )
    {
        var normalizedVectorCode = NormalizeFilter(vectorCode);
        var normalizedCategory = NormalizeFilter(category);
        var normalizedSearch = NormalizeFilter(search);

        var query = _dbContext.QuestionDefinitions.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(normalizedVectorCode))
        {
            query = query.Where(x => x.VectorCode == normalizedVectorCode);
        }

        if (!string.IsNullOrWhiteSpace(normalizedCategory))
        {
            query = query.Where(x => x.Category == normalizedCategory);
        }

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            var searchLower = normalizedSearch.ToLowerInvariant();
            query = query.Where(
                x =>
                    EF.Functions.ILike(x.Text, $"%{searchLower}%")
                    || EF.Functions.ILike(x.Answer, $"%{searchLower}%")
            );
        }

        if (!includeDisabled)
        {
            query = query.Where(x => x.IsEnabled);
        }

        return await query
            .OrderBy(x => x.VectorCode)
            .ThenBy(x => x.Category)
            .ThenBy(x => x.SortOrder)
            .Select(ToCatalogItemSelector())
            .ToArrayAsync(cancellationToken);
    }

    public async Task<bool> SetQuestionEnabledAsync(
        Guid questionId,
        bool isEnabled,
        CancellationToken cancellationToken = default
    )
    {
        var question = await _dbContext.QuestionDefinitions.FirstOrDefaultAsync(
            x => x.Id == questionId,
            cancellationToken
        );
        if (question is null)
        {
            return false;
        }

        question.IsEnabled = isEnabled;
        question.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<int> SetCategoryEnabledAsync(
        string? vectorCode,
        string category,
        bool isEnabled,
        CancellationToken cancellationToken = default
    )
    {
        var normalizedCategory = NormalizeFilter(category);
        if (string.IsNullOrWhiteSpace(normalizedCategory))
        {
            return 0;
        }

        var normalizedVectorCode = NormalizeFilter(vectorCode);

        var query = _dbContext.QuestionDefinitions.Where(x => x.Category == normalizedCategory);
        if (!string.IsNullOrWhiteSpace(normalizedVectorCode))
        {
            query = query.Where(x => x.VectorCode == normalizedVectorCode);
        }

        var affected = await query.ExecuteUpdateAsync(
            setters =>
                setters
                    .SetProperty(x => x.IsEnabled, isEnabled)
                    .SetProperty(x => x.UpdatedAtUtc, DateTime.UtcNow),
            cancellationToken
        );
        return affected;
    }

    public async Task<Guid?> GetActiveGameIdAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Games
            .AsNoTracking()
            .Where(x => x.Status == GameStatusValue.Active)
            .OrderByDescending(x => x.StartedAtUtc ?? x.CreatedAtUtc)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<AskedGameQuestion?> AskNextQuestionAsync(
        Guid gameId,
        Guid? askedByUserId,
        CancellationToken cancellationToken = default
    )
    {
        var useTransaction = _dbContext.Database.IsRelational();
        await using var transaction = useTransaction
            ? await _dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;

        var alreadyAskedQuestionIds = await _dbContext.GameQuestionRounds
            .AsNoTracking()
            .Where(x => x.GameId == gameId)
            .Select(x => x.QuestionId)
            .ToArrayAsync(cancellationToken);

        var candidates = await _dbContext.QuestionDefinitions
            .Where(
                x =>
                    x.IsEnabled
                    && x.Vector != null
                    && x.Vector.IsEnabled
                    && !alreadyAskedQuestionIds.Contains(x.Id)
            )
            .OrderBy(x => x.AskedTotalCount)
            .ThenBy(x => x.LastAskedAtUtc)
            .ThenBy(x => x.SortOrder)
            .Take(25)
            .ToArrayAsync(cancellationToken);

        if (candidates.Length == 0)
        {
            return null;
        }

        var selectedQuestion = candidates[Random.Shared.Next(candidates.Length)];
        var nextAskOrder =
            (await _dbContext.GameQuestionRounds
                .Where(x => x.GameId == gameId)
                .MaxAsync(x => (int?)x.AskOrder, cancellationToken)
                ?? 0) + 1;

        var now = DateTime.UtcNow;
        var round = new GameQuestionRound
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            QuestionId = selectedQuestion.Id,
            AskOrder = nextAskOrder,
            AskedAtUtc = now,
            AskedByUserId = askedByUserId,
            Status = GameQuestionRoundStatusValue.Asked
        };

        selectedQuestion.AskedTotalCount += 1;
        selectedQuestion.LastAskedAtUtc = now;
        selectedQuestion.UpdatedAtUtc = now;

        _dbContext.GameQuestionRounds.Add(round);
        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return new AskedGameQuestion(
            round.Id,
            gameId,
            nextAskOrder,
            selectedQuestion.Id,
            selectedQuestion.VectorCode,
            selectedQuestion.ExternalCode,
            selectedQuestion.Category,
            selectedQuestion.Text,
            selectedQuestion.Reward,
            now
        );
    }

    public async Task<GameQuestionRoundSummary?> AnswerRoundAsync(
        Guid roundId,
        Guid? answeredByUserId,
        string? answeredByDisplayName,
        string submittedAnswer,
        CancellationToken cancellationToken = default
    )
    {
        var round = await _dbContext.GameQuestionRounds
            .Include(x => x.Question)
            .FirstOrDefaultAsync(x => x.Id == roundId, cancellationToken);
        if (round is null || round.Question is null)
        {
            return null;
        }

        if (round.Status != GameQuestionRoundStatusValue.Asked)
        {
            return null;
        }

        var normalizedSubmittedAnswer = NormalizeAnswer(submittedAnswer);
        var isCorrect = normalizedSubmittedAnswer == round.Question.NormalizedAnswer;
        var now = DateTime.UtcNow;

        round.SubmittedAnswer = submittedAnswer.Trim();
        round.AnsweredByUserId = answeredByUserId;
        round.AnsweredByDisplayName = NormalizeDisplayName(answeredByDisplayName);
        round.AnsweredAtUtc = now;
        round.IsCorrect = isCorrect;
        round.AwardedPoints = isCorrect ? round.Question.Reward : 0;
        round.Status = isCorrect
            ? GameQuestionRoundStatusValue.AnsweredCorrect
            : GameQuestionRoundStatusValue.AnsweredWrong;

        if (isCorrect)
        {
            round.Question.CorrectTotalCount += 1;
            round.Question.UpdatedAtUtc = now;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapRoundSummary(round, round.Question);
    }

    public async Task<GameQuestionRoundSummary?> GetRoundAsync(
        Guid roundId,
        CancellationToken cancellationToken = default
    )
    {
        var round = await _dbContext.GameQuestionRounds
            .AsNoTracking()
            .Where(x => x.Id == roundId)
            .Select(
                x =>
                    new
                    {
                        Round = x,
                        QuestionText = x.Question != null ? x.Question.Text : string.Empty,
                        Category = x.Question != null ? x.Question.Category : string.Empty,
                        Reward = x.Question != null ? x.Question.Reward : 0
                    }
            )
            .FirstOrDefaultAsync(cancellationToken);
        if (round is null)
        {
            return null;
        }

        return GameQuestionRoundSummaryFactory.Create(
            round.Round.Id,
            round.Round.GameId,
            round.Round.AskOrder,
            round.Round.QuestionId,
            round.QuestionText,
            round.Category,
            round.Reward,
            round.Round.Status,
            round.Round.AskedAtUtc,
            round.Round.AnsweredAtUtc,
            round.Round.AnsweredByDisplayName,
            round.Round.AnsweredByUserId,
            round.Round.SubmittedAnswer,
            round.Round.IsCorrect,
            round.Round.AwardedPoints
        );
    }

    public async Task<IReadOnlyList<GameQuestionRoundSummary>> GetGameHistoryAsync(
        Guid gameId,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext.GameQuestionRounds
            .AsNoTracking()
            .Where(x => x.GameId == gameId)
            .OrderBy(x => x.AskOrder)
            .Select(
                x =>
                    GameQuestionRoundSummaryFactory.Create(
                        x.Id,
                        x.GameId,
                        x.AskOrder,
                        x.QuestionId,
                        x.Question != null ? x.Question.Text : string.Empty,
                        x.Question != null ? x.Question.Category : string.Empty,
                        x.Question != null ? x.Question.Reward : 0,
                        x.Status,
                        x.AskedAtUtc,
                        x.AnsweredAtUtc,
                        x.AnsweredByDisplayName,
                        x.AnsweredByUserId,
                        x.SubmittedAnswer,
                        x.IsCorrect,
                        x.AwardedPoints
                    )
            )
            .ToArrayAsync(cancellationToken);
    }

    private static Expression<Func<QuestionDefinition, GameQuestionCatalogItem>>
        ToCatalogItemSelector()
    {
        return x =>
            new GameQuestionCatalogItem(
                x.Id,
                x.VectorCode,
                x.ExternalCode,
                x.Category,
                x.Text,
                x.Answer,
                x.Reward,
                x.IsEnabled,
                x.AskedTotalCount,
                x.CorrectTotalCount,
                x.LastAskedAtUtc
            );
    }

    private static GameQuestionRoundSummary MapRoundSummary(
        GameQuestionRound round,
        QuestionDefinition question
    )
    {
        return GameQuestionRoundSummaryFactory.Create(
            round.Id,
            round.GameId,
            round.AskOrder,
            round.QuestionId,
            question.Text,
            question.Category,
            question.Reward,
            round.Status,
            round.AskedAtUtc,
            round.AnsweredAtUtc,
            round.AnsweredByDisplayName,
            round.AnsweredByUserId,
            round.SubmittedAnswer,
            round.IsCorrect,
            round.AwardedPoints
        );
    }

    private static string NormalizeFilter(string? value)
    {
        return (value ?? string.Empty).Trim();
    }

    private static string? NormalizeDisplayName(string? displayName)
    {
        var normalized = (displayName ?? string.Empty).Trim();
        return normalized.Length == 0 ? null : normalized;
    }

    private static string NormalizeAnswer(string answer)
    {
        var input = answer.Trim().ToLowerInvariant().Replace('ё', 'е');
        if (input.Length == 0)
        {
            return string.Empty;
        }

        var builder = new StringBuilder(input.Length);
        var pendingWhitespace = false;
        foreach (var ch in input)
        {
            if (char.IsWhiteSpace(ch))
            {
                pendingWhitespace = true;
                continue;
            }

            if (pendingWhitespace && builder.Length > 0)
            {
                builder.Append(' ');
            }

            builder.Append(ch);
            pendingWhitespace = false;
        }

        return builder.ToString();
    }
}
