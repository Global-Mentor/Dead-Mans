using backend.Domain.GameModifiers;
using System.Data;
using backend.Application.Abstractions.Repositories;
using backend.Application.Abstractions.Auth;
using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;
using backend.Infrastructure.Configuration;
using Microsoft.Extensions.Options;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameOverlayRepository(ApplicationDbContext db, IOptions<StorageOptions> storageOptions,
    TimeProvider timeProvider) : IGameOverlayRepository
{
    public Task<bool> ValidateKeyAsync(string hash, CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        return db.Set<GameOverlayKey>().AsNoTracking().AnyAsync(key => key.KeyHash == hash
            && key.Owner.IsActive && key.Owner.UserRoles.Any(assignment =>
                (assignment.ExpiresAtUtc == null || assignment.ExpiresAtUtc > now)
                && (assignment.Role.Code == AuthRoleCodes.Moderator
                    || assignment.Role.Code == AuthRoleCodes.Admin
                    || assignment.Role.Code == AuthRoleCodes.SuperAdmin)), cancellationToken);
    }

    public async Task ReplaceKeyAsync(Guid ownerId, string hash, CancellationToken cancellationToken)
    {
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO game_overlay_keys (owner_id, key_hash) VALUES ({ownerId}, {hash})
            ON CONFLICT (owner_id) DO UPDATE SET key_hash = EXCLUDED.key_hash
            """, cancellationToken);
    }

    public async Task RevokeKeyAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        await db.Set<GameOverlayKey>().Where(key => key.OwnerId == ownerId)
            .ExecuteDeleteAsync(cancellationToken);
    }

    public async Task<GameOverlaySnapshot> ReadAsync(CancellationToken cancellationToken)
    {
        // All parts of a broadcast frame must belong to the same committed game state.
        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, cancellationToken)
            : null;
        var game = await db.Games.AsNoTracking()
            .Where(game => !game.IsDeleted && game.Status == GameStatusValue.Active)
            .Select(game => new { game.Id, game.ActiveTeamId, game.Status })
            .FirstOrDefaultAsync(cancellationToken);
        if (game is null)
        {
            return new GameOverlaySnapshot(null, "idle", null, null);
        }
        if (game.Status != GameStatusValue.Active || game.ActiveTeamId is null)
        {
            return new GameOverlaySnapshot(game.Id.ToString(), "idle", null, null);
        }

        var team = await db.GameTeams.AsNoTracking()
            .Where(team => team.Id == game.ActiveTeamId && team.GameId == game.Id)
            .Select(team => new { team.Name, SlotIndex = team.Slot!.SlotIndex })
            .SingleAsync(cancellationToken);
        var players = await db.GameTeamMembers.AsNoTracking()
            .Where(member => member.TeamId == game.ActiveTeamId && member.GameId == game.Id
                && member.LeftAtUtc == null)
            .OrderBy(member => member.JoinedAtUtc).ThenBy(member => member.Id)
            .Select(member => member.User!.DisplayName)
            .ToArrayAsync(cancellationToken);
        var activeTeam = new GameOverlayTeam(team.Name, team.SlotIndex, players);
        var round = await db.GameRounds.AsNoTracking()
            .Where(round => round.GameId == game.Id
                && round.Status != GameRoundStatusValue.Completed
                && round.Status != GameRoundStatusValue.Cancelled)
            .Select(round => new
            {
                round.Id,
                round.Status,
                round.GameplayStartedAtUtc,
                round.CellTitleSnapshot,
                round.CellCostSnapshot,
                round.BoardId,
                round.CellRowIndex,
                round.CellColIndex
            })
            .SingleOrDefaultAsync(cancellationToken);
        if (round is not null)
        {
            if (round.Status is GameRoundStatusValue.ReviewingResults or GameRoundStatusValue.ShowingResults)
            {
                var roster = await db.GameRoundParticipants.AsNoTracking().Where(row => row.RoundId == round.Id)
                    .OrderBy(row => row.CreatedAtUtc).ThenBy(row => row.Id)
                    .Select(row => row.DisplayNameSnapshot).ToArrayAsync(cancellationToken);
                return new GameOverlaySnapshot(game.Id.ToString(), round.Status, activeTeam with { Players = roster }, null,
                    Summary: await ReadSummaryAsync(round.Id, round.Status == GameRoundStatusValue.ShowingResults, cancellationToken));
            }
            if (round.Status == GameRoundStatusValue.InProgress && round.GameplayStartedAtUtc is { } startedAt)
            {
                var frozenModifiers = await db.GameRoundModifierResults.AsNoTracking()
                    .Where(result => result.RoundId == round.Id && result.Round.GameId == game.Id)
                    .OrderBy(result => result.CreatedAtUtc).ThenBy(result => result.Id)
                    .Select(result => new
                    {
                        result.Id,
                        result.ModifierId,
                        result.ModifierNameSnapshot,
                        result.ResolutionGroupId,
                        result.ModifierBehaviorV2SnapshotJson,
                        result.GameModifierActivation.ModifierIconEmojiSnapshot
                    }).ToArrayAsync(cancellationToken);
                var modifiers = frozenModifiers.GroupBy(result => result.ModifierId).Select(group =>
                {
                    var timers = new Dictionary<string, long>();
                    foreach (var result in group)
                    {
                        var behavior = ModifierBehaviorV2Json.Deserialize(result.ModifierBehaviorV2SnapshotJson);
                        if (behavior.DurationSecondsPerActivation is not > 0)
                        {
                            continue;
                        }
                        var timerId = behavior.StackingPolicy == ModifierStackingPolicy.AggregateParameters
                            ? result.ResolutionGroupId?.ToString() ?? "aggregate"
                            : result.Id.ToString();
                        timers[timerId] = timers.GetValueOrDefault(timerId) + behavior.DurationSecondsPerActivation.Value;
                    }
                    var first = group.First();
                    return new GameOverlayGameplayModifier(group.Key.ToString(), first.ModifierNameSnapshot,
                        first.ModifierIconEmojiSnapshot, group.Count(),
                        timers.Select(timer => new GameOverlayTimer(timer.Key, timer.Value)).ToArray());
                }).ToArray();
                var gameplay = new GameOverlayGameplay(round.Id.ToString(), startedAt,
                    timeProvider.GetUtcNow().UtcDateTime, modifiers);
                return new GameOverlaySnapshot(game.Id.ToString(), round.Status, activeTeam, null, null, gameplay);
            }
            GameOverlayRound? broadcastRound = null;
            if (round.Status is GameRoundStatusValue.CardOpened or GameRoundStatusValue.AwaitingModifiers
                or GameRoundStatusValue.Preparing)
            {
                var labels = await db.GameBoards.AsNoTracking()
                    .Where(board => board.Id == round.BoardId && board.GameId == game.Id)
                    .Select(board => new { board.RowLabels, board.ColLabels })
                    .SingleAsync(cancellationToken);
                var image = await db.Set<GameRoundCellMedia>().AsNoTracking()
                    .Where(media => media.RoundId == round.Id && media.MimeType.StartsWith("image/"))
                    .OrderBy(media => media.SortOrder).ThenBy(media => media.Id)
                    .Select(media => new { media.Bucket, media.ObjectKey })
                    .FirstOrDefaultAsync(cancellationToken);
                var modifiers = await db.GameModifierActivations.AsNoTracking()
                    .Where(activation => activation.RoundId == round.Id && activation.GameId == game.Id
                        && activation.ArchivedAtUtc == null && activation.Status == GameModifierActivationStatusValue.Active)
                    .OrderBy(activation => activation.ActivatedAtUtc).ThenBy(activation => activation.Id)
                    .Select(activation => new GameOverlayModifier(activation.Id.ToString(),
                        activation.ModifierNameSnapshot, activation.ModifierIconEmojiSnapshot,
                        activation.ModifierId.ToString()))
                    .ToArrayAsync(cancellationToken);
                broadcastRound = new GameOverlayRound(round.Id.ToString(), round.CellTitleSnapshot, round.CellCostSnapshot,
                    image is null ? null : GameBoardMediaUrlBuilder.Build(storageOptions.Value.PublicBaseUrl, image.Bucket, image.ObjectKey),
                    modifiers, labels.ColLabels[round.CellColIndex], labels.RowLabels[round.CellRowIndex]);
            }
            return new GameOverlaySnapshot(game.Id.ToString(), round.Status, activeTeam, null, broadcastRound);
        }

        return await ReadBoardAsync(game.Id, activeTeam, cancellationToken);
    }
}
