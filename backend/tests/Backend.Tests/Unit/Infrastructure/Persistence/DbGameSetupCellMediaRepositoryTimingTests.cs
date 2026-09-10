using backend.Data;
using backend.Data.Entities;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Unit.Infrastructure.Persistence;

public sealed class DbGameSetupCellMediaRepositoryTimingTests
{
    [Fact]
    public async Task AttachMediaAsync_UsesInjectedClock()
    {
        var timestamp = new DateTimeOffset(2035, 4, 5, 6, 7, 8, TimeSpan.Zero);
        await using var dbContext = CreateDbContext();
        var cellId = Guid.NewGuid();
        var mediaId = Guid.NewGuid();
        var gameId = Guid.NewGuid();
        var boardId = Guid.NewGuid();
        dbContext.Games.Add(new Game { Id = gameId, Title = "Draft", Status = "draft" });
        dbContext.GameBoards.Add(new GameBoard { Id = boardId, GameId = gameId, Version = 1, Rows = 1, Cols = 1 });
        dbContext.BoardCells.Add(new BoardCell { Id = cellId, BoardId = boardId });
        await dbContext.SaveChangesAsync();
        var repository = new DbGameSetupCellMediaRepository(
            dbContext,
            new FixedTimeProvider(timestamp)
        );

        await repository.AttachMediaAsync(
            cellId,
            mediaId,
            "test-bucket",
            "games/cell/image.webp",
            "image/webp",
            123,
            "https://cdn.example"
        );

        var media = await dbContext.MediaAssets.SingleAsync(x => x.Id == mediaId);
        Assert.Equal(timestamp.UtcDateTime, media.CreatedAtUtc);
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
