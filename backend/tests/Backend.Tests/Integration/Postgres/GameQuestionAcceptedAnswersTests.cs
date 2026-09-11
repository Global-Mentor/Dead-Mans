using backend.Application.Contracts;
using backend.Infrastructure.Persistence;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Integration.Postgres;

public sealed class GameQuestionAcceptedAnswersTests : IClassFixture<PostgresTestDatabase>
{
    private readonly PostgresTestDatabase _database;

    public GameQuestionAcceptedAnswersTests(PostgresTestDatabase database)
    {
        _database = database;
    }

    [Fact]
    public async Task UpdateQuestionAsync_CanSwapAndAddAnswersWithoutUniqueViolations()
    {
        await _database.ResetAsync();
        Guid questionId;
        Guid categoryId;

        await using (var db = _database.CreateDbContext())
        {
            var repository = new DbGameQuestionRepository(db, TimeProvider.System);
            var category = await repository.CreateCategoryAsync("Geography");
            categoryId = category.Id;
            var created = await repository.CreateQuestionAsync(
                new CreateGameQuestionInput(
                    "q-swap",
                    categoryId,
                    "Capital?",
                    "Paris",
                    ["Paris", "London"],
                    1,
                    true,
                    0
                )
            );
            Assert.NotNull(created);
            questionId = created.QuestionId;
        }

        await using (var db = _database.CreateDbContext())
        {
            var repository = new DbGameQuestionRepository(db, TimeProvider.System);
            var updated = await repository.UpdateQuestionAsync(
                questionId,
                new UpdateGameQuestionInput(
                    categoryId,
                    "Capitals?",
                    "London",
                    ["London", "Paris", "Париж"],
                    2,
                    true,
                    1
                )
            );

            Assert.NotNull(updated);
            Assert.Equal("London", updated.Answer);
            Assert.Equal(["London", "Paris", "Париж"], updated.Answers);
        }

        await using var assertDb = _database.CreateDbContext();
        var stored = await assertDb.QuestionAcceptedAnswers
            .AsNoTracking()
            .Where(answer => answer.QuestionId == questionId)
            .OrderBy(answer => answer.SortOrder)
            .ToArrayAsync();
        Assert.Equal(["London", "Paris", "Париж"], stored.Select(answer => answer.AnswerText).ToArray());
        Assert.True(stored[0].IsPrimary);
        Assert.Equal(new[] { 0, 1, 2 }, stored.Select(answer => answer.SortOrder).ToArray());
    }
}
