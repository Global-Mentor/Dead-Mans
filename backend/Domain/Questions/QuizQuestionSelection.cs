namespace backend.Domain.Questions;

public static class QuizQuestionSelection
{
    public static T Select<T>(IReadOnlyList<T> candidates, Func<T, int> usage, Func<T, int> priority)
    {
        ArgumentOutOfRangeException.ThrowIfZero(candidates.Count);
        var minimumUsage = candidates.Min(usage);
        var leastUsed = candidates.Where(candidate => usage(candidate) == minimumUsage).ToArray();
        var maximumPriority = leastUsed.Max(priority);
        var preferred = leastUsed.Where(candidate => priority(candidate) == maximumPriority).ToArray();
        return preferred[Random.Shared.Next(preferred.Length)];
    }
}
