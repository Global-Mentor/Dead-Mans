using backend.Data;
using backend.Data.Entities;
using backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Unit.Infrastructure.Persistence;

public sealed class QuizQuestionPreparationTests
{
    [Fact]
    public void PreparationKeepsOptionIdentityAndCopiesThePublishedSnapshot()
    {
        var question = Question(Guid.NewGuid(), 0);
        var snapshot = QuizQuestionPreparation.Prepare(question);
        Assert.Equal(question.QuestionId, snapshot.QuestionId);
        Assert.Equal(question.CorrectOptionIdSnapshot, snapshot.CorrectOptionIdSnapshot);
        Assert.Equal(question.ImageSnapshotJson, snapshot.ImageSnapshotJson);
        Assert.NotSame(question.OptionIdsSnapshot, snapshot.OptionIdsSnapshot);
        foreach (var pair in snapshot.OptionIdsSnapshot.Zip(snapshot.OptionTextsSnapshot))
            Assert.Equal(question.OptionTextsSnapshot[Array.IndexOf(question.OptionIdsSnapshot, pair.First)], pair.Second);
        question.OptionTextsSnapshot[0] = "Changed catalog";
        Assert.DoesNotContain("Changed catalog", snapshot.OptionTextsSnapshot);
    }

    [Fact]
    public void PreparationRejectsCorruptImmutableOptions()
    {
        var question = Question(Guid.NewGuid(), 0);
        question.OptionTextsSnapshot = ["only one"];
        Assert.Throws<InvalidOperationException>(() => QuizQuestionPreparation.Prepare(question));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task LocationSpacingIsOptionalAndPrefersAnotherLocation(bool enabled)
    {
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var gameId = Guid.NewGuid();
        var previousLocation = Guid.NewGuid();
        var previousQuestionId = Guid.NewGuid();
        db.GameQuizQuestionSessions.Add(new GameQuizQuestionSession
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            QuestionId = previousQuestionId,
            AskOrder = 1,
            ImageSnapshotJson = "{}",
            CorrectOptionIdSnapshot = previousLocation
        });
        await db.SaveChangesAsync();
        var repeated = Question(Guid.NewGuid(), 100);
        var alternative = Question(Guid.NewGuid(), 0);
        db.AddRange(new QuestionScreenshot { QuestionId = previousQuestionId, LocationId = previousLocation },
            new QuestionScreenshot { QuestionId = repeated.QuestionId, LocationId = previousLocation },
            new QuestionScreenshot { QuestionId = alternative.QuestionId, LocationId = Guid.NewGuid() });
        await db.SaveChangesAsync();
        var selected = await QuizQuestionPreparation.SelectAsync(db, gameId, [repeated, alternative], enabled, default);
        Assert.Equal(enabled ? alternative.QuestionId : repeated.QuestionId, selected.QuestionId);
        Assert.Equal(repeated.QuestionId, (await QuizQuestionPreparation.SelectAsync(db, gameId, [repeated], true, default)).QuestionId);
        db.GameQuizQuestionSessions.Add(new GameQuizQuestionSession
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            QuestionId = Guid.NewGuid(),
            AskOrder = 2,
            ImageSnapshotJson = "{}",
            CorrectOptionIdSnapshot = Guid.NewGuid()
        });
        await db.SaveChangesAsync();
        Assert.Equal(repeated.QuestionId, (await QuizQuestionPreparation.SelectAsync(db, gameId,
            [repeated, alternative], true, default)).QuestionId);
    }

    private static GameEnabledQuestion Question(Guid location, int priority) => new()
    {
        QuestionId = Guid.NewGuid(),
        QuestionRevisionSnapshot = 2,
        QuestionCodeSnapshot = "shot",
        CategoryNameSnapshot = "Locations",
        QuestionTextSnapshot = "Where?",
        ImageSnapshotJson = "{}",
        OptionIdsSnapshot = [location, Guid.NewGuid()],
        OptionTextsSnapshot = ["Correct", "Other"],
        CorrectOptionIdSnapshot = location,
        PrioritySnapshot = priority,
        RewardSnapshot = 5
    };
}
