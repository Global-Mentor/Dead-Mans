namespace backend.Api.Contracts;

public sealed record GameUserNotificationDto(
    string NotificationId,
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

public sealed record GameUserNotificationCreatedEventDto(GameUserNotificationDto Notification);
