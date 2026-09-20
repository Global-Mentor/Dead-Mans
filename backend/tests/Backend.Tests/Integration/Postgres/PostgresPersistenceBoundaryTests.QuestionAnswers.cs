using backend.Application.Contracts;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    [Fact]
    public async Task QuestionOptions_AreUniqueAndExactlyOneIsCorrect()
    {
        await _database.ResetAsync();
        await using var db = _database.CreateDbContext();
        var repository = new DbGameQuestionRepository(db, TimeProvider.System);
        var category = await repository.CreateCategoryAsync("Options");

        var created = await repository.CreateQuestionAsync(new CreateGameQuestionInput(
            "q-options", category.Id, "Capital?",
            [new("Paris", true), new("London", false), new("Warsaw", false)],
            5, true, 0));

        Assert.NotNull(created);
        var options = await db.QuestionOptions.Where(x => x.QuestionId == created.QuestionId)
            .OrderBy(x => x.SortOrder).ToArrayAsync();
        Assert.Equal(3, options.Length);
        Assert.Single(options, x => x.IsCorrect);
        Assert.Equal("Paris", options[0].Text);
    }
}
