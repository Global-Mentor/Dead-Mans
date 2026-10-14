namespace backend.Application.Contracts;

public static class GameNotificationTypes
{
    public const string ModifierCancelled = "modifier_cancelled";
    public const string TeamRejected = "team_rejected";
}

public sealed record GameUserNotification(
    Guid NotificationId,
    string Type,
    DateTime CreatedAtUtc,
    string? ModifierName,
    string? ActorDisplayName,
    int? QuizPointsDelta,
    string? TeamName = null
);

public sealed record GameUserNotificationCreatedEvent(
    Guid UserId,
    GameUserNotification Notification
);
