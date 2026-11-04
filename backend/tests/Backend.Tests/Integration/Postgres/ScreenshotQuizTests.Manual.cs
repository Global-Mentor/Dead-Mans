using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Questions;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class ScreenshotQuizTests
{
    private static async Task<UploadQuizScreenshotInput> ManualInputAsync(ApplicationDbContext db)
    {
        var category = await new DbGameQuestionRepository(db, TimeProvider.System)
            .CreateCategoryAsync(Guid.NewGuid().ToString("N"), "screenshot");
        return new(Guid.NewGuid(), null, category.Id, 7, 0, true, "What is shown?",
            [new("A weapon", true), new("A tool", false), new("A consumable", false)]);
    }

    [Fact]
    public async Task ManualAnswersCanBeEditedWithoutChangingImage_AndCannotBecomeLocations()
    {
        await using var db = database.CreateDbContext();
        var input = await ManualInputAsync(db);
        var upload = await UploadAsync(Service(db), input);
        Assert.Equal(UploadQuizScreenshotOutcome.Created, upload.Outcome);
        Assert.Equal(UploadQuizScreenshotOutcome.Existing, (await UploadAsync(Service(db), input)).Outcome);
        var repository = new DbGameQuestionRepository(db, TimeProvider.System);
        var question = await db.QuestionDefinitions.AsNoTracking().SingleAsync(x => x.Id == upload.QuestionId);
        var image = QuizImageSnapshot.FromJson(question.ImageSnapshotJson)!;
        Assert.Empty(image.MapNames);
        Assert.Empty(image.OptionNames);
        Assert.Null(await db.Set<QuestionScreenshot>().Where(x => x.QuestionId == question.Id).Select(x => x.LocationId).SingleAsync());
        var updated = await repository.UpdateQuestionAsync(question.Id,
            new(input.CategoryId, "Which item is this?", [new("Medkit", true), new("Knife", false)], 9, true, 1));
        Assert.NotNull(updated);
        Assert.Equal(["Medkit", "Knife"], updated.Options.Select(x => x.Text));
        Assert.Null(updated.ScreenshotMapId);
        Assert.Null(updated.ScreenshotLocationId);
        Assert.Equal(question.ImageSnapshotJson,
            await db.QuestionDefinitions.AsNoTracking().Where(x => x.Id == question.Id).Select(x => x.ImageSnapshotJson).SingleAsync());
        Assert.True(System.Text.Json.Nodes.JsonNode.DeepEquals(
            System.Text.Json.Nodes.JsonNode.Parse(question.ImageSnapshotJson!),
            System.Text.Json.Nodes.JsonNode.Parse(updated.Image!.ToJson())));
        Assert.False(await repository.CategoryMatchesQuestionAsync(QuestionCatalogDefaults.LocationScreenshotCategoryId, question.Id));
        var error = await Assert.ThrowsAsync<Npgsql.PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE question_definitions SET category_id = {QuestionCatalogDefaults.LocationScreenshotCategoryId} WHERE id = {question.Id}
            """));
        Assert.Equal("ck_question_definitions_screenshot_category", error.ConstraintName);
        Assert.Equal(UploadQuizScreenshotOutcome.RequestConflict,
            (await UploadAsync(Service(db), input with { Options = [new("Other", true), new("Tool", false)] })).Outcome);
    }

    [Fact]
    public async Task ManualUploadsRejectMissingDuplicateOrAmbiguousAnswersWithoutStoringFiles()
    {
        await using var db = database.CreateDbContext();
        var input = await ManualInputAsync(db);
        IReadOnlyList<GameQuestionOptionInput>?[] invalid = [null, [], [new("Only", true)],
            [new("Same", true), new(" same ", false)], [new("A", true), new("B", true)],
            [new("A", false), new("B", false)], [new("", true), new("B", false)],
            Enumerable.Range(0, 11).Select(i => new GameQuestionOptionInput(i.ToString(), i == 0)).ToArray()];
        foreach (var choices in invalid)
            Assert.Equal(UploadQuizScreenshotOutcome.InvalidSelection,
                (await UploadAsync(Service(db), input with { Options = choices })).Outcome);
        Assert.Equal(UploadQuizScreenshotOutcome.InvalidSelection,
            (await UploadAsync(Service(db), input with { LocationId = Guid.NewGuid() })).Outcome);
        Assert.Equal(UploadQuizScreenshotOutcome.InvalidSelection,
            (await UploadAsync(Service(db), input with { CategoryId = QuestionCatalogDefaults.LocationScreenshotCategoryId })).Outcome);
        Assert.Equal(UploadQuizScreenshotOutcome.InvalidSelection,
            (await UploadAsync(Service(db), input with { Text = new string('x', 500) })).Outcome);
        Assert.Empty(_storage.ListObjectKeys("quiz"));
    }
}
