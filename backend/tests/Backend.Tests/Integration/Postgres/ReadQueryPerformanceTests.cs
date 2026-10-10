using System.Data.Common;
using System.Text.RegularExpressions;
using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Infrastructure.Configuration;
using backend.Infrastructure.Persistence;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Backend.Tests.Integration.Postgres;

public sealed class ReadQueryPerformanceTests(PostgresTestDatabase database)
    : IClassFixture<PostgresTestDatabase>
{
    [Fact]
    public async Task BoardSnapshot_LoadsDurationWithBoardWithoutAnExtraQuery()
    {
        await database.ResetAsync();
        await using (var seed = database.CreateDbContext())
        {
            var now = DateTime.UtcNow;
            var game = new Game
            {
                Id = Guid.NewGuid(),
                Title = "Read performance",
                CreatedAtUtc = now,
                QuizAnswerDurationSeconds = 125
            };
            var board = new GameBoard
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                Rows = 1,
                Cols = 1,
                RowLabels = ["A"],
                ColLabels = ["1"],
                CreatedAtUtc = now
            };
            seed.AddRange(game, board, new BoardCell
            {
                Id = Guid.NewGuid(),
                BoardId = board.Id,
                RowIndex = 0,
                ColIndex = 0,
                State = BoardCellState.Closed,
                CellType = BoardCellPersistence.DefaultCellType,
                Cost = 0
            });
            await seed.SaveChangesAsync();
        }

        var commands = new ReadCommands();
        await using var db = database.CreateDbContext(commands);
        var repository = new DbGameBoardRepository(db,
            Options.Create(new StorageOptions { PublicBaseUrl = "https://cdn.example" }),
            NullLogger<DbGameBoardRepository>.Instance, TimeProvider.System);
        var snapshot = await repository.GetLatestBoardByStatusAsync(GameStatusValue.Draft);

        Assert.NotNull(snapshot);
        Assert.Equal(125, snapshot.QuizAnswerDurationSeconds);
        Assert.Equal(4, commands.Sql.Count);
        Assert.Contains("quiz_answer_duration_seconds", commands.Sql[0]);
    }

    [Fact]
    public async Task QuestionCatalog_ProjectsOptionsAndCountsOnceWithoutPerQuestionQueries()
    {
        await database.ResetAsync();
        await using (var seed = database.CreateDbContext())
        {
            var repository = new DbGameQuestionRepository(seed, TimeProvider.System);
            var category = await repository.CreateCategoryAsync("Read performance");
            for (var index = 0; index < 25; index++)
            {
                await repository.CreateQuestionAsync(new CreateGameQuestionInput(
                    $"perf-{index}", category.Id, $"Question {index}",
                    [new("Right", true), new("Wrong", false)], 5, true, index));
            }
        }

        var commands = new ReadCommands();
        await using var db = database.CreateDbContext(commands);
        var result = await new DbGameQuestionRepository(db, TimeProvider.System)
            .GetCatalogAsync(null, null, true);

        Assert.Equal(25, result.Count);
        Assert.All(result, item =>
        {
            Assert.Equal(2, item.Options.Count);
            Assert.Equal(0m, item.CorrectPercentage);
            Assert.Equal(0, item.SubmissionTotalCount);
        });
        var sql = Assert.Single(commands.Sql);
        Assert.Equal(3, Regex.Matches(sql, @"COUNT\(", RegexOptions.IgnoreCase).Count);
    }

    private sealed class ReadCommands : DbCommandInterceptor
    {
        public List<string> Sql { get; } = [];

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command, CommandEventData eventData,
            InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            Sql.Add(command.CommandText);
            return ValueTask.FromResult(result);
        }
    }
}
