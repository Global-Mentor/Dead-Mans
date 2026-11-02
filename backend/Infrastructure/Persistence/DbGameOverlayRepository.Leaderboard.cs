using backend.Application.Contracts;
using backend.Application.Features.Scoring;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameOverlayRepository
{
    private const int LeaderboardPageSize = 6;

    public async Task<GameOverlayLeaderboardState?> ReadLeaderboardStateAsync(Guid gameId, CancellationToken cancellationToken)
    {
        var game = await db.Games.AsNoTracking()
            .Where(game => game.Id == gameId && !game.IsDeleted && game.Status == GameStatusValue.Active)
            .Select(game => new { game.OverlayLeaderboardEnabled, game.OverlayLeaderboardPage, game.OverlayLeaderboardKind })
            .SingleOrDefaultAsync(cancellationToken);
        if (game is null) return null;
        var count = await CountLeaderboardEntriesAsync(gameId, game.OverlayLeaderboardKind, cancellationToken);
        var pages = Math.Max(1, (count + LeaderboardPageSize - 1) / LeaderboardPageSize);
        return new GameOverlayLeaderboardState(game.OverlayLeaderboardEnabled,
            Math.Clamp(game.OverlayLeaderboardPage, 0, pages - 1), pages, game.OverlayLeaderboardKind);
    }

    public async Task<GameOverlayLeaderboardState?> SetLeaderboardStateAsync(Guid gameId, bool enabled, CancellationToken cancellationToken, int? page = null, string kind = "teams")
    {
        var state = await ReadLeaderboardStateAsync(gameId, cancellationToken);
        if (state is null) return null;
        var count = await CountLeaderboardEntriesAsync(gameId, kind, cancellationToken);
        var pages = Math.Max(1, (count + LeaderboardPageSize - 1) / LeaderboardPageSize);
        var selectedPage = enabled ? Math.Clamp(page ?? 0, 0, pages - 1) : 0;
        var changed = await db.Games
            .Where(game => game.Id == gameId && !game.IsDeleted && game.Status == GameStatusValue.Active)
            .ExecuteUpdateAsync(update => update.SetProperty(game => game.OverlayLeaderboardEnabled, enabled)
                .SetProperty(game => game.OverlayLeaderboardPage, selectedPage)
                .SetProperty(game => game.OverlayLeaderboardKind, kind), cancellationToken);
        return changed == 0 ? null : new GameOverlayLeaderboardState(enabled, selectedPage, pages, kind);
    }

    private async Task<IReadOnlyList<GameOverlayLeaderboardEntry>> ReadLeaderboardAsync(Guid gameId, CancellationToken cancellationToken)
    {
        var rosters = await db.GameTeams.AsNoTracking()
            .Where(team => team.GameId == gameId && team.Status == TeamStatusValue.Confirmed && team.DisbandedAtUtc == null)
            .Select(team => new
            {
                TeamId = team.Id,
                TeamName = team.Name,
                TeamSlotIndex = team.Slot != null ? team.Slot.SlotIndex : 0,
                Players = team.Members.Where(member => member.LeftAtUtc == null && member.User != null
                        && !string.IsNullOrWhiteSpace(member.User.DisplayName))
                    .OrderBy(member => member.JoinedAtUtc).ThenBy(member => member.Id)
                    .Select(member => member.User!.DisplayName).ToArray()
            }).ToArrayAsync(cancellationToken);
        var rounds = await db.GameRounds.AsNoTracking()
            .Where(round => round.GameId == gameId && round.Status == GameRoundStatusValue.Completed)
            .Select(round => new
            {
                round.Id,
                round.TeamId,
                round.FinalScore,
                round.FinishedAtUtc,
                round.CreatedAtUtc,
                round.KillsCount,
                round.BountyCount,
                ModifierKillDelta = round.ModifierResults.Sum(result => (long?)result.KillDelta) ?? 0,
                Players = round.Participants.OrderBy(participant => participant.CreatedAtUtc)
                    .Select(participant => !string.IsNullOrWhiteSpace(participant.DisplayNameSnapshot)
                        ? participant.DisplayNameSnapshot
                        : !string.IsNullOrWhiteSpace(participant.User.DisplayName)
                            ? participant.User.DisplayName : participant.UserId.ToString()).ToArray()
            })
            .ToArrayAsync(cancellationToken);
        var facts = rounds.GroupBy(round => round.TeamId).ToDictionary(group => group.Key,
            group => group.Select(round =>
            {
                var finalScore = round.FinalScore
                    ?? throw new InvalidOperationException("A completed round must have a final score.");
                var score = GameTeamRoundScoreValue.FromPersistedFinalScore(finalScore);
                return new GameTeamRoundScoreFact(round.Id, finalScore, score.PenaltyTotal, 0,
                    SaturatingInt32.From((long)round.KillsCount + round.ModifierKillDelta), round.BountyCount,
                    round.FinishedAtUtc ?? round.CreatedAtUtc);
            }).ToArray());
        var participants = rounds.OrderBy(round => round.CreatedAtUtc).GroupBy(round => round.TeamId)
            .ToDictionary(group => group.Key, group => group.SelectMany(round => round.Players)
                .Distinct(StringComparer.OrdinalIgnoreCase).ToArray());
        return GameTeamResultCalculator.Calculate(rosters.Select(roster => new GameTeamResultCalculationInput(
                roster.TeamId, roster.TeamName, roster.TeamSlotIndex,
                participants.GetValueOrDefault(roster.TeamId, roster.Players),
                facts.GetValueOrDefault(roster.TeamId, []))))
            .Select((team, index) => new GameOverlayLeaderboardEntry(team.FinalScore.HasValue ? index + 1 : null, team.TeamName, team.TeamSlotIndex,
                team.ParticipantNames, team.RoundsPlayed, team.TotalKills, team.TotalBounties, team.FinalScore)).ToArray();
    }
}
