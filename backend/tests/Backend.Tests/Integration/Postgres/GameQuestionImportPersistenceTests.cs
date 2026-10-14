using System.Text;
using System.Text.Json.Nodes;
using backend.Api.Contracts;
using backend.Application.Abstractions.Realtime;
using backend.Application.Contracts;
using backend.Application.Features.GameQuestions;
using backend.Controllers;
using backend.Infrastructure.Persistence;
using Backend.Tests.Integration.GameEndpoints;
using Backend.Tests.Support;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests.Integration.Postgres;

public sealed class GameQuestionImportPersistenceTests(PostgresTestDatabase database)
    : IClassFixture<PostgresTestDatabase>
{
    [Fact]
    public async Task MixedImportAndRetry_PersistOnlyValidQuestionsWithCategoriesAndUniqueCodes()
    {
        await database.ResetAsync();
        await using var db = database.CreateDbContext();
        var repository = new DbGameQuestionRepository(db, TimeProvider.System);
        var category = await repository.CreateCategoryAsync("География");
        var publisher = new RecordingPublisher();
        var controller = new GameQuestionController(new GameQuestionService(repository, publisher,
            NullLogger<GameQuestionService>.Instance))
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        var rows = new JsonArray(Enumerable.Range(1, 10)
            .Select(i => (JsonNode)GameQuestionImportContractTests.ValidRow($"pg-{i}")).ToArray());
        rows[0]!["categoryId"] = category.Id.ToString();
        rows[0]!["isEnabled"] = true;
        rows[0]!["priority"] = 2;
        rows[1]!["categoryId"] = "unknown-category";
        rows[2]!["categoryId"] = Guid.NewGuid().ToString();
        rows[6]!["reward"] = -1;
        rows[7]!["options"]![1]!["isCorrect"] = true;
        rows[8]!["options"]![1]!["text"] = " ДА ";
        rows[9]!["text"] = " ";
        var payload = new JsonObject { ["questions"] = rows }.ToJsonString();
        var result = await Import(controller, payload);
        Assert.Equal(6, result.ImportedCount);
        Assert.Equal([7, 8, 9, 10], result.SkippedQuestions.Select(x => x.RowNumber).ToArray());
        Assert.Equal(1, publisher.PublishedCount);
        db.ChangeTracker.Clear();
        var stored = await db.QuestionDefinitions.Include(x => x.Options).ToArrayAsync();
        Assert.Equal(6, stored.Length);
        Assert.All(stored, x => Assert.Equal(2, x.Options.Count));
        var known = stored.Single(x => x.ExternalCode == "pg-1");
        Assert.Equal(category.Id, known.CategoryId);
        Assert.True(known.IsEnabled);
        Assert.Equal(2, known.Priority);
        Assert.All(stored.Where(x => x.ExternalCode != "pg-1"), x =>
        {
            Assert.Equal(QuestionCatalogDefaults.UncategorizedCategoryId, x.CategoryId);
            Assert.False(x.IsEnabled);
            Assert.Equal(0, x.Priority);
        });
        var repeated = await Import(controller, payload);
        Assert.Equal(0, repeated.ImportedCount);
        Assert.Equal(10, repeated.SkippedQuestions.Count);
        Assert.Equal(1, publisher.PublishedCount);
        var corrected = new JsonArray(result.SkippedQuestions.Select(x =>
            (JsonNode)GameQuestionImportContractTests.ValidRow(x.SourceQuestion!.ExternalCode!)).ToArray());
        var retry = await Import(controller, new JsonObject { ["questions"] = corrected }.ToJsonString());
        Assert.Equal(4, retry.ImportedCount);
        Assert.Empty(retry.SkippedQuestions);
        Assert.Equal(2, publisher.PublishedCount);
        db.ChangeTracker.Clear();
        Assert.Equal(10, await db.QuestionDefinitions.CountAsync());
        Assert.Equal(20, await db.QuestionOptions.CountAsync());
        Assert.Equal(10, await db.QuestionDefinitions.Select(x => x.ExternalCode).Distinct().CountAsync());
    }

    [Fact]
    public async Task CaseInsensitiveCodes_SkipFileAndExistingDuplicatesWithoutLosingNeighbors()
    {
        await database.ResetAsync();
        await using var db = database.CreateDbContext();
        var controller = Controller(db);
        var first = await Import(controller, Payload("Case-Code", "case-code", "neighbor"));
        Assert.Equal(2, first.ImportedCount);
        var duplicate = Assert.Single(first.SkippedQuestions);
        Assert.Equal(2, duplicate.RowNumber);
        Assert.Equal(backend.Messaging.AppMessages.ErrorCodes.GameQuestionImportDuplicateCodeInFile, duplicate.ReasonCode);
        var repeated = await Import(controller, Payload("CASE-CODE", "another"));
        Assert.Equal(1, repeated.ImportedCount);
        Assert.Equal(backend.Messaging.AppMessages.ErrorCodes.GameQuestionImportDuplicateCodeExisting,
            Assert.Single(repeated.SkippedQuestions).ReasonCode);
        Assert.Equal(3, await db.QuestionDefinitions.CountAsync());
    }

    [Theory]
    [InlineData("text")]
    [InlineData("externalCode")]
    [InlineData("option")]
    public async Task NullCharacter_SkipsOnlyInvalidRow(string field)
    {
        await database.ResetAsync();
        await using var db = database.CreateDbContext();
        var invalid = GameQuestionImportContractTests.ValidRow("invalid");
        if (field == "option") invalid["options"]![0]!["text"] = "bad\0value";
        else invalid[field] = "bad\0value";
        var rows = new JsonArray(GameQuestionImportContractTests.ValidRow("before"), invalid,
            GameQuestionImportContractTests.ValidRow("after"));
        var result = await Import(Controller(db), new JsonObject { ["questions"] = rows }.ToJsonString());
        Assert.Equal(2, result.ImportedCount);
        Assert.Equal(2, Assert.Single(result.SkippedQuestions).RowNumber);
        Assert.Equal(2, await db.QuestionDefinitions.CountAsync());
        Assert.Equal(4, await db.QuestionOptions.CountAsync());
    }

    [Fact]
    public async Task ConcurrentImports_KeepOneSharedCodeAndEveryUniqueNeighbor()
    {
        await database.ResetAsync();
        await using (var seed = database.CreateDbContext())
            await new DbGameQuestionRepository(seed, TimeProvider.System).EnsureFallbackCategoryAsync();
        var results = await Task.WhenAll(Enumerable.Range(0, 8).Select(async i =>
        {
            await using var db = database.CreateDbContext();
            return await Import(Controller(db), Payload("shared", $"unique-{i}"));
        }));
        Assert.Equal(9, results.Sum(x => x.ImportedCount));
        Assert.Equal(7, results.Sum(x => x.SkippedQuestions.Count));
        await using var verify = database.CreateDbContext();
        Assert.Equal(9, await verify.QuestionDefinitions.CountAsync());
        Assert.Equal(18, await verify.QuestionOptions.CountAsync());
    }

    [Theory]
    [InlineData("КОД", "код")]
    [InlineData("CAFÉ", "café")]
    [InlineData("İ", "i")]
    public async Task UnicodeCodeComparison_MatchesDatabaseUniqueness(string original, string duplicate)
    {
        await database.ResetAsync();
        await using var db = database.CreateDbContext();
        var controller = Controller(db);
        var result = await Import(controller, Payload(original, duplicate, "neighbor"));
        Assert.Equal(2, result.ImportedCount);
        Assert.Single(result.SkippedQuestions);
        var repeat = await Import(controller, Payload(duplicate, "another"));
        Assert.Equal(1, repeat.ImportedCount);
        Assert.Single(repeat.SkippedQuestions);
    }

    [Fact]
    public async Task ArchivedCode_StaysReservedAndPublisherFailureDoesNotUndoImport()
    {
        await database.ResetAsync();
        await using var db = database.CreateDbContext();
        var publisher = new RecordingPublisher { Fail = true };
        var controller = Controller(db, publisher);
        Assert.Equal(1, (await Import(controller, Payload("archived"))).ImportedCount);
        var question = await db.QuestionDefinitions.SingleAsync();
        await new DbGameQuestionRepository(db, TimeProvider.System).SoftDeleteQuestionAsync(question.Id);
        var repeated = await Import(controller, Payload("ARCHIVED", "retained"));
        Assert.Equal(1, repeated.ImportedCount);
        Assert.Single(repeated.SkippedQuestions);
        Assert.Equal(2, publisher.PublishedCount);
        Assert.Equal(2, await db.QuestionDefinitions.CountAsync());
        Assert.Equal(1, await db.QuestionDefinitions.CountAsync(x => !x.IsDeleted));
    }

    [Fact]
    public async Task ConcurrentFirstImports_CreateFallbackOnce()
    {
        await database.ResetAsync();
        var results = await Task.WhenAll(Enumerable.Range(0, 4).Select(async i =>
        {
            await using var db = database.CreateDbContext();
            return await Import(Controller(db), Payload($"first-{i}"));
        }));
        Assert.Equal(4, results.Sum(x => x.ImportedCount));
        await using var verify = database.CreateDbContext();
        Assert.Equal(1, await verify.QuestionCategories.CountAsync());
        Assert.Equal(4, await verify.QuestionDefinitions.CountAsync());
    }

    [Fact]
    public async Task ConcurrentManualCreationAndImport_KeepUniqueCodeWithoutExceptions()
    {
        await database.ResetAsync();
        await using (var seed = database.CreateDbContext())
            await new DbGameQuestionRepository(seed, TimeProvider.System).EnsureFallbackCategoryAsync();
        await using var createDb = database.CreateDbContext();
        await using var importDb = database.CreateDbContext();
        var input = new CreateGameQuestionInput("overlap", QuestionCatalogDefaults.UncategorizedCategoryId,
            "Question?", [new("Yes", true), new("No", false)], 5, false, 0);
        var createdTask = new DbGameQuestionRepository(createDb, TimeProvider.System).CreateQuestionAsync(input);
        var importedTask = Import(Controller(importDb), Payload("overlap", "neighbor"));
        await Task.WhenAll(createdTask, importedTask);
        Assert.Equal(2, (await createdTask is null ? 0 : 1) + (await importedTask).ImportedCount);
        await using var verify = database.CreateDbContext();
        Assert.Equal(2, await verify.QuestionDefinitions.CountAsync());
    }

    [Fact]
    public async Task CancellationBeforeSavingQuestions_RollsBackAndDoesNotPublish()
    {
        await database.ResetAsync();
        using var cancellation = new CancellationTokenSource();
        await using var db = database.CreateDbContext(new CancelQuestionSave(cancellation));
        var publisher = new RecordingPublisher();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            Import(Controller(db, publisher), Payload("cancelled"), cancellation.Token));
        await using var verify = database.CreateDbContext();
        Assert.Equal(0, await verify.QuestionDefinitions.CountAsync());
        Assert.Equal(0, await verify.QuestionOptions.CountAsync());
        Assert.Equal(0, publisher.PublishedCount);
    }

    [Fact]
    public async Task MaximumValidBatch_PersistsEveryQuestionAndOption()
    {
        await database.ResetAsync();
        await using var db = database.CreateDbContext();
        var result = await Import(Controller(db), Payload(Enumerable.Range(0, GameQuestionImportLimits.MaxQuestionCount)
            .Select(i => $"maximum-{i}").ToArray()));
        Assert.Equal(GameQuestionImportLimits.MaxQuestionCount, result.ImportedCount);
        Assert.Empty(result.SkippedQuestions);
        Assert.Equal(GameQuestionImportLimits.MaxQuestionCount, await db.QuestionDefinitions.CountAsync());
        Assert.Equal(GameQuestionImportLimits.MaxQuestionCount * 2, await db.QuestionOptions.CountAsync());
    }

    private sealed class CancelQuestionSave(CancellationTokenSource cancellation) : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (eventData.Context!.ChangeTracker.Entries<backend.Data.Entities.QuestionDefinition>()
                .Any(x => x.State == EntityState.Added))
            {
                cancellation.Cancel();
                cancellationToken.ThrowIfCancellationRequested();
            }
            return ValueTask.FromResult(result);
        }
    }

    private static GameQuestionController Controller(backend.Data.ApplicationDbContext db, RecordingPublisher? publisher = null) =>
        new(new GameQuestionService(new DbGameQuestionRepository(db, TimeProvider.System),
            publisher ?? new RecordingPublisher(), NullLogger<GameQuestionService>.Instance))
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

    private static string Payload(params string[] codes) => new JsonObject
    {
        ["questions"] = new JsonArray(codes.Select(code => (JsonNode)GameQuestionImportContractTests.ValidRow(code)).ToArray())
    }.ToJsonString();

    private static async Task<ImportGameQuestionsResultDto> Import(GameQuestionController controller, string json, CancellationToken cancellationToken = default)
    {
        var bytes = Encoding.UTF8.GetBytes(json);
        using var stream = new MemoryStream(bytes);
        var file = new FormFile(stream, 0, bytes.Length, "file", "questions.jsonc");
        var result = Assert.IsType<OkObjectResult>(await controller.ImportQuestions(file, cancellationToken));
        return Assert.IsType<ImportGameQuestionsResultDto>(result.Value);
    }

    private sealed class RecordingPublisher : IGameSetupEventsPublisher
    {
        public int PublishedCount { get; private set; }
        public bool Fail { get; init; }
        public Task PublishDraftChangedAsync(CancellationToken cancellationToken = default)
        {
            PublishedCount++;
            return Fail ? Task.FromException(new InvalidOperationException("Event delivery failed")) : Task.CompletedTask;
        }
    }
}
