using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Unit.Infrastructure.Persistence;

public sealed class DbGameQuestionRepositoryAnswersTests
{
    [Fact]
    public async Task CreateQuestionAsync_PersistsAllAcceptedAnswers()
    {
        var timestamp = new DateTimeOffset(2038, 7, 8, 9, 10, 11, TimeSpan.Zero);
        await using var dbContext = CreateDbContext();
        var category = await SeedCategoryAsync(dbContext, timestamp.UtcDateTime);
        var repository = new DbGameQuestionRepository(dbContext, new FixedTimeProvider(timestamp));

        var created = await repository.CreateQuestionAsync(
            new CreateGameQuestionInput(
                "q-multi",
                category.Id,
                "Capital?",
                "Paris",
                ["Paris", "Париж"],
                1,
                true,
                0
            )
        );

        Assert.NotNull(created);
        Assert.Equal("Paris", created.Answer);
        Assert.Equal(["Paris", "Париж"], created.Answers);

        var stored = await dbContext.QuestionAcceptedAnswers
            .AsNoTracking()
            .Where(answer => answer.QuestionId == created.QuestionId)
            .OrderBy(answer => answer.SortOrder)
            .ToArrayAsync();
        Assert.Equal(["Paris", "Париж"], stored.Select(answer => answer.AnswerText).ToArray());
        Assert.True(stored[0].IsPrimary);
        Assert.False(stored[1].IsPrimary);
    }

    private static async Task<QuestionCategory> SeedCategoryAsync(
        ApplicationDbContext dbContext,
        DateTime createdAt
    )
    {
        var category = new QuestionCategory
        {
            Id = Guid.NewGuid(),
            Name = "Geography",
            CreatedAtUtc = createdAt,
            UpdatedAtUtc = createdAt
        };
        dbContext.QuestionCategories.Add(category);
        await dbContext.SaveChangesAsync();
        return category;
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }
}
