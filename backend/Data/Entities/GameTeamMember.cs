namespace backend.Data.Entities;

public class GameTeamMember
{
    public Guid Id { get; set; }

    public Guid GameId { get; set; }

    public Guid TeamId { get; set; }

    public Guid UserId { get; set; }

    public DateTime JoinedAtUtc { get; set; }

    public DateTime? LeftAtUtc { get; set; }

    public GameTeam? Team { get; set; }

    public User? User { get; set; }
}
