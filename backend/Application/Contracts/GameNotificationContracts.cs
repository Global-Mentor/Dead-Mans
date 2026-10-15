namespace backend.Application.Contracts;

public static class GameNotificationTypes
{
    public const string ModifierCancelled = "modifier_cancelled";
    public const string TeamRejected = "team_rejected";
    public const string TeamMemberAssigned = "team_member_assigned";
    public const string TeamMemberTransferred = "team_member_transferred";
    public const string TeamMemberRemoved = "team_member_removed";
    public const string TeamDisbanded = "team_disbanded";
}

public sealed record GameUserNotification(
    Guid NotificationId,
    string Type,
    DateTime CreatedAtUtc,
    string? ModifierName,
    string? ActorDisplayName,
    int? QuizPointsDelta,
    string? TeamName = null,
    int? TeamSlotIndex = null,
    string? PreviousTeamName = null,
    int? PreviousTeamSlotIndex = null
);

public sealed record GameUserNotificationCreatedEvent(
    Guid UserId,
    GameUserNotification Notification
);
