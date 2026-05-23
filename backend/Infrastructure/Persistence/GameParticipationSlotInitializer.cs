using backend.Application.Configuration;
using backend.Data;
using backend.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public static class GameParticipationSlotInitializer
{
    public static async Task EnsureDefaultSlotsAsync(
        ApplicationDbContext dbContext,
        Guid gameId,
        CancellationToken cancellationToken = default
    )
    {
        var hasSlots = await dbContext.GameParticipationSlots.AnyAsync(
            slot => slot.GameId == gameId,
            cancellationToken
        );
        if (hasSlots)
        {
            return;
        }

        var utcNow = DateTime.UtcNow;
        var slots = GameRegistrationDefaults
            .BuildDefaultSlots()
            .Select(
                slot =>
                    new GameParticipationSlot
                    {
                        Id = Guid.NewGuid(),
                        GameId = gameId,
                        SlotIndex = slot.SlotIndex,
                        Availability = slot.Availability,
                        ReservedLabel = null,
                        CreatedAtUtc = utcNow
                    }
            )
            .ToList();

        dbContext.GameParticipationSlots.AddRange(slots);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
