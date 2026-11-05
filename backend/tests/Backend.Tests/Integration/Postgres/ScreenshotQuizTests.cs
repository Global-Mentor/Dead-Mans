using backend.Application.Abstractions.Repositories;
using backend.Application.Configuration;
using backend.Application.Contracts;
using backend.Application.Features.GameQuestions;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Configuration;
using backend.Infrastructure.Persistence;
using backend.Infrastructure.Storage;
using Backend.Tests.Support;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using backend.Api.Mapping;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class ScreenshotQuizTests(PostgresTestDatabase database) : IClassFixture<PostgresTestDatabase>
{
    private static readonly byte[] Png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=");
    private readonly InMemoryObjectStorage _storage = new();
    private static readonly MediaStorageSettings Storage = new() { PublicBaseUrl = "https://media.test", BucketName = "quiz", GamesPrefix = "games", CardsGroup = "cards" };
    private QuizScreenshotService Service(ApplicationDbContext db) => new(new DbQuizScreenshotRepository(db, _storage, Options.Create(Storage), TimeProvider.System, NullLogger<DbQuizScreenshotRepository>.Instance));

    private async Task<UploadQuizScreenshotInput> InputAsync(ApplicationDbContext db)
    {
        var locationId = await db.HuntLocations.OrderBy(x => x.Id).Select(x => x.Id).FirstAsync();
        return new(Guid.NewGuid(), locationId, QuestionCatalogDefaults.LocationScreenshotCategoryId, 7, 0, true, "Where was this taken?");
    }

    private static async Task<UploadQuizScreenshotResult> UploadAsync(QuizScreenshotService service, UploadQuizScreenshotInput input)
    {
        using var content = new MemoryStream(Png);
        return await service.UploadAsync(input, content, "image/png", Png.Length);
    }

    [Fact]
    public async Task CategoryFormatsProtectUploadsAssignmentsAndArchivedReparenting()
    {
        await using var db = database.CreateDbContext();
        var repository = new DbGameQuestionRepository(db, TimeProvider.System);
        var category = await repository.CreateCategoryAsync(Guid.NewGuid().ToString("N"), "screenshot");
        var input = new UploadQuizScreenshotInput(Guid.NewGuid(), null, category.Id, 7, 0, true, "What is shown?", [new("Yes", true), new("No", false)]);
        var textCategory = await repository.CreateCategoryAsync(Guid.NewGuid().ToString("N"));
        Assert.Equal(UploadQuizScreenshotOutcome.InvalidSelection,
            (await UploadAsync(Service(db), input with { CategoryId = textCategory.Id })).Outcome);
        var uploaded = await UploadAsync(Service(db), input);
        Assert.True(await repository.CategoryMatchesQuestionAsync(input.CategoryId, uploaded.QuestionId));
        Assert.False(await repository.CategoryMatchesQuestionAsync(textCategory.Id, uploaded.QuestionId));
        Assert.False(await repository.CategoryMatchesQuestionAsync(input.CategoryId, null));
        var text = (await repository.CreateQuestionAsync(new(null, textCategory.Id, "Text question",
            [new("Yes", true), new("No", false)], 1, true, 0)))!;
        Assert.True(await repository.SetCategoryEnabledAsync(textCategory.Id, false));
        Assert.True(await db.QuestionDefinitions.AsNoTracking().Where(x => x.Id == uploaded.QuestionId).Select(x => x.IsEnabled).SingleAsync());
        Assert.True(await repository.SetCategoryEnabledAsync(textCategory.Id, true));
        Assert.True(await repository.SetCategoryEnabledAsync(input.CategoryId, false));
        Assert.True(await db.QuestionDefinitions.AsNoTracking().Where(x => x.Id == text.QuestionId).Select(x => x.IsEnabled).SingleAsync());
        var assignment = await Assert.ThrowsAsync<Npgsql.PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE question_definitions SET category_id = {textCategory.Id} WHERE id = {uploaded.QuestionId}
            """));
        Assert.Equal("ck_question_definitions_category_format", assignment.ConstraintName);
        var formatChange = await Assert.ThrowsAsync<Npgsql.PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE question_categories SET format = 'text' WHERE id = {input.CategoryId}
            """));
        Assert.Equal("ck_question_categories_format_immutable", formatChange.ConstraintName);
        Assert.True(await repository.SoftDeleteQuestionAsync(uploaded.QuestionId!.Value));
        await using var deleteDb = database.CreateDbContext();
        Assert.Equal(backend.Application.Abstractions.DeleteGameQuestionCategoryOutcome.Deleted,
            await new DbGameQuestionRepository(deleteDb, TimeProvider.System).DeleteCategoryAsync(input.CategoryId));
        Assert.Equal(QuestionCatalogDefaults.UncategorizedScreenshotCategoryId,
            await db.QuestionDefinitions.Where(x => x.Id == uploaded.QuestionId).Select(x => x.CategoryId).SingleAsync());
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, false)]
    [InlineData(false, true)]
    [InlineData(true, true)]
    public async Task MigrationSeparatesAnExistingMixedCategoryWithoutChangingQuestionsOrImages(bool uncategorized, bool archived)
    {
        await using var source = database.CreateDbContext();
        var input = await InputAsync(source);
        var repository = new DbGameQuestionRepository(source, TimeProvider.System);
        var originalCategoryId = uncategorized ? QuestionCatalogDefaults.UncategorizedCategoryId : Guid.NewGuid();
        var uploaded = await UploadAsync(Service(source), input);
        if (archived) Assert.True(await repository.SoftDeleteQuestionAsync(uploaded.QuestionId!.Value));
        var fallback = await repository.EnsureFallbackCategoryAsync();
        var text = (await repository.CreateQuestionAsync(new(null, fallback.Id, "Text in mixed category",
            [new("Yes", true), new("No", false)], 1, true, 0)))!;
        var imageBefore = await source.QuestionDefinitions.AsNoTracking()
            .Where(x => x.Id == uploaded.QuestionId).Select(x => x.ImageSnapshotJson).SingleAsync();

        // Replay real persisted records into the preceding schema, where both formats shared a category.
        var targetDatabase = new PostgresTestDatabase();
        await targetDatabase.InitializeAsync();
        try
        {
            await using var target = targetDatabase.CreateDbContext();
            await target.GetService<IMigrator>().MigrateAsync("20261102195810_HardenScreenshotOptionIntegrity");
            await using var sourceConnection = new Npgsql.NpgsqlConnection(database.ConnectionString);
            await sourceConnection.OpenAsync();
            await using var targetConnection = new Npgsql.NpgsqlConnection(targetDatabase.ConnectionString);
            await targetConnection.OpenAsync();
            await using (var transaction = await targetConnection.BeginTransactionAsync())
            {
                (string Table, string Predicate)[] tables = [
                    ("question_categories", "id = @category"),
                    ("media_assets", "id IN (SELECT media_asset_id FROM question_screenshots WHERE question_id = @screenshot)"),
                    ("question_definitions", "id IN (@screenshot, @text)"),
                    ("question_options", "question_id IN (@screenshot, @text)"),
                    ("question_screenshots", "question_id = @screenshot")
                ];
                foreach (var (table, predicate) in tables)
                {
                    await using var read = new Npgsql.NpgsqlCommand($"SELECT row_to_json(row)::text FROM {table} row WHERE {predicate}", sourceConnection);
                    read.Parameters.AddWithValue("category", input.CategoryId);
                    read.Parameters.AddWithValue("screenshot", uploaded.QuestionId!.Value);
                    read.Parameters.AddWithValue("text", text.QuestionId);
                    await using var rows = await read.ExecuteReaderAsync();
                    while (await rows.ReadAsync())
                    {
                        var record = System.Text.Json.Nodes.JsonNode.Parse(rows.GetString(0))!;
                        if (table == "question_categories")
                        {
                            record["id"] = originalCategoryId.ToString();
                            record["name"] = uncategorized ? QuestionCatalogDefaults.UncategorizedCategoryName : "Локации";
                        }
                        if (table == "question_definitions") record["category_id"] = originalCategoryId.ToString();
                        await using var write = new Npgsql.NpgsqlCommand(
                            $"INSERT INTO {table} SELECT * FROM jsonb_populate_record(NULL::{table}, @record::jsonb)", targetConnection, transaction);
                        write.Parameters.AddWithValue("record", record.ToJsonString());
                        await write.ExecuteNonQueryAsync();
                    }
                }
                await transaction.CommitAsync();
            }
            Guid? publishedGameId = null;
            string? publishedSnapshot = null;
            if (!archived)
            {
                var now = DateTime.UtcNow;
                var game = new Game { Id = Guid.NewGuid(), Title = "Migration history", CreatedAtUtc = now };
                // Seed the historical schema without asking the current EF model for newer columns.
                await target.Database.ExecuteSqlInterpolatedAsync($"""
                    INSERT INTO games (id, title, status, created_at_utc)
                    VALUES ({game.Id}, {game.Title}, 'draft', {now})
                    """);
                var board = new GameBoard
                {
                    Id = Guid.NewGuid(),
                    GameId = game.Id,
                    Rows = 1,
                    Cols = 1,
                    RowLabels = ["A"],
                    ColLabels = ["1"],
                    Version = 1,
                    CreatedAtUtc = now
                };
                target.AddRange(board,
                    new BoardCell
                    {
                        Id = Guid.NewGuid(),
                        BoardId = board.Id,
                        RowIndex = 0,
                        ColIndex = 0,
                        State = BoardCellState.Closed,
                        CellType = BoardCellPersistence.DefaultCellType,
                        Cost = 0
                    },
                    new GameTeamSlot { Id = Guid.NewGuid(), GameId = game.Id, SlotIndex = 1, SlotType = TeamSlotTypeValue.Public, CreatedAtUtc = now });
                var question = await source.QuestionDefinitions.Include(x => x.Options).SingleAsync(x => x.Id == uploaded.QuestionId);
                var categoryName = await target.QuestionCategories.Where(x => x.Id == originalCategoryId).Select(x => x.Name).SingleAsync();
                target.Add(new GameEnabledQuestion
                {
                    GameId = game.Id,
                    QuestionId = question.Id,
                    EnabledAtUtc = now,
                    QuestionRevisionSnapshot = question.Revision,
                    QuestionCodeSnapshot = question.ExternalCode,
                    CategoryNameSnapshot = categoryName,
                    QuestionTextSnapshot = question.Text,
                    ImageSnapshotJson = question.ImageSnapshotJson,
                    OptionIdsSnapshot = question.Options.OrderBy(x => x.SortOrder).Select(x => x.Id).ToArray(),
                    OptionTextsSnapshot = question.Options.OrderBy(x => x.SortOrder).Select(x => x.Text).ToArray(),
                    CorrectOptionIdSnapshot = question.Options.Single(x => x.IsCorrect).Id,
                    RewardSnapshot = question.Reward,
                    SnapshotAtUtc = now
                });
                await target.SaveChangesAsync();
                await target.Database.ExecuteSqlInterpolatedAsync($"""
                    UPDATE games SET status = 'ready', ready_at_utc = {now} WHERE id = {game.Id}
                    """);
                publishedGameId = game.Id;
                publishedSnapshot = await target.Database.SqlQuery<string>($"""
                    SELECT row_to_json(snapshot)::text AS "Value" FROM game_enabled_questions snapshot WHERE game_id = {game.Id}
                    """).SingleAsync();
            }
            await target.GetService<IMigrator>().MigrateAsync("20261103201543_SeparateScreenshotCategories");
            var screenshot = await target.QuestionDefinitions.AsNoTracking().Include(x => x.CategoryDefinition)
                .SingleAsync(x => x.Id == uploaded.QuestionId);
            Assert.NotEqual(originalCategoryId, screenshot.CategoryId);
            Assert.Equal("screenshot", screenshot.CategoryDefinition!.Format);
            Assert.Equal(archived, screenshot.IsDeleted);
            Assert.Equal(imageBefore, screenshot.ImageSnapshotJson);
            Assert.Equal(originalCategoryId, await target.QuestionDefinitions.Where(x => x.Id == text.QuestionId).Select(x => x.CategoryId).SingleAsync());
            Assert.Equal(6, await target.QuestionOptions.CountAsync(x => x.QuestionId == uploaded.QuestionId));
            Assert.Equal(2, await target.QuestionOptions.CountAsync(x => x.QuestionId == text.QuestionId));
            Assert.Equal(2, await target.QuestionCategories.CountAsync(x => x.Name == screenshot.CategoryDefinition!.Name));
            await target.Database.MigrateAsync();
            var consolidated = await target.QuestionDefinitions.AsNoTracking().SingleAsync(x => x.Id == uploaded.QuestionId);
            Assert.Equal(QuestionCatalogDefaults.LocationScreenshotCategoryId, consolidated.CategoryId);
            Assert.Equal(imageBefore, consolidated.ImageSnapshotJson);
            Assert.Equal(archived, consolidated.IsDeleted);
            Assert.Equal(originalCategoryId, await target.QuestionDefinitions.Where(x => x.Id == text.QuestionId).Select(x => x.CategoryId).SingleAsync());
            Assert.Equal(6, await target.QuestionOptions.CountAsync(x => x.QuestionId == uploaded.QuestionId));
            Assert.Equal(1, await target.QuestionCategories.CountAsync(x => x.Format == "screenshot" && x.Name == "Локации"));
            if (publishedGameId.HasValue)
            {
                Assert.Equal(publishedSnapshot, await target.Database.SqlQuery<string>($"""
                    SELECT row_to_json(snapshot)::text AS "Value" FROM game_enabled_questions snapshot WHERE game_id = {publishedGameId.Value}
                    """).SingleAsync());
            }
        }
        finally
        {
            await targetDatabase.DisposeAsync();
        }
    }

    [Fact]
    public async Task MetadataEditPreservesImageAndOptions_AndRejectsAnswerReplacement()
    {
        await using var db = database.CreateDbContext();
        var input = await InputAsync(db);
        var uploaded = await UploadAsync(Service(db), input);
        var question = await db.QuestionDefinitions.Include(x => x.Options).SingleAsync(x => x.Id == uploaded.QuestionId);
        var options = question.Options.OrderBy(x => x.SortOrder).Select(x => new GameQuestionOptionInput(x.Text, x.IsCorrect)).ToArray();
        var ids = question.Options.OrderBy(x => x.SortOrder).Select(x => x.Id).ToArray();
        var originalImage = question.ImageSnapshotJson;
        var repository = new DbGameQuestionRepository(db, TimeProvider.System);
        var catalogItem = (await repository.GetCatalogAsync(input.CategoryId, null, true)).Single(item => item.QuestionId == question.Id);
        Assert.Equal(input.LocationId, catalogItem.ScreenshotLocationId);
        Assert.Equal(await db.HuntLocations.Where(x => x.Id == input.LocationId).Select(x => x.MapId).SingleAsync(), catalogItem.ScreenshotMapId);
        var updated = await repository.UpdateQuestionAsync(question.Id,
            new(input.CategoryId, "Which compound is behind the tower?", options, 42, true, 5));
        Assert.NotNull(updated);
        Assert.Equal(42, updated.Reward);
        Assert.Equal("Which compound is behind the tower?", updated.Text);
        Assert.Equal(ids, updated.Options.OrderBy(x => x.SortOrder).Select(x => x.OptionId));
        Assert.Equal(originalImage, question.ImageSnapshotJson);
        var changed = options.Select((option, index) => index == 0 ? option with { Text = "Changed answer" } : option).ToArray();
        Assert.Null(await repository.UpdateQuestionAsync(question.Id,
            new(input.CategoryId, question.Text, changed, 42, true, 5)));
        Assert.True(System.Text.Json.Nodes.JsonNode.DeepEquals(
            System.Text.Json.Nodes.JsonNode.Parse(originalImage!),
            System.Text.Json.Nodes.JsonNode.Parse((await db.QuestionDefinitions.AsNoTracking().SingleAsync(x => x.Id == question.Id)).ImageSnapshotJson!)));
    }

    [Fact]
    public async Task DatabaseRejectsExtraAndReparentedScreenshotOptions()
    {
        await using var db = database.CreateDbContext();
        var input = await InputAsync(db);
        var uploaded = await UploadAsync(Service(db), input);
        var added = await Assert.ThrowsAsync<Npgsql.PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO question_options (id, question_id, text, normalized_text, is_correct, sort_order, created_at_utc)
            VALUES ({Guid.NewGuid()}, {uploaded.QuestionId}, 'Extra', 'extra', false, 6, {DateTime.UtcNow})
            """));
        Assert.Equal("ck_screenshot_options_complete_set", added.ConstraintName);

        var textQuestion = await new DbGameQuestionRepository(db, TimeProvider.System).CreateQuestionAsync(
            new(null, (await new DbGameQuestionRepository(db, TimeProvider.System).EnsureFallbackCategoryAsync()).Id, "Text question", [new("Correct", true), new("Wrong", false), new("Extra", false)], 1, true, 0));
        var optionId = textQuestion!.Options.Single(x => x.Text == "Extra").OptionId;
        var moved = await Assert.ThrowsAsync<Npgsql.PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE question_options SET question_id = {uploaded.QuestionId}, sort_order = 6 WHERE id = {optionId}
            """));
        Assert.Equal("ck_screenshot_options_complete_set", moved.ConstraintName);
        Assert.Equal(6, await db.QuestionOptions.CountAsync(x => x.QuestionId == uploaded.QuestionId));
        Assert.Equal(3, await db.QuestionOptions.CountAsync(x => x.QuestionId == textQuestion.QuestionId));
    }

    [Fact]
    public async Task ScreenshotDowngradeRejectsDataLoss()
    {
        await using var db = database.CreateDbContext();
        var uploaded = await UploadAsync(Service(db), await InputAsync(db));
        try
        {
            var exception = await Assert.ThrowsAsync<Npgsql.PostgresException>(() =>
                db.GetService<IMigrator>().MigrateAsync("20261102173557_AddHuntLocationCatalog"));
            Assert.Contains("Cannot downgrade consolidated screenshot categories", exception.Message, StringComparison.Ordinal);
            Assert.True(await db.Set<QuestionScreenshot>().AnyAsync(x => x.QuestionId == uploaded.QuestionId));
        }
        finally
        {
            // Earlier, independently committed down steps may precede the rejected destructive step.
            await db.Database.MigrateAsync();
        }
    }

    [Fact]
    public async Task InvalidBytesLocationOrTwitchMessage_DoNotCreateAssets()
    {
        await using var db = database.CreateDbContext();
        var input = await InputAsync(db);
        using var invalid = new MemoryStream("not an image"u8.ToArray());
        Assert.Equal(UploadQuizScreenshotOutcome.InvalidFile,
            (await Service(db).UploadAsync(input, invalid, "image/png", invalid.Length)).Outcome);
        Assert.Equal(UploadQuizScreenshotOutcome.InvalidSelection,
            (await UploadAsync(Service(db), input with { LocationId = Guid.NewGuid() })).Outcome);
        Assert.Equal(UploadQuizScreenshotOutcome.InvalidSelection,
            (await UploadAsync(Service(db), input with { Text = new string('x', 500) })).Outcome);
        Assert.Empty(_storage.ListObjectKeys("quiz"));
        Assert.False(await db.Set<QuestionScreenshot>().AnyAsync(x => x.UploadRequestId == input.RequestId));
    }

    [Fact]
    public async Task FailedPersistenceRemovesUncommittedImage_AndRetryCanSucceed()
    {
        await using var db = database.CreateDbContext();
        var input = await InputAsync(db);
        await using (var failing = database.CreateDbContext(new RejectScreenshotSave()))
            await Assert.ThrowsAsync<InvalidOperationException>(() => UploadAsync(Service(failing), input));
        Assert.Empty(_storage.ListObjectKeys("quiz"));
        Assert.Equal(UploadQuizScreenshotOutcome.Created, (await UploadAsync(Service(db), input)).Outcome);
        AssertStoredImagePair();
    }

    [Fact]
    public async Task ConcurrentRetryCreatesOneQuestionAndAsset_WithSixLocalizedOptions()
    {
        await using var firstDb = database.CreateDbContext();
        await using var secondDb = database.CreateDbContext();
        var input = await InputAsync(firstDb);
        var outcomes = await Task.WhenAll(UploadAsync(Service(firstDb), input), UploadAsync(Service(secondDb), input));
        Assert.Single(outcomes.Select(x => x.QuestionId).Distinct());
        Assert.Contains(outcomes, x => x.Outcome == UploadQuizScreenshotOutcome.Created);
        Assert.Contains(outcomes, x => x.Outcome == UploadQuizScreenshotOutcome.Existing);
        AssertStoredImagePair();
        var question = await firstDb.QuestionDefinitions.AsNoTracking().Include(x => x.Options).SingleAsync(x => x.Id == outcomes[0].QuestionId);
        var image = backend.Domain.Questions.QuizImageSnapshot.FromJson(question.ImageSnapshotJson)!;
        Assert.Equal(6, question.Options.Count);
        Assert.Single(question.Options, x => x.IsCorrect);
        Assert.Equal(6, image.OptionNames.Count);
        Assert.All(image.OptionNames.Values, names => Assert.Equal(["en", "pl", "ru", "uk"], names.Keys.Order()));
        Assert.Equal(UploadQuizScreenshotOutcome.RequestConflict,
            (await UploadAsync(Service(secondDb), input with { Reward = 8 })).Outcome);
        AssertStoredImagePair();
    }

    private void AssertStoredImagePair()
    {
        Assert.Equal(2, _storage.ListObjectKeys("quiz").Count);
        var original = Assert.Single(_storage.ListObjectKeys("quiz", "quiz/screenshots/"));
        var thumbnail = Assert.Single(_storage.ListObjectKeys("quiz", "quiz/thumbnails/"));
        Assert.Equal(Path.GetFileNameWithoutExtension(original), Path.GetFileNameWithoutExtension(thumbnail));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ScreenshotUsesSharedSubmissionAndRewards_AndStaysUntilExplicitHide(bool manual)
    {
        var isolated = new PostgresTestDatabase();
        await isolated.InitializeAsync();
        try { await AssertScreenshotGameAsync(isolated, manual); }
        finally { await isolated.DisposeAsync(); }
    }

    private async Task AssertScreenshotGameAsync(PostgresTestDatabase database, bool manual)
    {
        await using var db = database.CreateDbContext();
        var input = manual ? await ManualInputAsync(db) : await InputAsync(db);
        var upload = await UploadAsync(Service(db), input);
        var question = await db.QuestionDefinitions.Include(x => x.Options).SingleAsync(x => x.Id == upload.QuestionId);
        var secondUpload = await UploadAsync(Service(db), input with { RequestId = Guid.NewGuid(), Priority = -1 });
        var secondQuestion = await db.QuestionDefinitions.Include(x => x.Options).SingleAsync(x => x.Id == secondUpload.QuestionId);
        var now = DateTime.UtcNow.AddSeconds(1);
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Title = "Screenshot quiz",
            Status = GameStatusValue.Draft,
            CreatedAtUtc = now,
            QuizAnswerDurationSeconds = 60,
            ScreenshotAnswerDurationSeconds = 25,
            MinPlayersPerTeam = 1,
            MaxPlayersPerTeam = 2
        };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TwitchUserId = Guid.NewGuid().ToString("N"),
            Login = Guid.NewGuid().ToString("N"),
            DisplayName = "Player",
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        var board = new GameBoard
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            Rows = 1,
            Cols = 1,
            RowLabels = ["A"],
            ColLabels = ["1"],
            Version = 1,
            CreatedAtUtc = now
        };
        var slot = new GameTeamSlot { Id = Guid.NewGuid(), GameId = game.Id, SlotIndex = 1, SlotType = TeamSlotTypeValue.Public, CreatedAtUtc = now };
        var team = new GameTeam
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            SlotId = slot.Id,
            Status = TeamStatusValue.Confirmed,
            CreatedByUserId = user.Id,
            ConfirmedByUserId = user.Id,
            ConfirmedAtUtc = now,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        var categoryName = await db.QuestionCategories.Where(x => x.Id == input.CategoryId).Select(x => x.Name).SingleAsync();
        db.AddRange(game, user, board, slot, team,
            new BoardCell
            {
                Id = Guid.NewGuid(),
                BoardId = board.Id,
                RowIndex = 0,
                ColIndex = 0,
                State = BoardCellState.Closed,
                CellType = BoardCellPersistence.DefaultCellType,
                Cost = 0
            },
            new GameTeamMember { Id = Guid.NewGuid(), GameId = game.Id, TeamId = team.Id, UserId = user.Id, JoinedAtUtc = now },
            new GameEnabledQuestion
            {
                GameId = game.Id,
                QuestionId = question.Id,
                EnabledAtUtc = now,
                QuestionRevisionSnapshot = 1,
                QuestionCodeSnapshot = question.ExternalCode,
                CategoryNameSnapshot = categoryName,
                QuestionTextSnapshot = question.Text,
                ImageSnapshotJson = question.ImageSnapshotJson,
                OptionIdsSnapshot = question.Options.OrderBy(x => x.SortOrder).Select(x => x.Id).ToArray(),
                OptionTextsSnapshot = question.Options.OrderBy(x => x.SortOrder).Select(x => x.Text).ToArray(),
                CorrectOptionIdSnapshot = question.Options.Single(x => x.IsCorrect).Id,
                RewardSnapshot = 7,
                SnapshotAtUtc = now
            });
        db.GameEnabledQuestions.Add(new GameEnabledQuestion
        {
            GameId = game.Id,
            QuestionId = secondQuestion.Id,
            EnabledAtUtc = now,
            QuestionRevisionSnapshot = 1,
            QuestionCodeSnapshot = secondQuestion.ExternalCode,
            CategoryNameSnapshot = categoryName,
            QuestionTextSnapshot = secondQuestion.Text,
            ImageSnapshotJson = secondQuestion.ImageSnapshotJson,
            OptionIdsSnapshot = secondQuestion.Options.OrderBy(x => x.SortOrder).Select(x => x.Id).ToArray(),
            OptionTextsSnapshot = secondQuestion.Options.OrderBy(x => x.SortOrder).Select(x => x.Text).ToArray(),
            CorrectOptionIdSnapshot = secondQuestion.Options.Single(x => x.IsCorrect).Id,
            RewardSnapshot = 7,
            PrioritySnapshot = -1,
            SnapshotAtUtc = now
        });
        await db.SaveChangesAsync();
        game.Status = GameStatusValue.Ready; game.ReadyAtUtc = now;
        await db.SaveChangesAsync();
        game.Status = GameStatusValue.Active; game.StartedAtUtc = now;
        await db.SaveChangesAsync();
        var correct = question.Options.Single(x => x.IsCorrect).Id;
        await new DbGameQuestionRepository(db, TimeProvider.System).UpdateQuestionAsync(question.Id,
            new(input.CategoryId, "New catalog text after publication", manual ? [new("Changed", true), new("Different", false)] : question.Options.OrderBy(x => x.SortOrder)
                .Select(x => new GameQuestionOptionInput(x.Text, x.IsCorrect)).ToArray(), 7, true, 0));
        var repository = new DbGameQuizRepository(db, new Clock(now.AddSeconds(1)));
        Assert.Equal(2, (await repository.GetAvailableQuizQuestionsAsync()).Count);
        Assert.All(await repository.GetAvailableQuizQuestionsAsync(), item => Assert.NotNull(item.Image));
        Assert.Equal(AskQuizQuestionRepositoryOutcome.Unavailable,
            (await repository.AskQuizQuestionAsync(game.Id, null, new ManualGameQuizQuestionDelivery(user.Id))).Outcome);
        var asked = (await repository.AskQuizQuestionAsync(game.Id, null,
            new ManualGameQuizQuestionDelivery(user.Id) { Screenshot = true })).Question!;
        Assert.NotNull(asked.Image);
        Assert.StartsWith("https://media.test/quiz/quiz/screenshots/", asked.Image.ToDto(Storage.PublicBaseUrl).ImageUrl, StringComparison.Ordinal);
        Assert.Equal(TimeSpan.FromSeconds(25), asked.ClosesAtUtc - asked.AskedAtUtc);
        var state = await repository.GetCurrentQuizStateAsync(user.Id);
        Assert.Equal(input.Text, state!.Text);
        Assert.True(state.PresentationVisible);
        Assert.Null(state.CorrectOptionId);
        Assert.Null(await repository.HideScreenshotAsync(asked.QuestionSessionId));
        Assert.True(await GameQuizActivity.BlocksModifiersAsync(db, game.Id, now.AddSeconds(2), default));
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Accepted,
            (await repository.SubmitQuizAnswerAsync(asked.QuestionSessionId, new(correct, new WebGameQuizAnswerSource(user.Id)))).Outcome);
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Existing,
            (await repository.SubmitQuizAnswerAsync(asked.QuestionSessionId, new(correct,
                new TwitchGameQuizAnswerSource(user.TwitchUserId, user.Login, user.DisplayName, "channel", "message")))).Outcome);
        var closed = new DbGameQuizRepository(db, new Clock(asked.ClosesAtUtc));
        await closed.CloseExpiredQuizQuestionSessionsAsync();
        await closed.CloseExpiredQuizQuestionSessionsAsync();
        Assert.Equal(7, await db.GameQuizPointLedgerEntries.Where(x => x.GameId == game.Id).SumAsync(x => x.PointsDelta));
        Assert.True(await GameQuizActivity.BlocksModifiersAsync(db, game.Id, asked.ClosesAtUtc, default));
        var overlay = new DbGameOverlayRepository(db, Options.Create(new StorageOptions { PublicBaseUrl = Storage.PublicBaseUrl }),
            new Clock(asked.ClosesAtUtc), new EphemeralDataProtectionProvider());
        var revealed = await overlay.ReadAsync(default);
        Assert.Equal("screenshot", revealed.Phase);
        Assert.Equal(correct, revealed.QuizQuestion!.CorrectOptionId);
        Assert.Equal(asked.Options.Select(x => x.OptionId), revealed.QuizQuestion.Options.Select(x => x.OptionId));
        Assert.Equal(game.Id, await closed.HideScreenshotAsync(asked.QuestionSessionId));
        Assert.Equal(game.Id, await closed.HideScreenshotAsync(asked.QuestionSessionId));
        Assert.False(await GameQuizActivity.BlocksModifiersAsync(db, game.Id, asked.ClosesAtUtc, default));
        Assert.NotEqual("screenshot", (await overlay.ReadAsync(default)).Phase);
        Assert.Equal(AskQuizQuestionRepositoryOutcome.Unavailable,
            (await closed.AskQuizQuestionAsync(game.Id, question.Id, new ManualGameQuizQuestionDelivery(user.Id) { Screenshot = true })).Outcome);
        var history = await new DbGameHistoryRepository(db, Options.Create(new StorageOptions { PublicBaseUrl = Storage.PublicBaseUrl })).GetGameDetailsAsync(game.Id);
        Assert.Equal(asked.Image.MediaAssetId, Assert.Single(history!.Quiz.QuestionSessions).Image!.MediaAssetId);
        Assert.Equal(7, history.Quiz.TotalPoints);
        var stats = Assert.Single(history.Quiz.PlayerStats);
        Assert.Equal(new GameQuizFormatStatistics(1, 1, 7), stats.ScreenshotStatistics);
        Assert.Equal(new GameQuizFormatStatistics(0, 0, 0), stats.TextStatistics);
        var userHistory = await new DbGameHistoryRepository(db, Options.Create(new StorageOptions { PublicBaseUrl = Storage.PublicBaseUrl }))
            .GetUserGameHistoryAsync(user.Id);
        Assert.Single(userHistory);
        var immutable = await Assert.ThrowsAsync<Npgsql.PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE game_quiz_question_sessions SET image_snapshot_json = NULL WHERE id = {asked.QuestionSessionId}"));
        Assert.Equal("55000", immutable.SqlState);
        var immutableMedia = await Assert.ThrowsAsync<Npgsql.PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE media_assets SET object_key = 'replaced.png' WHERE id = {asked.Image.MediaAssetId}"));
        Assert.Equal("55000", immutableMedia.SqlState);
        await using var concurrentDb = database.CreateDbContext();
        var nextClock = new Clock(asked.ClosesAtUtc.AddSeconds(1));
        var next = await Task.WhenAll(
            new DbGameQuizRepository(db, nextClock).AskQuizQuestionAsync(game.Id, null, new ManualGameQuizQuestionDelivery(user.Id) { Screenshot = true }),
            new DbGameQuizRepository(concurrentDb, nextClock).AskQuizQuestionAsync(game.Id, null, new ManualGameQuizQuestionDelivery(user.Id) { Screenshot = true }));
        var secondAsked = Assert.Single(next, x => x.Outcome == AskQuizQuestionRepositoryOutcome.Asked).Question!;
        Assert.Equal(secondQuestion.Id, secondAsked.QuestionId);
        Assert.Single(next, x => x.Outcome == AskQuizQuestionRepositoryOutcome.Unavailable);
        Assert.Null(await closed.HideScreenshotAsync(asked.QuestionSessionId));
        Assert.Equal(secondAsked.QuestionSessionId, (await overlay.ReadAsync(default)).QuizQuestion!.QuestionSessionId);
    }

    private sealed class Clock(DateTime now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(now, TimeSpan.Zero);
    }

    private sealed class RejectScreenshotSave : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (eventData.Context!.ChangeTracker.Entries<QuestionScreenshot>().Any())
                throw new InvalidOperationException("Injected storage attachment failure.");
            return ValueTask.FromResult(result);
        }
    }
}
