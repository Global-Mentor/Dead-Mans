using System.Text.Json;
using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameRegistrationPersistence
{
    private static readonly JsonSerializerOptions ParticipationNotificationJsonOptions = new(JsonSerializerDefaults.Web);

    private async Task AddParticipationNotificationAsync(
        string type,
        GameTeamMember membership,
        GameTeam team,
        Guid actorUserId,
        DateTime utcNow,
        CancellationToken cancellationToken,
        GameTeam? previousTeam = null
    )
    {
        if (membership.UserId == actorUserId)
        {
            return;
        }

        var slotIndex = await _dbContext.GameTeamSlots
            .Where(slot => slot.Id == team.SlotId)
            .Select(slot => slot.SlotIndex)
            .SingleAsync(cancellationToken);
        int? previousSlotIndex = previousTeam is null ? null : await _dbContext.GameTeamSlots
            .Where(slot => slot.Id == previousTeam.SlotId)
            .Select(slot => slot.SlotIndex)
            .SingleAsync(cancellationToken);
        var payload = new TeamParticipationNotificationPayload(
            team.Name, slotIndex, previousTeam?.Name, previousSlotIndex);

        // Saved by the caller in the same transaction as the membership change.
        _dbContext.GameUserNotifications.Add(new GameUserNotification
        {
            Id = Guid.NewGuid(),
            UserId = membership.UserId,
            GameId = team.GameId,
            Type = type,
            SchemaVersion = 1,
            PayloadJson = JsonSerializer.Serialize(payload, ParticipationNotificationJsonOptions),
            DeduplicationKey = $"{type}:{membership.Id:N}",
            CreatedAtUtc = utcNow
        });
    }
}

internal sealed record TeamParticipationNotificationPayload(
    string? TeamName,
    int TeamSlotIndex,
    string? PreviousTeamName,
    int? PreviousTeamSlotIndex
);
