namespace backend.Data.Entities;

public class GameQuizSubmission
{
    public Guid Id { get; set; }

    public Guid GameId { get; set; }

    public Guid QuestionSessionId { get; set; }

    public Guid UserId { get; set; }

    public Guid? CapturedByUserId { get; set; }

    public Guid SelectedOptionId { get; set; }

    public string SelectedOptionTextSnapshot { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }

    public int AwardedPoints { get; set; }

    public string TwitchUserIdSnapshot { get; set; } = string.Empty;

    public string LoginSnapshot { get; set; } = string.Empty;

    public string DisplayNameSnapshot { get; set; } = string.Empty;

    public string SourceProvider { get; set; } = string.Empty;

    public string? SourceChannelId { get; set; }

    public string? SourceMessageId { get; set; }

    public DateTime SubmittedAtUtc { get; set; }

    public GameQuizQuestionSession QuestionSession { get; set; } = default!;

    public User User { get; set; } = default!;

    public User? CapturedByUser { get; set; }

    public ICollection<GameQuizPointLedgerEntry> PointEntries { get; set; } =
        new List<GameQuizPointLedgerEntry>();
}
