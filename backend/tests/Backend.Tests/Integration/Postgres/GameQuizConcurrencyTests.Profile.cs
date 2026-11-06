using System.Data.Common;
using backend.Application.Contracts;
using backend.Domain.Persistence;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class GameQuizConcurrencyTests
{
    [Fact]
    public async Task ProfileReadsOnlyOwnClosedAnswersWithFixedQueryCount()
    {
        var seed = await SeedAsync();
        await using var db = database.CreateDbContext();
        var profile = new DbUserProfileReader(db, new Clock(seed.Now));
        var initial = await profile.GetProfileAsync(seed.Second.Id);
        Assert.NotNull(initial);
        Assert.Equal(0, initial.PlayerGameCount);
        Assert.Equal(0, initial.QuizGameCount);
        Assert.Equal(0, initial.AnswerCount);
        Assert.Equal(0, initial.CorrectAnswerCount);
        Assert.Equal(0, initial.Statistics.FinishedPlayerGameCount);
        Assert.Equal(0, initial.Statistics.CompletedRoundCount);
        Assert.Equal(0, initial.Statistics.AwardedQuizPoints);
        Assert.Equal(0, initial.Statistics.Games.RankedGameCount);
        Assert.Null(initial.Statistics.Games.BestPlacement);
        Assert.Equal(12, initial.Statistics.Activity.Months.Count);
        foreach (var participation in new[] { UserProfileParticipation.Player, UserProfileParticipation.Quiz })
        {
            var emptyGames = await profile.GetGamesAsync(seed.Second.Id, participation, 99, 7);
            Assert.NotNull(emptyGames);
            Assert.Empty(emptyGames.Items);
            Assert.Equal(0, emptyGames.TotalCount);
            Assert.Equal(1, emptyGames.Page);
            Assert.Equal(7, emptyGames.PageSize);
        }
        var emptyAnswers = await profile.GetAnswersAsync(seed.Second.Id, null, 99, 7);
        Assert.NotNull(emptyAnswers);
        Assert.Empty(emptyAnswers.Items);
        Assert.Equal(0, emptyAnswers.TotalCount);
        Assert.Equal(1, emptyAnswers.Page);
        Assert.Equal(7, emptyAnswers.PageSize);
        var award = await Repository(db, seed.Now).AwardManualQuizPointsAsync(new(seed.Second.Id,
            GameQuizManualAdjustmentOperationValue.Award, 3, "Manual award alone", Guid.NewGuid()), seed.First.Id);
        Assert.NotNull(award.Award);
        Assert.Equal(0, (await profile.GetProfileAsync(seed.Second.Id))!.PlayerGameCount);
        Assert.Equal(0, (await profile.GetProfileAsync(seed.Second.Id))!.QuizGameCount);
        await Repository(db, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.WrongId, new WebGameQuizAnswerSource(seed.Second.Id)));
        await Repository(db, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
            new(seed.CorrectId, new WebGameQuizAnswerSource(seed.First.Id)));
        Assert.Empty((await profile.GetAnswersAsync(seed.Second.Id, null, 1, 20))!.Items);
        Assert.Equal(0, (await profile.GetProfileAsync(seed.Second.Id))!.AnswerCount);
        Assert.Equal(0, (await profile.GetProfileAsync(seed.Second.Id))!.QuizGameCount);
        await Repository(db, seed.Deadline).CloseExpiredQuizQuestionSessionsAsync();
        var persisted = await db.GameQuizQuestionSessions.AsNoTracking().SingleAsync();
        var categoryId = await db.QuestionDefinitions.Where(question => question.Id == persisted.QuestionId).Select(question => question.CategoryId).SingleAsync();
        Assert.NotNull(await new DbGameQuestionRepository(db, TimeProvider.System).UpdateQuestionAsync(persisted.QuestionId,
            new(categoryId, "Changed live catalog", [new("Changed correct", true), new("Changed incorrect", false)], 5, true, 0)));

        var commands = new ProfileReadCommands();
        await using var readDb = database.CreateDbContext(commands);
        var reader = new DbUserProfileReader(readDb, new Clock(seed.Now));
        var summary = await reader.GetProfileAsync(seed.Second.Id);
        Assert.NotNull(summary);
        Assert.Equal(0, summary.PlayerGameCount);
        Assert.Equal(1, summary.QuizGameCount);
        Assert.Equal(1, summary.AnswerCount);
        Assert.Equal(0, summary.CorrectAnswerCount);
        Assert.Equal(0, summary.Statistics.FinishedPlayerGameCount);
        Assert.Equal(0, summary.Statistics.CompletedRoundCount);
        Assert.Equal(0, summary.Statistics.AwardedQuizPoints);
        Assert.Equal(1, summary.Statistics.Quiz.IncorrectAnswerCount);
        Assert.Equal(3, summary.Statistics.Points.ManualAwarded);
        Assert.Equal(7, commands.Sql.Count);
        Assert.Contains("count(", commands.Sql[0], StringComparison.OrdinalIgnoreCase);
        Assert.Contains("sum(", commands.Sql[0], StringComparison.OrdinalIgnoreCase);
        Assert.Contains("GROUP BY", commands.Sql[5], StringComparison.OrdinalIgnoreCase);
        commands.Sql.Clear();
        var answers = await reader.GetAnswersAsync(seed.Second.Id, persisted.GameId, 1, 1);
        Assert.NotNull(answers);
        var answer = Assert.Single(answers.Items);
        Assert.Equal(1, answers.TotalCount);
        Assert.Equal("Choose", answer.QuestionText);
        Assert.Equal("Wrong", answer.SelectedOptionText);
        Assert.False(answer.IsCorrect);
        Assert.Equal(0, answer.AwardedPoints);
        Assert.Equal(seed.WrongId, answer.SelectedOptionId);
        Assert.Equal(3, commands.Sql.Count);
        Assert.Contains("LIMIT", commands.Sql[2], StringComparison.OrdinalIgnoreCase);
        Assert.Equal(1, (await reader.GetAnswersAsync(seed.Second.Id, null, 99, 1))!.Page);
        Assert.Empty((await reader.GetAnswersAsync(seed.Second.Id, Guid.NewGuid(), 1, 1))!.Items);
        commands.Sql.Clear();
        var games = await reader.GetGamesAsync(seed.Second.Id, UserProfileParticipation.Quiz, 1, 1);
        Assert.NotNull(games);
        Assert.Equal(1, games.TotalCount);
        Assert.Equal(1, Assert.Single(games.Items).AnswerCount);
        Assert.Equal(3, commands.Sql.Count);
        Assert.Contains("LIMIT", commands.Sql[2], StringComparison.OrdinalIgnoreCase);
        var playerGames = await reader.GetGamesAsync(seed.Second.Id, UserProfileParticipation.Player, 99, 1);
        Assert.NotNull(playerGames);
        Assert.Equal(0, playerGames.TotalCount);
        Assert.Equal(1, playerGames.Page);
        Assert.Empty(playerGames.Items);
        var playerSummary = await reader.GetProfileAsync(seed.First.Id);
        Assert.NotNull(playerSummary);
        Assert.Equal(1, playerSummary.PlayerGameCount);
        Assert.Equal(1, playerSummary.QuizGameCount);
        Assert.Equal(5, playerSummary.Statistics.AwardedQuizPoints);
        Assert.Equal(0, playerSummary.Statistics.FinishedPlayerGameCount);
        Assert.Equal(persisted.GameId, Assert.Single((await reader.GetGamesAsync(seed.First.Id, UserProfileParticipation.Player, 1, 1))!.Items).GameId);
        Assert.Equal(persisted.GameId, Assert.Single((await reader.GetGamesAsync(seed.First.Id, UserProfileParticipation.Quiz, 1, 1))!.Items).GameId);

        var lifecycle = Lifecycle(db, seed.Deadline.AddSeconds(1));
        var finish = await lifecycle.FinishGameAsync(persisted.GameId,
            await FinishInputAsync(lifecycle, persisted.GameId), seed.First.Id);
        Assert.True(finish.Success);
        Assert.True((await lifecycle.ArchiveGameAsync(persisted.GameId)).Success);
        var archivedSummary = await reader.GetProfileAsync(seed.Second.Id);
        Assert.NotNull(archivedSummary);
        Assert.Equal(0, archivedSummary.AnswerCount);
        Assert.Equal(0, archivedSummary.Statistics.AwardedQuizPoints);
        Assert.Empty(archivedSummary.Statistics.Quiz.Categories);
        Assert.Equal(0, archivedSummary.Statistics.Points.ManualAwarded);
        Assert.Empty((await reader.GetGamesAsync(seed.Second.Id, UserProfileParticipation.Quiz, 1, 20))!.Items);
        Assert.Empty((await reader.GetAnswersAsync(seed.Second.Id, null, 1, 20))!.Items);
    }

    [Fact]
    public async Task ProfileStatisticsStayConsistentWhenAQuestionClosesDuringTheRead()
    {
        var seed = await SeedAsync();
        await using (var submitDb = database.CreateDbContext())
            await Repository(submitDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
                new(seed.CorrectId, new WebGameQuizAnswerSource(seed.Second.Id)));
        var gate = new ProfileReadMutation(async () =>
        {
            await using var closeDb = database.CreateDbContext();
            await Repository(closeDb, seed.Deadline).CloseExpiredQuizQuestionSessionsAsync();
        });
        await using var readDb = database.CreateDbContext(gate);
        var reader = new DbUserProfileReader(readDb, new Clock(seed.Now));
        var profile = await reader.GetProfileAsync(seed.Second.Id);
        Assert.NotNull(profile);
        Assert.Equal(0, profile.AnswerCount);
        Assert.Equal(0, profile.Statistics.Quiz.AnswerCount);
        Assert.Equal(0, profile.Statistics.AwardedQuizPoints);
        var refreshed = await reader.GetProfileAsync(seed.Second.Id);
        Assert.NotNull(refreshed);
        Assert.Equal(1, refreshed.AnswerCount);
        Assert.Equal(1, refreshed.Statistics.Quiz.AnswerCount);
        Assert.Equal(5, refreshed.Statistics.AwardedQuizPoints);
    }

    [Theory]
    [InlineData("answers")]
    [InlineData("quiz")]
    public async Task ProfilePageStaysConsistentWhenAQuestionClosesAfterTheCount(string kind)
    {
        var seed = await SeedAsync();
        await using (var submitDb = database.CreateDbContext())
            await Repository(submitDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
                new(seed.CorrectId, new WebGameQuizAnswerSource(seed.Second.Id)));
        var gate = new ProfileReadMutation(async () =>
        {
            await using var closeDb = database.CreateDbContext();
            Assert.Equal(1, (await Repository(closeDb, seed.Deadline).CloseExpiredQuizQuestionSessionsAsync()).ClosedQuizQuestionCount);
        }, afterRead: 2);
        await using var readDb = database.CreateDbContext(gate);
        var reader = new DbUserProfileReader(readDb, new Clock(seed.Now));

        Assert.Equal((0, 1, 0), await ReadSingleItemProfilePageAsync(reader, seed.Second.Id, kind));
        Assert.Equal((1, 1, 1), await ReadSingleItemProfilePageAsync(reader, seed.Second.Id, kind));
    }

    [Theory]
    [InlineData("answers")]
    [InlineData("quiz")]
    [InlineData("player")]
    public async Task ProfilePageStaysConsistentWhenItsGameIsArchivedAfterTheCount(string kind)
    {
        var seed = await SeedAsync();
        Guid gameId;
        await using (var prepareDb = database.CreateDbContext())
        {
            await Repository(prepareDb, seed.Now).SubmitQuizAnswerAsync(seed.SessionId,
                new(seed.CorrectId, new WebGameQuizAnswerSource(seed.First.Id)));
            await Repository(prepareDb, seed.Deadline).CloseExpiredQuizQuestionSessionsAsync();
            gameId = await prepareDb.GameQuizQuestionSessions.Where(session => session.Id == seed.SessionId)
                .Select(session => session.GameId).SingleAsync();
            var lifecycle = Lifecycle(prepareDb, seed.Deadline.AddSeconds(1));
            var finished = await lifecycle.FinishGameAsync(gameId,
                await FinishInputAsync(lifecycle, gameId), seed.First.Id);
            Assert.True(finished.Success);
        }
        var gate = new ProfileReadMutation(async () =>
        {
            await using var archiveDb = database.CreateDbContext();
            Assert.True((await Lifecycle(archiveDb, seed.Deadline.AddSeconds(2)).ArchiveGameAsync(gameId)).Success);
        }, afterRead: 2);
        await using var readDb = database.CreateDbContext(gate);
        var reader = new DbUserProfileReader(readDb, new Clock(seed.Now));

        Assert.Equal((1, 1, 1), await ReadSingleItemProfilePageAsync(reader, seed.First.Id, kind));
        Assert.Equal((0, 1, 0), await ReadSingleItemProfilePageAsync(reader, seed.First.Id, kind));
    }

    private static async Task<(int Total, int Page, int Count)> ReadSingleItemProfilePageAsync(
        DbUserProfileReader reader, Guid userId, string kind)
    {
        if (kind == "answers")
        {
            var page = await reader.GetAnswersAsync(userId, null, 99, 1);
            Assert.NotNull(page);
            return (page.TotalCount, page.Page, page.Items.Count);
        }
        var games = await reader.GetGamesAsync(userId,
            kind == "player" ? UserProfileParticipation.Player : UserProfileParticipation.Quiz, 99, 1);
        Assert.NotNull(games);
        return (games.TotalCount, games.Page, games.Items.Count);
    }

    private sealed class ProfileReadMutation(Func<Task> mutate, int afterRead = 1) : DbCommandInterceptor
    {
        private int reads;
        public override async ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command,
            CommandExecutedEventData eventData, DbDataReader result, CancellationToken cancellationToken = default)
        {
            if (++reads == afterRead) await mutate();
            return result;
        }
    }

    private sealed class ProfileReadCommands : DbCommandInterceptor
    {
        public List<string> Sql { get; } = [];
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command,
            CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            Sql.Add(command.CommandText);
            return ValueTask.FromResult(result);
        }
    }
}
