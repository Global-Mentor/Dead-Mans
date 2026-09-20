namespace backend.Data.Entities;

public class QuestionDefinition
{
    public Guid Id { get; set; }

    public string ExternalCode { get; set; } = string.Empty;

    public Guid CategoryId { get; set; }

    public string Text { get; set; } = string.Empty;

    public int Reward { get; set; }

    public int Revision { get; set; } = 1;

    public bool IsEnabled { get; set; } = true;

    public bool IsDeleted { get; set; }

    public DateTime? DeletedAtUtc { get; set; }

    public int Priority { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime UpdatedAtUtc { get; set; }

    public QuestionCategory? CategoryDefinition { get; set; }

    public ICollection<GameQuizQuestionSession> AskedInQuizQuestionSessions { get; set; } = new List<GameQuizQuestionSession>();

    public ICollection<GameEnabledQuestion> EnabledInGames { get; set; } =
        new List<GameEnabledQuestion>();

    public ICollection<QuestionOption> Options { get; set; } = new List<QuestionOption>();

}
