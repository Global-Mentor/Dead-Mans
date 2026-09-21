namespace backend.Data.Entities;

public sealed class TwitchQuizPublication
{
    public Guid Id { get; set; }
    public Guid GameId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid? QuestionSessionId { get; set; }
    public int AskOrder { get; set; }
    public int DurationSeconds { get; set; }
    public int QuestionRevisionSnapshot { get; set; }
    public string QuestionCodeSnapshot { get; set; } = string.Empty;
    public string CategoryNameSnapshot { get; set; } = string.Empty;
    public string QuestionTextSnapshot { get; set; } = string.Empty;
    public Guid[] OptionIdsSnapshot { get; set; } = Array.Empty<Guid>();
    public string[] OptionTextsSnapshot { get; set; } = Array.Empty<string>();
    public Guid CorrectOptionIdSnapshot { get; set; }
    public int RewardSnapshot { get; set; }
    public string QuestionMessage { get; set; } = string.Empty;
    public string OptionsMessage { get; set; } = string.Empty;
    public string Status { get; set; } = "publishing";
    public string QuestionDeliveryStatus { get; set; } = "pending";
    public string OptionsDeliveryStatus { get; set; } = "pending";
    public string OutcomeDeliveryStatus { get; set; } = "pending";
    public string? QuestionMessageId { get; set; }
    public string? OptionsMessageId { get; set; }
    public string? OutcomeMessageId { get; set; }
    public string? LastError { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public Game? Game { get; set; }
    public QuestionDefinition? Question { get; set; }
    public GameQuizQuestionSession? QuestionSession { get; set; }
}
