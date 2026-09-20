using System.Linq.Expressions;
using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameQuestionRepository
{
    public async Task<IReadOnlyList<GameQuestionCatalogItem>> GetCatalogAsync(
        Guid? categoryId,
        string? search,
        bool includeDisabled,
        CancellationToken cancellationToken = default
    )
    {
        var normalizedSearch = NormalizeFilter(search);

        var query = _dbContext.QuestionDefinitions
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .AsQueryable();

        if (categoryId.HasValue)
        {
            query = query.Where(x => x.CategoryId == categoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            var searchLower = normalizedSearch.ToLowerInvariant();
            query = query.Where(
                x =>
                    EF.Functions.ILike(x.Text, $"%{searchLower}%")
                    || x.Options.Any(option =>
                        EF.Functions.ILike(option.Text, $"%{searchLower}%"))
            );
        }

        if (!includeDisabled)
        {
            query = query.Where(x => x.IsEnabled);
        }

        return await query
            .OrderBy(x => x.CategoryDefinition!.Name)
            .ThenBy(x => x.Priority)
            .Select(ToCatalogItemSelector())
            .ToArrayAsync(cancellationToken);
    }

    public async Task<bool> QuestionIdsAvailableAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default
    )
    {
        if (questionIds.Count == 0)
        {
            return true;
        }

        var distinctIds = questionIds.Distinct().ToArray();
        var knownCount = await _dbContext.QuestionDefinitions
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsEnabled && distinctIds.Contains(x.Id))
            .CountAsync(cancellationToken);
        return knownCount == distinctIds.Length;
    }

    private async Task<GameQuestionCatalogItem?> LoadCatalogItemAsync(
        Guid questionId,
        CancellationToken cancellationToken
    )
    {
        return await _dbContext.QuestionDefinitions
            .AsNoTracking()
            .Where(x => x.Id == questionId && !x.IsDeleted)
            .Select(ToCatalogItemSelector())
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static string GenerateExternalCode()
    {
        return $"q_{Guid.NewGuid():N}"[..10];
    }

    private static Expression<Func<QuestionDefinition, GameQuestionCatalogItem>>
        ToCatalogItemSelector()
    {
        return x =>
            new GameQuestionCatalogItem(
                x.Id,
                x.ExternalCode,
                x.CategoryId,
                x.CategoryDefinition != null ? x.CategoryDefinition.Name : string.Empty,
                x.Text,
                x.Options
                    .OrderBy(option => option.SortOrder)
                    .Select(option => new GameQuestionOption(
                        option.Id,
                        option.Text,
                        option.IsCorrect,
                        option.SortOrder
                    ))
                    .ToArray(),
                x.Reward,
                x.Priority,
                x.IsEnabled,
                x.AskedInQuizQuestionSessions.Count,
                x.AskedInQuizQuestionSessions.Where(session => session.Status == GameQuizQuestionSessionStatusValue.Closed)
                    .SelectMany(session => session.Submissions).Count(),
                x.AskedInQuizQuestionSessions.Where(session => session.Status == GameQuizQuestionSessionStatusValue.Closed)
                    .SelectMany(session => session.Submissions).Count(submission => submission.IsCorrect),
                x.AskedInQuizQuestionSessions.Where(session => session.Status == GameQuizQuestionSessionStatusValue.Closed)
                    .SelectMany(session => session.Submissions).Any()
                    ? 100m * x.AskedInQuizQuestionSessions.Where(session => session.Status == GameQuizQuestionSessionStatusValue.Closed)
                        .SelectMany(session => session.Submissions)
                        .Count(submission => submission.IsCorrect)
                        / x.AskedInQuizQuestionSessions.Where(session => session.Status == GameQuizQuestionSessionStatusValue.Closed)
                            .SelectMany(session => session.Submissions).Count()
                    : 0m,
                x.AskedInQuizQuestionSessions
                    .OrderByDescending(session => session.AskedAtUtc)
                    .Select(session => (DateTime?)session.AskedAtUtc)
                    .FirstOrDefault()
            );
    }

    private static string NormalizeFilter(string? value)
    {
        return (value ?? string.Empty).Trim();
    }

    private static bool IsProtectedCategory(Guid categoryId, string categoryName)
    {
        return categoryId == QuestionCatalogDefaults.UncategorizedCategoryId
            || string.Equals(
                categoryName,
                QuestionCatalogDefaults.UncategorizedCategoryName,
                StringComparison.Ordinal
            );
    }
}
