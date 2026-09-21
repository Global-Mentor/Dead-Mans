using backend.Application.Contracts;
using backend.Domain.Persistence;

namespace backend.Application.Features.GameQuestions;

internal static class GameQuestionValidator
{
    public const int MinOptions = 2;
    public const int MaxOptions = 10;
    public const int MaxExternalCodeLength = 64;
    public const int MaxCategoryLength = 64;
    public const int MaxTextLength = 2000;
    public const int MaxOptionLength = 500;

    public static bool TryNormalizeCreate(
        CreateGameQuestionInput input,
        out CreateGameQuestionInput normalized
    )
    {
        normalized = input;
        var text = TwitchQuizMessageFormatter.Normalize(input.Text ?? string.Empty);
        var externalCode = (input.ExternalCode ?? string.Empty).Trim();
        if (!TryNormalizeOptions(input.Options, out var options)
            || input.CategoryId == Guid.Empty
            || text.Length is 0 or > MaxTextLength
            || input.Reward < 0
            || externalCode.Length > MaxExternalCodeLength
            || !TwitchQuizMessageFormatter.FormatForValidation(
                text, options.Select(x => x.Text).ToArray(), 3600, input.Reward).IsCompatible)
        {
            return false;
        }

        normalized = input with
        {
            ExternalCode = externalCode.Length == 0 ? null : externalCode,
            Text = text,
            Options = options
        };
        return true;
    }

    public static bool TryNormalizeUpdate(
        UpdateGameQuestionInput input,
        out UpdateGameQuestionInput normalized
    )
    {
        normalized = input;
        var text = TwitchQuizMessageFormatter.Normalize(input.Text ?? string.Empty);
        if (!TryNormalizeOptions(input.Options, out var options)
            || input.CategoryId == Guid.Empty
            || text.Length is 0 or > MaxTextLength
            || input.Reward < 0
            || !TwitchQuizMessageFormatter.FormatForValidation(
                text, options.Select(x => x.Text).ToArray(), 3600, input.Reward).IsCompatible)
        {
            return false;
        }

        normalized = input with { Text = text, Options = options };
        return true;
    }

    private static bool TryNormalizeOptions(
        IReadOnlyList<GameQuestionOptionInput>? options,
        out IReadOnlyList<GameQuestionOptionInput> normalizedOptions
    )
    {
        normalizedOptions = Array.Empty<GameQuestionOptionInput>();
        if (options is null || options.Count is < MinOptions or > MaxOptions)
        {
            return false;
        }

        var result = new List<GameQuestionOptionInput>(options.Count);
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var correctCount = 0;
        foreach (var option in options)
        {
            if (option is null)
            {
                return false;
            }
            var text = TwitchQuizMessageFormatter.Normalize(option.Text ?? string.Empty);
            if (text.Length is 0 or > MaxOptionLength)
            {
                return false;
            }

            if (!seen.Add(QuestionAnswerNormalizer.Normalize(text)))
            {
                return false;
            }

            if (option.IsCorrect)
            {
                correctCount++;
            }
            result.Add(new GameQuestionOptionInput(text, option.IsCorrect));
        }

        if (correctCount != 1)
        {
            return false;
        }

        normalizedOptions = result;
        return true;
    }
}
