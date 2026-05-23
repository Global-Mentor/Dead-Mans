using backend.Domain.Persistence;

namespace backend.Data.Entities;

public class Game
{
    public Guid Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string Status { get; set; } = GameStatusValue.Draft;

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? ReadyAtUtc { get; set; }

    public DateTime? StartedAtUtc { get; set; }

    public DateTime? FinishedAtUtc { get; set; }

    public short MinPlayersPerTeam { get; set; } = 1;

    public short MaxPlayersPerTeam { get; set; } = 3;

    public GameBoard? Board { get; set; }

    public ICollection<GameParticipationSlot> ParticipationSlots { get; set; } =
        new List<GameParticipationSlot>();
}
