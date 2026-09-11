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
            || !IsSharedValid(text, answers, input.Reward)
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
            || !IsSharedValid(text, answers, input.Reward))
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

    private static bool IsSharedValid(string text, IReadOnlyList<string> answers, int reward)
    {
        return text.Length is > 0 and <= MaxTextLength
            && answers.Count is > 0 and <= MaxAnswers
            && answers.All(item => item.Length is > 0 and <= MaxAnswerLength)
            && reward >= 0;
    }

    private static bool TryNormalizeAnswers(
        string? answer,
        IReadOnlyList<string>? answers,
        out string primaryAnswer,
        out IReadOnlyList<string> normalizedAnswers
    )
    {
        var normalizedList = NormalizeAnswers(answer, answers);
        primaryAnswer = normalizedList.Count > 0 ? normalizedList[0] : string.Empty;
        normalizedAnswers = normalizedList;
        return normalizedList.Count > 0
            && normalizedList.Count <= MaxAnswers
            && normalizedList.All(item => item.Length is > 0 and <= MaxAnswerLength);
    }

    private static List<string> NormalizeAnswers(string? answer, IReadOnlyList<string>? answers)
    {
        var fromAnswers = CollectUniqueAnswers(answers ?? Array.Empty<string>());
        if (fromAnswers.Count > 0)
        {
            return fromAnswers;
        }

        return CollectUniqueAnswers(
            string.IsNullOrWhiteSpace(answer) ? Array.Empty<string>() : [answer]
        );
    }

    private static List<string> CollectUniqueAnswers(IEnumerable<string?> items)
    {
        var result = new List<string>();
        var normalizedSet = new HashSet<string>(StringComparer.Ordinal);
        foreach (var item in items)
        {
            var trimmed = (item ?? string.Empty).Trim();
            if (trimmed.Length == 0)
            {
                continue;
            }

            var normalized = QuestionAnswerNormalizer.Normalize(trimmed);
            if (normalized.Length == 0 || !normalizedSet.Add(normalized))
            {
                continue;
            }

            result.Add(trimmed);
        }

        return result;
    }
}
