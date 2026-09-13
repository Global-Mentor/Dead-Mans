using System.Text.RegularExpressions;

namespace backend.Domain.Persistence;

public static partial class TeamNameValue
{
    public const int MinLength = 3;
    public const int MaxLength = 18;

    public static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = WhitespaceRegex().Replace(value.Trim(), " ");
        return normalized.Length == 0 ? null : normalized;
    }

    public static bool IsValid(string? value)
    {
        var normalized = Normalize(value);
        return normalized is null || normalized.Length is >= MinLength and <= MaxLength;
    }

    public static string? UniquenessKey(string? value) =>
        Normalize(value) is { } name ? WhitespaceRegex().Replace(name, "").ToUpperInvariant() : null;

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();
}
