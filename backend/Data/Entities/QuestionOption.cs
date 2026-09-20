namespace backend.Data.Entities;

public sealed class QuestionOption
{
    public Guid Id { get; set; }

    public Guid QuestionId { get; set; }

    public string Text { get; set; } = string.Empty;

    public string NormalizedText { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }

    public int SortOrder { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public QuestionDefinition Question { get; set; } = default!;
}
