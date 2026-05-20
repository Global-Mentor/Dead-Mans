using backend.Application.Abstractions.Repositories;
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
        Assert.Equal(30, snapshot.Cells.Count);
        Assert.All(snapshot.Cells, cell => Assert.Empty(cell.Media));

        var game = await db.Games.SingleAsync();
        Assert.Equal(GameStatusValue.Draft, game.Status);
        Assert.Null(game.FinishedAtUtc);

        var board = await db.GameBoards.SingleAsync();
        Assert.Equal(6, board.Rows);
        Assert.Equal(5, board.Cols);

        Assert.Equal(30, await db.BoardCells.CountAsync());
        Assert.Equal(0, await db.BoardCellMedia.CountAsync());
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
