using System.Linq.Expressions;
using backend.Application.Contracts;
using backend.Domain.Questions;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameQuestionRepository
{
    public async Task<GameQuestionCatalogPage> GetCatalogPageAsync(
        GameQuestionCatalogFilter filter, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.QuestionDefinitions.AsNoTracking()
            .Where(x => !x.IsDeleted && (x.ImageSnapshotJson != null) == (filter.Format == "screenshot"));
        if (filter.CategoryId is { } categoryId) query = query.Where(x => x.CategoryId == categoryId);
        if (filter.Status != "all") query = query.Where(x => x.IsEnabled == (filter.Status == "enabled"));
        if (filter.MapId is { } mapId)
            query = query.Where(x => _dbContext.Set<QuestionScreenshot>().Any(s => s.QuestionId == x.Id && s.Location != null && s.Location.MapId == mapId));
        if (filter.LocationId is { } locationId)
            query = query.Where(x => _dbContext.Set<QuestionScreenshot>().Any(s => s.QuestionId == x.Id && s.LocationId == locationId));
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            // Escape LIKE metacharacters so searching for a code or literal underscore stays literal.
            var search = "%" + filter.Search.Trim().Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            query = query.Where(x => EF.Functions.ILike(x.Text, search, "\\")
                || EF.Functions.ILike(x.ExternalCode, search, "\\")
                || EF.Functions.ILike(x.CategoryDefinition!.Name, search, "\\")
                || x.Options.Any(option => EF.Functions.ILike(option.Text, search, "\\"))
                || _dbContext.Set<QuestionScreenshot>().Any(s => s.QuestionId == x.Id && s.Location != null
                    && (s.Location.Translations.Any(t => EF.Functions.ILike(t.Name, search, "\\"))
                        || s.Location.Map.Translations.Any(t => EF.Functions.ILike(t.Name, search, "\\")))));
        }
        var total = await query.CountAsync(cancellationToken);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);
        var page = Math.Clamp(filter.Page, 1, Math.Max(1, (int)Math.Ceiling((double)total / pageSize)));
        var ordered = filter.Sort switch
        {
            "rewardAsc" => query.OrderBy(x => x.Reward),
            "rewardDesc" => query.OrderByDescending(x => x.Reward),
            "priorityAsc" => query.OrderBy(x => x.Priority),
            "priorityDesc" => query.OrderByDescending(x => x.Priority),
            "leastAsked" => query.OrderBy(x => x.AskedInQuizQuestionSessions.Count),
            _ => query.OrderBy(x => x.CategoryDefinition!.Name)
        };
        var rows = await ordered.ThenBy(x => x.CategoryDefinition!.Name).ThenBy(x => x.Text).ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).Select(ToCatalogItemSelector()).ToArrayAsync(cancellationToken);

        // Facets describe the entire screenshot catalog, independently of the current page or filters.
        var locations = filter.Format == "screenshot"
            ? await _dbContext.Set<HuntLocation>().AsNoTracking().Where(location =>
                _dbContext.Set<QuestionScreenshot>().Any(s => s.LocationId == location.Id && !s.Question.IsDeleted))
                .Include(x => x.Translations).Include(x => x.Map).ThenInclude(x => x.Translations)
                .ToArrayAsync(cancellationToken)
            : [];
        var maps = locations.GroupBy(x => x.MapId).Select(group =>
        {
            var map = group.First().Map;
            return new HuntMapItem(map.Id, map.Code, map.Translations.ToDictionary(x => x.Locale, x => x.Name),
                group.Select(location => new HuntLocationItem(location.Id, location.Code,
                    location.Translations.ToDictionary(x => x.Locale, x => x.Name))).ToArray());
        }).ToArray();
        return new(rows.Select(x => x.ToCatalogItem()).ToArray(), total, page, pageSize, maps);
    }

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

        var items = await query
            .OrderBy(x => x.CategoryDefinition!.Name)
            .ThenBy(x => x.Priority)
            .Select(ToCatalogItemSelector())
            .ToArrayAsync(cancellationToken);
        return items.Select(item => item.ToCatalogItem()).ToArray();
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
        var item = await _dbContext.QuestionDefinitions
            .AsNoTracking()
            .Where(x => x.Id == questionId && !x.IsDeleted)
            .Select(ToCatalogItemSelector())
            .FirstOrDefaultAsync(cancellationToken);
        return item?.ToCatalogItem();
    }

    private static string GenerateExternalCode()
    {
        return $"q_{Guid.NewGuid():N}"[..10];
    }

    private Expression<Func<QuestionDefinition, CatalogItemRow>>
        ToCatalogItemSelector()
    {
        return x =>
            new CatalogItemRow(
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
                x.AskedInQuizQuestionSessions
                    .OrderByDescending(session => session.AskedAtUtc)
                    .Select(session => (DateTime?)session.AskedAtUtc)
                    .FirstOrDefault(),
                x.ImageSnapshotJson,
                _dbContext.Set<QuestionScreenshot>().Where(screenshot => screenshot.QuestionId == x.Id)
                    .Select(screenshot => screenshot.Location == null ? (Guid?)null : screenshot.Location.MapId).FirstOrDefault(),
                _dbContext.Set<QuestionScreenshot>().Where(screenshot => screenshot.QuestionId == x.Id)
                    .Select(screenshot => (Guid?)screenshot.LocationId).FirstOrDefault()
            );
    }

    private sealed record CatalogItemRow(
        Guid QuestionId,
        string QuestionCode,
        Guid CategoryId,
        string CategoryName,
        string Text,
        IReadOnlyList<GameQuestionOption> Options,
        int Reward,
        int Priority,
        bool IsEnabled,
        int AskedTotalCount,
        int SubmissionTotalCount,
        int CorrectSubmissionTotalCount,
        DateTime? LastAskedAtUtc,
        string? ImageSnapshotJson,
        Guid? ScreenshotMapId,
        Guid? ScreenshotLocationId
    )
    {
        public GameQuestionCatalogItem ToCatalogItem() => new(
            QuestionId, QuestionCode, CategoryId, CategoryName, Text, Options,
            Reward, Priority, IsEnabled, AskedTotalCount, SubmissionTotalCount,
            CorrectSubmissionTotalCount,
            SubmissionTotalCount == 0 ? 0m : 100m * CorrectSubmissionTotalCount / SubmissionTotalCount,
            LastAskedAtUtc
        )
        { Image = QuizImageSnapshot.FromJson(ImageSnapshotJson), ScreenshotMapId = ScreenshotMapId, ScreenshotLocationId = ScreenshotLocationId };
    }

    private static string NormalizeFilter(string? value)
    {
        return (value ?? string.Empty).Trim();
    }

    private static bool IsProtectedCategory(Guid categoryId, string categoryName)
    {
        return categoryId == QuestionCatalogDefaults.UncategorizedCategoryId
            || categoryId == QuestionCatalogDefaults.UncategorizedScreenshotCategoryId
            || categoryId == QuestionCatalogDefaults.LocationScreenshotCategoryId
            || string.Equals(
                categoryName,
                QuestionCatalogDefaults.UncategorizedCategoryName,
                StringComparison.Ordinal
            );
    }
}
