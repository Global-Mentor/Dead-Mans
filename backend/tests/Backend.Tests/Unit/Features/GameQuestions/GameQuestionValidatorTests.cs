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
    public void OptionNormalization_PreservesTheExistingUnicodeContract(string input, string expected)
    {
        Assert.Equal(expected, QuestionAnswerNormalizer.Normalize(input));
    }

    [Theory]
    [MemberData(nameof(InvalidOptions))]
    public void TryNormalizeCreate_RejectsInvalidOptionSets(IReadOnlyList<GameQuestionOptionInput> options)
    {
        Assert.False(GameQuestionValidator.TryNormalizeCreate(CreateInput(options), out _));
    }

    [Fact]
    public void TryNormalizeCreate_TrimsAndPreservesOneCorrectOption()
    {
        var accepted = GameQuestionValidator.TryNormalizeCreate(
            CreateInput([new("  Paris ", true), new(" London ", false)]),
            out var normalized);

        Assert.True(accepted);
        Assert.Equal(["Paris", "London"], normalized.Options.Select(x => x.Text));
        Assert.Single(normalized.Options, x => x.IsCorrect);
    }

    public static TheoryData<IReadOnlyList<GameQuestionOptionInput>> InvalidOptions => new()
    {
        Array.Empty<GameQuestionOptionInput>(),
        new[] { new GameQuestionOptionInput("one", true), null!, new GameQuestionOptionInput("two", false) },
        new[] { new GameQuestionOptionInput("only", true) },
        Enumerable.Range(0, 11).Select(index => new GameQuestionOptionInput($"o{index}", index == 0)).ToArray(),
        new[] { new GameQuestionOptionInput("", true), new GameQuestionOptionInput("valid", false) },
        new[] { new GameQuestionOptionInput("Paris", true), new GameQuestionOptionInput(" paris ", false) },
        new[] { new GameQuestionOptionInput("one", false), new GameQuestionOptionInput("two", false) },
        new[] { new GameQuestionOptionInput("one", true), new GameQuestionOptionInput("two", true) }
    };

    private static CreateGameQuestionInput CreateInput(IReadOnlyList<GameQuestionOptionInput> options) =>
        new(null, Guid.NewGuid(), "What is the capital?", options, 1, true, 0);
}
