using System.Text.Json;
using backend.Application.Contracts;
using backend.Application.Features.GameRounds;
using backend.Data.Entities;
using backend.Domain.GameModifiers;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameOverlayRepository
{
    private static readonly JsonSerializerOptions SummaryJsonOptions = new(JsonSerializerDefaults.Web);
    private async Task<GameOverlaySummary> ReadSummaryAsync(Guid roundId, bool isFinal, CancellationToken cancellationToken)
    {
        var round = await db.GameRounds.AsNoTracking().Where(row => row.Id == roundId)
            .Select(row => new
            {
                row.Id,
                row.Version,
                row.BaseScore,
                row.CellTitleSnapshot,
                row.CellCostSnapshot,
                row.KillsCount,
                row.BountyCount,
                row.FinalScore,
                row.Team.Name,
                row.TeamSlotIndexSnapshot,
                row.BoardId,
                row.CellColIndex,
                row.CellRowIndex,
                Image = row.CellMedia.Where(media => EF.Functions.Like(media.MimeType, "image/%"))
                    .OrderBy(media => media.SortOrder).ThenBy(media => media.Id)
                    .Select(media => new { media.Bucket, media.ObjectKey }).FirstOrDefault()
            }).SingleAsync(cancellationToken);
        var labels = await db.GameBoards.AsNoTracking().Where(row => row.Id == round.BoardId)
            .Select(row => new { row.ColLabels, row.RowLabels }).SingleAsync(cancellationToken);
        var kills = round.KillsCount;
        var bounties = round.BountyCount;
        GameRoundScoreDetails score;
        var modifierRows = await db.GameRoundModifierResults.AsNoTracking().Where(row => row.RoundId == roundId)
            .OrderBy(row => row.CreatedAtUtc).ThenBy(row => row.Id).Select(row => new
            {
                row.ScoreDelta,
                row.KillDelta,
                row.ModifierId,
                row.ModifierNameSnapshot,
                row.DefinitionRevisionSnapshot,
                BehaviorJson = row.ModifierBehaviorV2SnapshotJson,
                ResolutionJson = isFinal ? row.ResolutionDataJson : null
            }).ToArrayAsync(cancellationToken);
        var modifierInputs = modifierRows.Select(row => new GameRoundScoreModifierInput(row.ScoreDelta, row.KillDelta,
            row.ModifierId, row.ModifierNameSnapshot, row.DefinitionRevisionSnapshot,
            ModifierBehaviorV2Json.Deserialize(row.BehaviorJson), row.ResolutionJson)).ToArray();
        var frozen = modifierInputs.Where(modifier => modifier.Behavior!.Reward != ModifierRewardKind.None)
            .Select(modifier => (modifier.ModifierId ?? throw new InvalidOperationException("Frozen modifier has no identity."), modifier.ModifierName!)).ToArray();
        if (isFinal)
        {
            var calculated = GameRoundScoreCalculator.ToDetails(GameRoundScoreCalculator.Calculate(new(
                GameRoundStatusValue.Completed, round.BaseScore, kills, bounties, modifierInputs))) with
            { FinalScore = round.FinalScore ?? throw new InvalidOperationException("Completed round has no saved score.") };
            score = GameRoundBroadcastScore.Create(calculated, frozen);
        }
        else
        {
            var draft = await db.Set<GameRoundBroadcastDraft>().AsNoTracking()
                .SingleOrDefaultAsync(row => row.RoundId == roundId && row.RoundVersion == round.Version, cancellationToken);
            if (draft?.ScoreDetailsJson is { } scoreJson)
            {
                kills = draft.KillsCount;
                bounties = draft.BountyCount;
                score = JsonSerializer.Deserialize<GameRoundScoreDetails>(scoreJson, SummaryJsonOptions)
                    ?? throw new InvalidOperationException("Broadcast draft has no score details.");
                score = GameRoundBroadcastScore.Create(score, frozen);
            }
            else
            {
                kills = 0;
                bounties = 0;
                score = GameRoundBroadcastScore.CreateInitial(round.BaseScore, frozen);
            }
        }
        var card = new GameOverlayRound(round.Id.ToString(), round.CellTitleSnapshot, round.CellCostSnapshot,
            round.Image is null ? null : GameBoardMediaUrlBuilder.Build(storageOptions.Value.PublicBaseUrl, round.Image.Bucket, round.Image.ObjectKey),
            [], labels.ColLabels[round.CellColIndex], labels.RowLabels[round.CellRowIndex]);
        return new GameOverlaySummary(round.Id.ToString(), isFinal, card, round.Name, round.TeamSlotIndexSnapshot,
            kills, bounties, score.KillsScore, score.BountyScore, score);
    }
}
