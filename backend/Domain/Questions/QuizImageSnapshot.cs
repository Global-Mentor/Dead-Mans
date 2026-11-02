using System.Text.Json;

namespace backend.Domain.Questions;

// Option identifiers are shared with the question; no correct-answer information belongs here.
public sealed record QuizImageSnapshot(
    Guid MediaAssetId,
    string MediaPath,
    IReadOnlyDictionary<string, string> MapNames,
    IReadOnlyDictionary<Guid, IReadOnlyDictionary<string, string>> OptionNames)
{
    public string ToJson() => JsonSerializer.Serialize(this);

    public static QuizImageSnapshot? FromJson(string? json) => json is null ? null
        : JsonSerializer.Deserialize<QuizImageSnapshot>(json)
            ?? throw new InvalidOperationException("Invalid quiz image snapshot.");
}
