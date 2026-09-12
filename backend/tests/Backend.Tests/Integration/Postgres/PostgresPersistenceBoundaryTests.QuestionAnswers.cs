using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests.Integration.Postgres;

public sealed partial class PostgresPersistenceBoundaryTests
{
    [Fact]
    public async Task Quiz_UsesEveryPublishedAnswerAfterTheCatalogIsEdited()
    {
        await _database.ResetAsync();
        Guid questionId = default;
        Guid categoryId = default;
        await using var db = _database.CreateDbContext();
        var seeded = await SeedPlayableRoundGraphAsync(db, async (draftDb, now, gameId, _) =>
        {
            var catalog = new DbGameQuestionRepository(draftDb, TimeProvider.System);
            var category = await catalog.CreateCategoryAsync("Snapshot answers");
            categoryId = category.Id;
            var question = await catalog.CreateQuestionAsync(new CreateGameQuestionInput(
                "q-snapshot", categoryId, "Capital?", "Paris", ["Paris", "Париж"], 5, true, 0));
            Assert.NotNull(question);
            questionId = question.QuestionId;
            draftDb.GameEnabledQuestions.Add(new GameEnabledQuestion
            {
                GameId = gameId,
                QuestionId = questionId,
                EnabledAtUtc = now,
                QuestionRevisionSnapshot = 1,
                QuestionCodeSnapshot = question.QuestionCode,
                CategoryNameSnapshot = category.Name,
                QuestionTextSnapshot = "Old draft text",
                AcceptedAnswersSnapshot = ["Old draft answer"],
                NormalizedAnswersSnapshot = ["old draft answer"],
                RewardSnapshot = 1,
                PrioritySnapshot = 0,
                SnapshotAtUtc = now
            });
            await draftDb.SaveChangesAsync();
            var lifecycle = new DbGameLifecyclePersistence(draftDb,
                NullLogger<DbGameLifecyclePersistence>.Instance, new QuestionPublicationTimeProvider(now));
            Assert.True((await lifecycle.OpenRegistrationAsync(gameId)).Success);
        });

        await using (var editDb = _database.CreateDbContext())
        {
            var catalog = new DbGameQuestionRepository(editDb, TimeProvider.System);
            Assert.NotNull(await catalog.UpdateQuestionAsync(questionId, new UpdateGameQuestionInput(
                categoryId, "Changed capital?", "London", ["London", "Londres"], 99, true, 0)));
            var foundByAlternative = await catalog.GetCatalogAsync(null, "Londres", true);
            Assert.Equal(questionId, Assert.Single(foundByAlternative).QuestionId);
        }

        await using var quizDb = _database.CreateDbContext();
        var quiz = new DbGameQuizRepository(quizDb, TimeProvider.System);
        var asked = await quiz.AskNextQuizQuestionAsync(seeded.GameId, new ManualGameQuizQuestionDelivery(seeded.UserId));
        Assert.NotNull(asked);
        Assert.Equal("Capital?", asked.Text);
        Assert.Equal(5, asked.Reward);
        var round = await quizDb.GameQuizRounds.SingleAsync();
        Assert.Equal(["Paris", "Париж"], round.AcceptedAnswersSnapshot);
        Assert.Equal(["paris", "париж"], round.NormalizedAnswersSnapshot);
        Assert.Equal(1, round.QuestionRevisionSnapshot);

        var source = new ManualGameQuizAnswerSource(seeded.UserId, seeded.UserId, "Host");
        var rejected = await quiz.AnswerQuizRoundAsync(asked.RoundId, new SubmitGameQuizAnswerInput("London", source));
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Incorrect, rejected.Outcome);
        var accepted = await quiz.AnswerQuizRoundAsync(asked.RoundId, new SubmitGameQuizAnswerInput("  ПАРИЖ  ", source));
        Assert.Equal(SubmitQuizAnswerRepositoryOutcome.Correct, accepted.Outcome);
        Assert.Equal(5, (await quizDb.GameQuizPointLedgerEntries.SingleAsync()).PointsDelta);
    }

    private sealed class QuestionPublicationTimeProvider(DateTime now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(now, TimeSpan.Zero);
    }
}
