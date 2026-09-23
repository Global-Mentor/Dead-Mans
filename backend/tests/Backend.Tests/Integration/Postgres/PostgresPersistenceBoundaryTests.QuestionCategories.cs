using backend.Application.Abstractions;
using backend.Application.Contracts;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    [Fact]
    public async Task DeleteCategory_WithOnlySoftDeletedQuestions_ReassignsQuestionsAndDeletesCategory()
    {
        await _database.ResetAsync();

        Guid categoryId;
        Guid questionId;
        Guid fallbackCategoryId;
        await using (var setupDb = _database.CreateDbContext())
        {
            var repository = new DbGameQuestionRepository(setupDb, TimeProvider.System);
            var fallbackCategory = await repository.EnsureFallbackCategoryAsync();
            var category = await repository.CreateCategoryAsync("Archived questions");
            var question = await repository.CreateQuestionAsync(new CreateGameQuestionInput(
                "archived-question", category.Id, "Archived question?",
                [new("Correct", true), new("Incorrect", false)],
                5, true, 0));

            Assert.NotNull(question);
            Assert.True(await repository.SoftDeleteQuestionAsync(question.QuestionId));

            categoryId = category.Id;
            questionId = question.QuestionId;
            fallbackCategoryId = fallbackCategory.Id;
        }

        await using (var deleteDb = _database.CreateDbContext())
        {
            var repository = new DbGameQuestionRepository(deleteDb, TimeProvider.System);

            var outcome = await repository.DeleteCategoryAsync(categoryId);

            Assert.Equal(DeleteGameQuestionCategoryOutcome.Deleted, outcome);
        }

        await using var verifyDb = _database.CreateDbContext();
        Assert.False(await verifyDb.QuestionCategories.AnyAsync(x => x.Id == categoryId));

        var archivedQuestion = await verifyDb.QuestionDefinitions
            .AsNoTracking()
            .SingleAsync(x => x.Id == questionId);
        Assert.True(archivedQuestion.IsDeleted);
        Assert.Equal(fallbackCategoryId, archivedQuestion.CategoryId);
    }
}
