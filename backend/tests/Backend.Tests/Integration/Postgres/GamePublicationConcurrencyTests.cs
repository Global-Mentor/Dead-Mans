using System.Diagnostics;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data;
using backend.Domain.Persistence;
using backend.Infrastructure.Configuration;
using backend.Infrastructure.Persistence;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
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
