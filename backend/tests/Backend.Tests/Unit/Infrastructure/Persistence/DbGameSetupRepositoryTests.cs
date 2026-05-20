using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Application.Features.GameSetup;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests.Unit.Infrastructure.Persistence;

public sealed class DbGameSetupRepositoryTests
{
    [Fact]
    public async Task GetLatestDraftSetupSnapshotAsync_WhenDraftExists_ReturnsDraftWithBoard()
    {
        await using var db = CreateContext();
        var draftId = Guid.NewGuid();
        var boardId = Guid.NewGuid();
        var createdAt = DateTime.UtcNow;

        db.Games.Add(
            new Game
            {
                Id = draftId,
                Title = "Draft game",
                Status = GameStatusValue.Draft,
                CreatedAtUtc = createdAt
            }
        );
        db.GameBoards.Add(
            new GameBoard
            {
                Id = boardId,
                GameId = draftId,
                Rows = 1,
                Cols = 1,
                RowLabels = ["A"],
                ColLabels = ["1"],
                CreatedAtUtc = createdAt
            }
        );
        await db.SaveChangesAsync();

        IGameSetupRepository repo = new DbGameSetupRepository(db, NullLogger<DbGameSetupRepository>.Instance);

        var snapshot = await repo.GetLatestDraftSetupSnapshotAsync();

        Assert.NotNull(snapshot);
        Assert.Equal(draftId.ToString(), snapshot!.GameId);
        Assert.Equal(GameStatusValue.Draft, snapshot.Status);
    }

    [Fact]
    public async Task CreateDraftSetupAsync_CreatesGameBoardAndCellsWithoutMedia()
    {
        await using var db = CreateContext();
        IGameSetupRepository repo = new DbGameSetupRepository(db, NullLogger<DbGameSetupRepository>.Instance);

        var snapshot = await repo.CreateDraftSetupAsync("My setup game");

        Assert.NotNull(snapshot);
        Assert.Equal("My setup game", snapshot!.Title);
        Assert.Equal(GameStatusValue.Draft, snapshot.Status);
        Assert.Equal(25, snapshot.Cells.Count);
        Assert.All(snapshot.Cells, cell => Assert.Empty(cell.Media));

        var game = await db.Games.SingleAsync();
        Assert.Equal(GameStatusValue.Draft, game.Status);
        Assert.Null(game.FinishedAtUtc);

        var board = await db.GameBoards.SingleAsync();
        Assert.Equal(5, board.Rows);
        Assert.Equal(5, board.Cols);

        Assert.Equal(25, await db.BoardCells.CountAsync());
        Assert.Equal(0, await db.BoardCellMedia.CountAsync());
        Assert.All(snapshot.Cells, cell => Assert.Null(cell.Title));
        Assert.Equal(
            GameSetupStubDefaults.DefaultRowCosts,
            snapshot.Cells.GroupBy(cell => cell.Row).OrderBy(group => group.Key).Select(group => group.First().Cost).ToArray()
        );
    }

    [Fact]
    public async Task DeleteDraftSetupAsync_WhenDraftExists_RemovesDraftGame()
    {
        await using var db = CreateContext();
        IGameSetupRepository repo = new DbGameSetupRepository(db, NullLogger<DbGameSetupRepository>.Instance);

        await repo.CreateDraftSetupAsync("Draft to delete");
        var deleted = await repo.DeleteDraftSetupAsync();

        Assert.True(deleted);
        Assert.Equal(0, await db.Games.CountAsync());
        Assert.Equal(0, await db.GameBoards.CountAsync());
        Assert.Equal(0, await db.BoardCells.CountAsync());
    }

    [Fact]
    public async Task DeleteDraftSetupAsync_WhenNoDraft_ReturnsFalse()
    {
        await using var db = CreateContext();
        IGameSetupRepository repo = new DbGameSetupRepository(db, NullLogger<DbGameSetupRepository>.Instance);

        var deleted = await repo.DeleteDraftSetupAsync();

        Assert.False(deleted);
    }

    [Fact]
    public async Task UpdateDraftSetupAsync_PersistsTitleColumnsAndCellFields()
    {
        await using var db = CreateContext();
        IGameSetupRepository repo = new DbGameSetupRepository(db, NullLogger<DbGameSetupRepository>.Instance);

        var created = await repo.CreateDraftSetupAsync("Initial title");
        Assert.NotNull(created);

        var update = new GameSetupDraftUpdate(
            "Updated title",
            ["100", "125", "150", "175", "200"],
            ["One", "Two", "Three", "Four", "Five"],
            created.Cells
                .Select(cell => new GameSetupCellUpdate(cell.Id, cell.Row, cell.Col, $"Title {cell.Row}-{cell.Col}", cell.Cost + 5))
                .ToArray()
        );

        var saved = await repo.UpdateDraftSetupAsync(update);

        Assert.NotNull(saved);
        Assert.Equal("Updated title", saved!.Title);
        Assert.Equal(["One", "Two", "Three", "Four", "Five"], saved.ColLabels);
        Assert.Equal(2, saved.Version);
        Assert.Equal("Title 0-0", saved.Cells[0].Title);
        Assert.Equal(created.Cells[0].Cost + 5, saved.Cells[0].Cost);

        var game = await db.Games.SingleAsync();
        Assert.Equal("Updated title", game.Title);
    }

    [Fact]
    public async Task UpdateDraftSetupAsync_WhenRowsShift_PreservesCellsById()
    {
        await using var db = CreateContext();
        IGameSetupRepository repo = new DbGameSetupRepository(db, NullLogger<DbGameSetupRepository>.Instance);

        var created = await repo.CreateDraftSetupAsync("Initial title");
        Assert.NotNull(created);
        var originalTopLeft = created.Cells.Single(cell => cell.Row == 0 && cell.Col == 0);
        var originalSecondRowLeft = created.Cells.Single(cell => cell.Row == 1 && cell.Col == 0);

        var insertedRowCells = Enumerable.Range(0, created.Cols)
            .Select(col => new GameSetupCellUpdate(null, 0, col, null, GameSetupStubDefaults.GetRowCost(0)));
        var shiftedExistingCells = created.Cells
            .Select(cell => new GameSetupCellUpdate(cell.Id, cell.Row + 1, cell.Col, cell.Title, cell.Cost));

        db.ChangeTracker.Clear();

        var saved = await repo.UpdateDraftSetupAsync(
            new GameSetupDraftUpdate(
                "Initial title",
                ["100", "125", "150", "175", "200", "225"],
                created.ColLabels.ToArray(),
                insertedRowCells.Concat(shiftedExistingCells).ToArray()
            )
        );

        Assert.NotNull(saved);
        Assert.Equal(6, saved!.Rows);
        Assert.Equal(originalTopLeft.Id, saved.Cells.Single(cell => cell.Row == 1 && cell.Col == 0).Id);
        Assert.Equal(originalSecondRowLeft.Id, saved.Cells.Single(cell => cell.Row == 2 && cell.Col == 0).Id);
        Assert.NotEqual(originalTopLeft.Id, saved.Cells.Single(cell => cell.Row == 0 && cell.Col == 0).Id);
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new ApplicationDbContext(options);
    }
}
