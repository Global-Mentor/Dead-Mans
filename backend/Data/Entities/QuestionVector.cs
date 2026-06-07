namespace backend.Data.Entities;

public class QuestionVector
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool IsEnabled { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; }

    public DateTime UpdatedAtUtc { get; set; }

    public ICollection<QuestionDefinition> Questions { get; set; } = new List<QuestionDefinition>();
}
