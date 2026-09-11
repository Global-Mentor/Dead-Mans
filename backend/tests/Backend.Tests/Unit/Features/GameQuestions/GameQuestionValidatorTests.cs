using backend.Application.Contracts;
using backend.Application.Features.GameQuestions;

namespace Backend.Tests.Unit.Features.GameQuestions;

public sealed class GameQuestionValidatorTests
{
    [Fact]
    public void TryNormalizeCreate_UsesAnswerWhenAnswersAreBlank()
    {
        var input = CreateInput(answer: "Paris", answers: ["", "  "]);

        var accepted = GameQuestionValidator.TryNormalizeCreate(input, out var normalized);

        Assert.True(accepted);
        Assert.Equal("Paris", normalized.Answer);
        Assert.Equal(["Paris"], normalized.Answers);
    }

    [Fact]
    public void TryNormalizeCreate_UsesAnswersWhenPresentAndKeepsPrimaryFirst()
    {
        var input = CreateInput(answer: "Paris", answers: ["  Париж ", "Paris"]);

        var accepted = GameQuestionValidator.TryNormalizeCreate(input, out var normalized);

        Assert.True(accepted);
        Assert.Equal("Париж", normalized.Answer);
        Assert.Equal(["Париж", "Paris"], normalized.Answers);
    }

    [Fact]
    public void TryNormalizeCreate_DeduplicatesByNormalizedForm()
    {
        var input = CreateInput(answer: "Paris", answers: ["Paris", "  paris  ", "PARIS"]);

        var accepted = GameQuestionValidator.TryNormalizeCreate(input, out var normalized);

        Assert.True(accepted);
        Assert.Equal(["Paris"], normalized.Answers);
    }

    [Fact]
    public void TryNormalizeCreate_RejectsMoreThanTenAnswers()
    {
        var answers = Enumerable.Range(1, 11).Select(index => $"Answer {index}").ToArray();
        var input = CreateInput(answer: answers[0], answers: answers);

        var accepted = GameQuestionValidator.TryNormalizeCreate(input, out _);

        Assert.False(accepted);
    }

    [Fact]
    public void TryNormalizeUpdate_FallsBackToAnswerWhenAnswersNormalizeEmpty()
    {
        var input = new UpdateGameQuestionInput(
            Guid.NewGuid(),
            "Capital?",
            "Warsaw",
            [""],
            5,
            true,
            0
        );

        var accepted = GameQuestionValidator.TryNormalizeUpdate(input, out var normalized);

        Assert.True(accepted);
        Assert.Equal("Warsaw", normalized.Answer);
        Assert.Equal(["Warsaw"], normalized.Answers);
    }

    private static CreateGameQuestionInput CreateInput(
        string answer,
        IReadOnlyList<string> answers
    )
    {
        return new CreateGameQuestionInput(
            null,
            Guid.NewGuid(),
            "What is the capital?",
            answer,
            answers,
            1,
            true,
            0
        );
    }
}
