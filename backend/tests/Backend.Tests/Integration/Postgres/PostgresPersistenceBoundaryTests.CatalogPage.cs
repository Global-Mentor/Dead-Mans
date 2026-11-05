using backend.Application.Contracts;
using backend.Infrastructure.Persistence;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    [Fact]
    public async Task CatalogPage_FiltersBeforePagingAndKeepsLiteralSearchAndStableOrder()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var repository = new DbGameQuestionRepository(db, TimeProvider.System);
        var category = await repository.CreateCategoryAsync("Paged catalog");
        for (var i = 0; i < 5; i++)
            Assert.NotNull(await repository.CreateQuestionAsync(new(
                $"literal_{i}", category.Id, $"Question {i}", [new("Yes", true), new("No", false)], i + 1, i != 4, i)));
        var other = await repository.CreateQuestionAsync(new(
            "literalX0", category.Id, "Other", [new("Yes", true), new("No", false)], 1, true, 0));
        Assert.NotNull(other);
        var filter = new GameQuestionCatalogFilter(CategoryId: category.Id, Search: "literal_", Status: "enabled", Sort: "rewardDesc", PageSize: 2);
        var first = await repository.GetCatalogPageAsync(filter);
        var second = await repository.GetCatalogPageAsync(filter with { Page = 2 });
        Assert.Equal(4, first.TotalCount);
        Assert.Equal(new[] { "literal_3", "literal_2" }, first.Items.Select(x => x.QuestionCode));
        Assert.Equal(new[] { "literal_1", "literal_0" }, second.Items.Select(x => x.QuestionCode));
        Assert.Equal(2, (await repository.GetCatalogPageAsync(filter with { Page = 999 })).Page);
        Assert.Empty((await repository.GetCatalogPageAsync(filter with { Format = "screenshot" })).Items);
        Assert.Single((await repository.GetCatalogPageAsync(filter with { Status = "disabled" })).Items);
        Assert.Equal(6, (await repository.GetCatalogAsync(category.Id, null, true)).Count);
    }
}
