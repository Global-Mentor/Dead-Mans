using backend.Application.Contracts;
using backend.Domain.Persistence;

namespace backend.Application.Features.GameQuestions;

internal static class GameQuestionValidator
{
    private const int MaxAnswers = 10;
    public const int MaxExternalCodeLength = 64;
    public const int MaxCategoryLength = 64;
    public const int MaxTextLength = 2000;
    public const int MaxAnswerLength = 500;

    public static bool TryNormalizeCreate(
        CreateGameQuestionInput input,
        out CreateGameQuestionInput normalized
    )
    {
        normalized = input;

        var text = (input.Text ?? string.Empty).Trim();
        if (!TryNormalizeAnswers(input.Answer, input.Answers, out var answer, out var answers))
        {
            return false;
        }

        var externalCode = (input.ExternalCode ?? string.Empty).Trim();

        if (input.CategoryId == Guid.Empty
            || !IsSharedValid(text, input.Reward)
            || externalCode.Length > MaxExternalCodeLength)
        {
            return false;
        }

        normalized = new CreateGameQuestionInput(
            externalCode.Length == 0 ? null : externalCode,
            input.CategoryId,
            text,
            answer,
            answers,
            input.Reward,
            input.IsEnabled,
            input.Priority
        );
        return true;
    }

    public static bool TryNormalizeUpdate(
        UpdateGameQuestionInput input,
        out UpdateGameQuestionInput normalized
    )
    {
        normalized = input;

        var text = (input.Text ?? string.Empty).Trim();
        if (!TryNormalizeAnswers(input.Answer, input.Answers, out var answer, out var answers))
        {
            return false;
        }

        if (input.CategoryId == Guid.Empty
            || !IsSharedValid(text, input.Reward))
        {
            return false;
        }

        normalized = new UpdateGameQuestionInput(
            input.CategoryId,
            text,
            answer,
            answers,
            input.Reward,
            input.IsEnabled,
            input.Priority
        );
        return true;
    }

    private static bool IsSharedValid(string text, int reward)
    {
        return text.Length is > 0 and <= MaxTextLength
            && reward >= 0;
    }

    private static bool TryNormalizeAnswers(
        string? answer,
        IReadOnlyList<string>? answers,
        out string firstAnswer,
        out IReadOnlyList<string> normalizedAnswers
    )
    {
        firstAnswer = string.Empty;
        normalizedAnswers = Array.Empty<string>();
        // Bound the raw payload before allocating normalized strings or deduplicating.
        // Otherwise oversized duplicates can bypass the per-answer length limit.
        if (answers is { Count: > MaxAnswers })
        {
            return false;
        }

        var result = new List<string>();
        var normalizedSet = new HashSet<string>(StringComparer.Ordinal);
        foreach (var item in answers ?? Array.Empty<string>())
        {
            var trimmed = (item ?? string.Empty).Trim();
            if (trimmed.Length > MaxAnswerLength)
            {
                return false;
            }
            if (trimmed.Length == 0)
            {
                continue;
            }

            var normalized = QuestionAnswerNormalizer.Normalize(trimmed);
            if (!normalizedSet.Add(normalized))
            {
                continue;
            }

            result.Add(trimmed);
        }

        if (result.Count == 0)
        {
            var fallback = (answer ?? string.Empty).Trim();
            if (fallback.Length is 0 or > MaxAnswerLength)
            {
                return false;
            }
            result.Add(fallback);
        }

        firstAnswer = result[0];
        normalizedAnswers = result;
        return true;
    }
}
