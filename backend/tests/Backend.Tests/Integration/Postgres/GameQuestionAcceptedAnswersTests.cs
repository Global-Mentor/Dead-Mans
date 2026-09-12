using System.Diagnostics;
using backend.Application.Contracts;
using backend.Infrastructure.Persistence;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Backend.Tests.Integration.Postgres;

public sealed class GameQuestionAcceptedAnswersTests : IClassFixture<PostgresTestDatabase>
{
    private readonly PostgresTestDatabase _database;

    public GameQuestionAcceptedAnswersTests(PostgresTestDatabase database)
    {
        _database = database;
    }

    [Fact]
    public async Task UpdateQuestionAsync_ConcurrentReplacementsSerializeBeforeReadingAnswers()
    {
        await _database.ResetAsync();
        await using var seedDb = _database.CreateDbContext();
        var seedRepository = new DbGameQuestionRepository(seedDb, TimeProvider.System);
        var category = await seedRepository.CreateCategoryAsync("Concurrent answers");
        var question = await seedRepository.CreateQuestionAsync(new CreateGameQuestionInput(
            "q-concurrent", category.Id, "Capital?", "Paris", ["Paris", "Париж"], 1, true, 0));
        Assert.NotNull(question);

        await using var gateDb = _database.CreateDbContext();
        await using var gate = await gateDb.Database.BeginTransactionAsync();
        await gateDb.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT 1 FROM question_definitions WHERE id = {question.QuestionId} FOR UPDATE");
        await using var firstDb = _database.CreateDbContext();
        await using var secondDb = _database.CreateDbContext();
        await firstDb.Database.OpenConnectionAsync();
        await secondDb.Database.OpenConnectionAsync();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        var first = new DbGameQuestionRepository(firstDb, TimeProvider.System).UpdateQuestionAsync(
            question.QuestionId,
            new UpdateGameQuestionInput(category.Id, "First edit", "London", ["London", "Лондон"], 2, true, 0),
            timeout.Token);
        Task<GameQuestionCatalogItem?>? second = null;
        try
        {
            await WaitForLockAsync(((NpgsqlConnection)firstDb.Database.GetDbConnection()).ProcessID, timeout.Token);
            second = new DbGameQuestionRepository(secondDb, TimeProvider.System).UpdateQuestionAsync(
                question.QuestionId,
                new UpdateGameQuestionInput(category.Id, "Second edit", "Warsaw", ["Warsaw", "Варшава"], 3, true, 0),
                timeout.Token);
            await WaitForLockAsync(((NpgsqlConnection)secondDb.Database.GetDbConnection()).ProcessID, timeout.Token);
        }
        finally
        {
            await gate.CommitAsync();
        }

        Assert.NotNull(await first);
        Assert.NotNull(await second!);
        await using var verifyDb = _database.CreateDbContext();
        var stored = await verifyDb.QuestionDefinitions.Include(item => item.AcceptedAnswers).SingleAsync();
        Assert.Equal("Second edit", stored.Text);
        Assert.Equal(3, stored.Revision);
        Assert.Equal(["Warsaw", "Варшава"], stored.AcceptedAnswers.OrderBy(item => item.SortOrder)
            .Select(item => item.AnswerText).ToArray());
    }

    private async Task WaitForLockAsync(int processId, CancellationToken cancellationToken)
    {
        await using var connection = new NpgsqlConnection(_database.ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE pid = @pid AND wait_event_type = 'Lock')", connection);
        command.Parameters.AddWithValue("pid", processId);
        var elapsed = Stopwatch.StartNew();
        while (elapsed.Elapsed < TimeSpan.FromSeconds(10))
        {
            if (await command.ExecuteScalarAsync(cancellationToken) is true) return;
            await Task.Delay(10, cancellationToken);
        }
        Assert.Fail($"Transaction {processId} did not wait for the question lock.");
    }

    [Fact]
    public async Task UpdateQuestionAsync_CanSwapAndAddAnswersWithoutUniqueViolations()
    {
        await _database.ResetAsync();
        Guid questionId;
        Guid categoryId;

        await using (var db = _database.CreateDbContext())
        {
            var repository = new DbGameQuestionRepository(db, TimeProvider.System);
            var category = await repository.CreateCategoryAsync("Geography");
            categoryId = category.Id;
            var created = await repository.CreateQuestionAsync(
                new CreateGameQuestionInput(
                    "q-swap",
                    categoryId,
                    "Capital?",
                    "Paris",
                    ["Paris", "London"],
                    1,
                    true,
                    0
                )
            );
            Assert.NotNull(created);
            questionId = created.QuestionId;
        }

        await using (var db = _database.CreateDbContext())
        {
            var repository = new DbGameQuestionRepository(db, TimeProvider.System);
            var updated = await repository.UpdateQuestionAsync(
                questionId,
                new UpdateGameQuestionInput(
                    categoryId,
                    "Capitals?",
                    "London",
                    ["London", "Paris", "Париж"],
                    2,
                    true,
                    1
                )
            );

            Assert.NotNull(updated);
            Assert.Equal("London", updated.Answer);
            Assert.Equal(["London", "Paris", "Париж"], updated.Answers);
        }

        await using var assertDb = _database.CreateDbContext();
        var stored = await assertDb.QuestionAcceptedAnswers
            .AsNoTracking()
            .Where(answer => answer.QuestionId == questionId)
            .OrderBy(answer => answer.SortOrder)
            .ToArrayAsync();
        Assert.Equal(["London", "Paris", "Париж"], stored.Select(answer => answer.AnswerText).ToArray());
        Assert.True(stored[0].IsPrimary);
        Assert.Equal(new[] { 0, 1, 2 }, stored.Select(answer => answer.SortOrder).ToArray());
    }

    [Fact]
    public async Task UpdateQuestionAsync_CanShrinkAcceptedAnswersToASingleAnswer()
    {
        await _database.ResetAsync();
        Guid questionId;
        Guid categoryId;

        await using (var db = _database.CreateDbContext())
        {
            var repository = new DbGameQuestionRepository(db, TimeProvider.System);
            var category = await repository.CreateCategoryAsync("Geography");
            categoryId = category.Id;
            var created = await repository.CreateQuestionAsync(
                new CreateGameQuestionInput(
                    "q-shrink",
                    categoryId,
                    "Capital?",
                    "Paris",
                    ["Paris", "London", "Париж"],
                    1,
                    true,
                    0
                )
            );
            Assert.NotNull(created);
            questionId = created.QuestionId;
        }

        await using (var db = _database.CreateDbContext())
        {
            var repository = new DbGameQuestionRepository(db, TimeProvider.System);
            var updated = await repository.UpdateQuestionAsync(
                questionId,
                new UpdateGameQuestionInput(
                    categoryId,
                    "Capital?",
                    "Paris",
                    ["Paris"],
                    1,
                    true,
                    0
                )
            );

            Assert.NotNull(updated);
            Assert.Equal(["Paris"], updated.Answers);
        }
    }
}
