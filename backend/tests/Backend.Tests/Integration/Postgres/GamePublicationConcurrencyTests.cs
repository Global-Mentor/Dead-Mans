using System.Diagnostics;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data;
using backend.Domain.Persistence;
using backend.Infrastructure.Configuration;
using backend.Infrastructure.Persistence;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Backend.Tests.Integration.Postgres;

public sealed class GamePublicationConcurrencyTests(PostgresTestDatabase database)
    : IClassFixture<PostgresTestDatabase>
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task SaveAndPublication_OnlyPublishTheReviewedVersion(bool saveFirst)
    {
        var draft = await CreateDraftAsync();
        var update = new GameSetupDraftUpdate(
            draft.Version, "Changed draft", draft.RowLabels, draft.ColLabels,
            draft.Cells.Select(cell => new GameSetupCellUpdate(cell.Id.ToString(), cell.Row, cell.Col, cell.Title, cell.Cost)).ToArray(),
            [], []);
        Task<UpdateDraftSetupRepositoryResult> Save(ApplicationDbContext db) => Setup(db).UpdateDraftSetupAsync(update);
        Task<GameLifecycleResult> Publish(ApplicationDbContext db) => Lifecycle(db).OpenRegistrationAsync(Guid.Parse(draft.GameId), draft.Version);

        var (saved, published) = saveFirst
            ? await RunInOrderAsync(Save, Publish)
            : await ReverseAsync(Publish, Save);

        await using var readDb = database.CreateDbContext();
        var game = await readDb.Games.SingleAsync();
        var board = await readDb.GameBoards.SingleAsync();
        if (saveFirst)
        {
            Assert.Equal(UpdateDraftSetupRepositoryStatus.Updated, saved.Status);
            Assert.Equal(GameLifecycleErrorCode.DraftStaleVersion, published.Error);
            Assert.Equal(GameStatusValue.Draft, game.Status);
            Assert.Equal(update.Title, game.Title);
            Assert.Equal(draft.Version + 1, board.Version);
        }
        else
        {
            Assert.True(published.Success);
            Assert.Equal(UpdateDraftSetupRepositoryStatus.NotFound, saved.Status);
            Assert.Equal(GameStatusValue.Ready, game.Status);
            Assert.Equal(draft.Title, game.Title);
            Assert.Equal(draft.Version, board.Version);
        }
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ResetAndPublication_DoNotDeleteAPublishedGame(bool resetFirst)
    {
        var draft = await CreateDraftAsync();
        Task<Guid?> Reset(ApplicationDbContext db) => Setup(db).DeleteDraftSetupAsync();
        Task<GameLifecycleResult> Publish(ApplicationDbContext db) => Lifecycle(db).OpenRegistrationAsync(Guid.Parse(draft.GameId), draft.Version);
        var (deletedId, published) = resetFirst
            ? await RunInOrderAsync(Reset, Publish)
            : await ReverseAsync(Publish, Reset);

        await using var readDb = database.CreateDbContext();
        if (resetFirst)
        {
            Assert.Equal(Guid.Parse(draft.GameId), deletedId);
            Assert.Equal(GameLifecycleErrorCode.DraftNotFound, published.Error);
            Assert.Empty(await readDb.Games.ToArrayAsync());
        }
        else
        {
            Assert.Null(deletedId);
            Assert.True(published.Success);
            Assert.Equal(GameStatusValue.Ready, (await readDb.Games.SingleAsync()).Status);
        }
    }

    [Theory]
    [InlineData(true, true)]
    [InlineData(true, false)]
    [InlineData(false, true)]
    [InlineData(false, false)]
    public async Task MediaAndPublication_DoNotChangePublishedImages(bool attach, bool mediaFirst)
    {
        var draft = await CreateDraftAsync();
        var cellId = Guid.Parse(draft.Cells[0].Id);
        if (!attach)
        {
            await using var seedDb = database.CreateDbContext();
            await Media(seedDb).AttachMediaAsync(cellId, Guid.NewGuid(), "test", "original.png", "image/png", 100, "http://localhost");
        }
        async Task<bool> ChangeMedia(ApplicationDbContext db) => attach
            ? await Media(db).AttachMediaAsync(cellId, Guid.NewGuid(), "test", "new.png", "image/png", 100, "http://localhost") is not null
            : await Media(db).DetachMediaAsync(cellId) is not null;
        Task<GameLifecycleResult> Publish(ApplicationDbContext db) => Lifecycle(db).OpenRegistrationAsync(Guid.Parse(draft.GameId), draft.Version);
        var (changed, published) = mediaFirst
            ? await RunInOrderAsync(ChangeMedia, Publish)
            : await ReverseAsync(Publish, ChangeMedia);

        Assert.True(published.Success);
        Assert.Equal(mediaFirst, changed);
        await using var readDb = database.CreateDbContext();
        Assert.Equal(GameStatusValue.Ready, (await readDb.Games.SingleAsync()).Status);
        Assert.Equal(attach == mediaFirst ? 1 : 0, await readDb.BoardCellMedia.CountAsync());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Publication_WhenSelectedQuestionBecomesUnavailable_RequiresReviewOfSynchronizedDraft(bool deleted)
    {
        var draft = await CreateDraftAsync();
        Guid questionId;
        int reviewedVersion;
        await using (var seedDb = database.CreateDbContext())
        {
            var catalog = new DbGameQuestionRepository(seedDb, TimeProvider.System);
            var category = await catalog.CreateCategoryAsync("Availability");
            var question = await catalog.CreateQuestionAsync(new CreateGameQuestionInput(
                "q-availability", category.Id, "Capital?", "Paris", ["Paris", "Париж"], 1, true, 0));
            Assert.NotNull(question);
            questionId = question.QuestionId;
            var saved = await Setup(seedDb).UpdateDraftSetupAsync(new GameSetupDraftUpdate(
                draft.Version, draft.Title, draft.RowLabels, draft.ColLabels,
                draft.Cells.Select(cell => new GameSetupCellUpdate(cell.Id, cell.Row, cell.Col, cell.Title, cell.Cost)).ToArray(),
                [], [questionId]));
            Assert.Equal(UpdateDraftSetupRepositoryStatus.Updated, saved.Status);
            reviewedVersion = saved.Snapshot!.Version;
            Assert.True(deleted
                ? await catalog.SoftDeleteQuestionAsync(questionId)
                : await catalog.SetQuestionEnabledAsync(questionId, false));
        }

        await using (var publishDb = database.CreateDbContext())
        {
            var result = await Lifecycle(publishDb).OpenRegistrationAsync(Guid.Parse(draft.GameId), reviewedVersion);
            Assert.False(result.Success);
            Assert.Equal(GameLifecycleErrorCode.DraftStaleVersion, result.Error);
        }
        await using (var verifyDb = database.CreateDbContext())
        {
            var game = await verifyDb.Games.SingleAsync();
            Assert.Equal(GameStatusValue.Draft, game.Status);
            Assert.Null(game.ReadyAtUtc);
            Assert.Equal(reviewedVersion + 1, (await verifyDb.GameBoards.SingleAsync()).Version);
            Assert.Empty(await verifyDb.GameEnabledQuestions.ToArrayAsync());
        }
        await using var retryDb = database.CreateDbContext();
        Assert.True((await Lifecycle(retryDb).OpenRegistrationAsync(Guid.Parse(draft.GameId), reviewedVersion + 1)).Success);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DisableAndSave_CannotAttachAnUnavailableQuestion(bool disableFirst)
    {
        var draft = await CreateDraftAsync();
        var questionId = await CreateQuestionAsync();
        Task<bool> Disable(ApplicationDbContext db) => new DbGameQuestionRepository(db, TimeProvider.System)
            .SetQuestionEnabledAsync(questionId, false);
        Task<UpdateDraftSetupRepositoryResult> Save(ApplicationDbContext db) => Setup(db)
            .UpdateDraftSetupAsync(SelectQuestion(draft, questionId) with { Title = "Saved title" });
        var (disabled, saved) = disableFirst
            ? await RunInOrderAsync(Disable, Save)
            : await ReverseAsync(Save, Disable);

        Assert.True(disabled);
        Assert.Equal(disableFirst ? UpdateDraftSetupRepositoryStatus.InvalidEnabledQuestions
            : UpdateDraftSetupRepositoryStatus.Updated, saved.Status);
        await using var verifyDb = database.CreateDbContext();
        var current = await Setup(verifyDb).GetLatestDraftSetupSnapshotAsync();
        Assert.NotNull(current);
        Assert.Empty(current.EnabledQuestionIds);
        Assert.Equal(disableFirst ? draft.Title : "Saved title", current.Title);
        Assert.Equal(draft.Version + (disableFirst ? 0 : 2), current.Version);
        Assert.Equal(draft.Cells.Select(cell => (cell.Id, cell.Row, cell.Col, cell.Title, cell.Cost, cell.State)),
            current.Cells.Select(cell => (cell.Id, cell.Row, cell.Col, cell.Title, cell.Cost, cell.State)));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DisableAndPublication_EitherRequireReviewOrKeepThePublishedSnapshot(bool disableFirst)
    {
        var draft = await CreateDraftAsync();
        var questionId = await CreateQuestionAsync();
        await using (var seedDb = database.CreateDbContext())
        {
            draft = (await Setup(seedDb).UpdateDraftSetupAsync(SelectQuestion(draft, questionId))).Snapshot!;
        }
        Task<bool> Disable(ApplicationDbContext db) => new DbGameQuestionRepository(db, TimeProvider.System)
            .SetQuestionEnabledAsync(questionId, false);
        Task<GameLifecycleResult> Publish(ApplicationDbContext db) => Lifecycle(db)
            .OpenRegistrationAsync(Guid.Parse(draft.GameId), draft.Version);
        var (disabled, published) = disableFirst
            ? await RunInOrderAsync(Disable, Publish)
            : await ReverseAsync(Publish, Disable);

        Assert.True(disabled);
        Assert.Equal(!disableFirst, published.Success);
        await using var verifyDb = database.CreateDbContext();
        Assert.Equal(disableFirst ? GameStatusValue.Draft : GameStatusValue.Ready,
            (await verifyDb.Games.SingleAsync()).Status);
        Assert.Equal(disableFirst ? 0 : 1, await verifyDb.GameEnabledQuestions.CountAsync());
        if (disableFirst) Assert.Equal(GameLifecycleErrorCode.DraftStaleVersion, published.Error);
    }

    [Fact]
    public async Task AvailabilityMigration_RemovesLegacyDraftSelectionsAndPreservesPublishedQuestions()
    {
        var publishedDraft = await CreateDraftAsync();
        var questionId = await CreateQuestionAsync();
        await using (var seedDb = database.CreateDbContext())
        {
            var setup = Setup(seedDb);
            var saved = await setup.UpdateDraftSetupAsync(SelectQuestion(publishedDraft, questionId));
            Assert.True((await Lifecycle(seedDb).OpenRegistrationAsync(Guid.Parse(publishedDraft.GameId), saved.Snapshot!.Version)).Success);
        }
        GameBoardSnapshot legacyDraft;
        await using (var seedDb = database.CreateDbContext())
        {
            var setup = Setup(seedDb);
            var draft = await setup.CreateDraftSetupAsync("Legacy draft");
            Assert.NotNull(draft);
            legacyDraft = (await setup.UpdateDraftSetupAsync(SelectQuestion(draft, questionId))).Snapshot!;
            await seedDb.GetService<IMigrator>().MigrateAsync("20260911162438_AllowEquivalentQuestionAnswers");
            // Model the pre-fix behavior, which left draft selections attached.
            await seedDb.Database.ExecuteSqlInterpolatedAsync($"UPDATE question_definitions SET is_enabled = false WHERE id = {questionId}");
        }
        await using (var migrateDb = database.CreateDbContext())
        {
            await migrateDb.Database.MigrateAsync();
        }
        await using var verifyDb = database.CreateDbContext();
        var synchronizedDraft = await Setup(verifyDb).GetLatestDraftSetupSnapshotAsync();
        Assert.NotNull(synchronizedDraft);
        Assert.Empty(synchronizedDraft.EnabledQuestionIds);
        Assert.Equal(legacyDraft.Version + 1, synchronizedDraft.Version);
        Assert.Equal(legacyDraft.Title, synchronizedDraft.Title);
        var publishedSelection = await verifyDb.GameEnabledQuestions.SingleAsync();
        Assert.Equal(Guid.Parse(publishedDraft.GameId), publishedSelection.GameId);
        Assert.Equal(questionId, publishedSelection.QuestionId);
    }

    private async Task<Guid> CreateQuestionAsync()
    {
        await using var db = database.CreateDbContext();
        var catalog = new DbGameQuestionRepository(db, TimeProvider.System);
        var category = await catalog.CreateCategoryAsync("Availability");
        var question = await catalog.CreateQuestionAsync(new CreateGameQuestionInput(
            "q-availability", category.Id, "Capital?", "Paris", ["Paris"], 1, true, 0));
        Assert.NotNull(question);
        return question.QuestionId;
    }

    private static GameSetupDraftUpdate SelectQuestion(GameBoardSnapshot draft, Guid questionId) => new(
        draft.Version, draft.Title, draft.RowLabels, draft.ColLabels,
        draft.Cells.Select(cell => new GameSetupCellUpdate(cell.Id, cell.Row, cell.Col, cell.Title, cell.Cost)).ToArray(),
        [], [questionId]);

    private async Task<GameBoardSnapshot> CreateDraftAsync()
    {
        await database.ResetAsync();
        await using var db = database.CreateDbContext();
        var draft = await Setup(db).CreateDraftSetupAsync("Reviewed draft");
        Assert.NotNull(draft);
        Assert.Empty(draft.EnabledQuestionIds);
        return draft;
    }

    // Queue both real transactions behind a gate, then release them in a known order.
    // Observing PostgreSQL's waiters avoids timing-dependent Task.Delay race tests.
    private async Task<(TFirst, TSecond)> RunInOrderAsync<TFirst, TSecond>(
        Func<ApplicationDbContext, Task<TFirst>> first,
        Func<ApplicationDbContext, Task<TSecond>> second)
    {
        await using var gateDb = database.CreateDbContext();
        await using var gate = await gateDb.Database.BeginTransactionAsync();
        await ModifierCatalogTransactionLock.AcquireAsync(gateDb, CancellationToken.None);
        await using var firstDb = database.CreateDbContext();
        await using var secondDb = database.CreateDbContext();
        await firstDb.Database.OpenConnectionAsync();
        await secondDb.Database.OpenConnectionAsync();
        var firstTask = first(firstDb);
        await WaitForLockAsync(((NpgsqlConnection)firstDb.Database.GetDbConnection()).ProcessID);
        var secondTask = second(secondDb);
        await WaitForLockAsync(((NpgsqlConnection)secondDb.Database.GetDbConnection()).ProcessID);
        await gate.CommitAsync();
        await Task.WhenAll(firstTask, secondTask);
        return (await firstTask, await secondTask);
    }

    private async Task<(TSecond, TFirst)> ReverseAsync<TFirst, TSecond>(
        Func<ApplicationDbContext, Task<TFirst>> first,
        Func<ApplicationDbContext, Task<TSecond>> second)
    {
        var (a, b) = await RunInOrderAsync(first, second);
        return (b, a);
    }

    private async Task WaitForLockAsync(int processId)
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "SELECT EXISTS (SELECT 1 FROM pg_locks WHERE pid = @pid AND locktype = 'advisory' AND NOT granted)", connection);
        command.Parameters.AddWithValue("pid", processId);
        var elapsed = Stopwatch.StartNew();
        while (elapsed.Elapsed < TimeSpan.FromSeconds(10))
        {
            if (await command.ExecuteScalarAsync() is true) return;
            await Task.Delay(10);
        }
        Assert.Fail($"Transaction {processId} did not wait for the publication lock.");
    }

    private static DbGameSetupRepository Setup(ApplicationDbContext db) => new(
        db, Options.Create(new StorageOptions { PublicBaseUrl = "http://localhost" }),
        NullLogger<DbGameSetupRepository>.Instance, TimeProvider.System);
    private static DbGameLifecyclePersistence Lifecycle(ApplicationDbContext db) => new(
        db, NullLogger<DbGameLifecyclePersistence>.Instance, TimeProvider.System);
    private static DbGameSetupCellMediaRepository Media(ApplicationDbContext db) => new(db, TimeProvider.System);
}
