using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Unit.Infrastructure.Persistence;

public sealed class DbGameQuestionRepositoryAnswersTests
{
    [Fact]
    public async Task CatalogStatistics_CountOnlyClosedAnswersAndRetainFractionalPercentage()
    {
        await using var db = CreateDbContext();
        var now = DateTime.UtcNow;
        var category = await SeedCategoryAsync(db, now);
        var repository = new DbGameQuestionRepository(db, TimeProvider.System);
        var question = await repository.CreateQuestionAsync(new CreateGameQuestionInput(
            "stats", category.Id, "Question", [new("Right", true), new("Wrong", false)], 1, true, 0));
        Assert.NotNull(question);
        var closed = new GameQuizQuestionSession
        {
            Id = Guid.NewGuid(),
            QuestionId = question.QuestionId,
            Status = "closed",
            AskedAtUtc = now
        };
        var open = new GameQuizQuestionSession
        {
            Id = Guid.NewGuid(),
            QuestionId = question.QuestionId,
            Status = "open",
            AskedAtUtc = now.AddMinutes(1)
        };
        db.AddRange(closed, open);
        for (var index = 0; index < 3; index++)
        {
            db.GameQuizSubmissions.Add(new GameQuizSubmission
            {
                Id = Guid.NewGuid(),
                QuestionSessionId = closed.Id,
                IsCorrect = index == 0
            });
        }
        db.GameQuizSubmissions.Add(new GameQuizSubmission
        {
            Id = Guid.NewGuid(),
            QuestionSessionId = open.Id,
            IsCorrect = true
        });
        await db.SaveChangesAsync();

        var item = Assert.Single(await repository.GetCatalogAsync(null, null, true));
        Assert.Equal(2, item.AskedTotalCount);
        Assert.Equal(3, item.SubmissionTotalCount);
        Assert.Equal(1, item.CorrectSubmissionTotalCount);
        Assert.Equal(100m / 3, item.CorrectPercentage);
        Assert.Equal(open.AskedAtUtc, item.LastAskedAtUtc);
    }

    [Fact]
    public async Task CreateQuestionAsync_PersistsOptionsAndOneCorrectChoice()
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
                [new("Paris", true), new("London", false)],
                1,
                true,
                0
            )
        );

        Assert.NotNull(created);
        Assert.Equal("Paris", Assert.Single(created.Options, x => x.IsCorrect).Text);
        Assert.Equal(["Paris", "London"], created.Options.Select(x => x.Text));

        var stored = await dbContext.QuestionOptions
            .AsNoTracking()
            .Where(answer => answer.QuestionId == created.QuestionId)
            .OrderBy(answer => answer.SortOrder)
            .ToArrayAsync();
        Assert.Equal(["Paris", "London"], stored.Select(option => option.Text).ToArray());
        Assert.True(stored[0].IsCorrect);
        Assert.False(stored[1].IsCorrect);
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
