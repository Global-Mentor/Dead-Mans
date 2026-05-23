namespace backend.Application.Contracts;

public sealed record DraftGameLifecycleContext(
    Guid GameId,
    short MinPlayersPerTeam,
    short MaxPlayersPerTeam
);
