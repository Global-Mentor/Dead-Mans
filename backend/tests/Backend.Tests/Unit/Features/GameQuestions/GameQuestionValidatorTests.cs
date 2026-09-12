using backend.Application.Contracts;
using backend.Application.Features.GameQuestions;
using backend.Domain.Persistence;

namespace Backend.Tests.Unit.Features.GameQuestions;

public sealed class GameQuestionValidatorTests
{
    [Theory]
    [InlineData("\u0085Paris\u0085", "paris")]
    [InlineData("Paris\u0085France", "paris france")]
    [InlineData("\uFEFFParis\uFEFF", "\uFEFFparis\uFEFF")]
    [InlineData("ΟΣ", "οσ")]
    [InlineData("İ", "İ")]
    public void AnswerNormalization_PreservesTheExistingUnicodeContract(string input, string expected)
    {
        Assert.Equal(expected, QuestionAnswerNormalizer.Normalize(input));
    }

    [Fact]
    public void TryNormalizeCreate_RejectsOversizedDuplicatesBeforeNormalization()
    {
        var input = CreateInput("fallback", ["a b", "a" + new string(' ', 500) + "b"]);
        Assert.False(GameQuestionValidator.TryNormalizeCreate(input, out _));
    }

    [Fact]
    public void TryNormalizeCreate_RejectsOversizedRawAnswerArrayEvenIfAllItemsAreDuplicates()
    {
        var input = CreateInput("fallback", Enumerable.Repeat("Paris", 11).ToArray());
        Assert.False(GameQuestionValidator.TryNormalizeCreate(input, out _));
    }

    [Fact]
    public void TryNormalizeCreate_RejectsMissingAnswersAndAcceptsNullImportItems()
    {
        Assert.False(GameQuestionValidator.TryNormalizeCreate(CreateInput("", ["", null!]), out _));
        Assert.True(GameQuestionValidator.TryNormalizeCreate(CreateInput("", [null!, "Paris"]), out var normalized));
        Assert.Equal(["Paris"], normalized.Answers);
    }
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
    public void TryNormalizeCreate_UsesAnswersWhenPresentAndKeepsTheFirstAsLegacyAnswer()
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
