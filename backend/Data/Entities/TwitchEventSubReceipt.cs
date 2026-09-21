namespace backend.Data.Entities;

public sealed class TwitchEventSubReceipt
{
    public string NotificationId { get; set; } = string.Empty;
    public string? ChatMessageId { get; set; }
    public Guid? QuestionSessionId { get; set; }
    public string Outcome { get; set; } = string.Empty;
    public DateTime EventTimestampUtc { get; set; }
    public DateTime ProcessedAtUtc { get; set; }
}
