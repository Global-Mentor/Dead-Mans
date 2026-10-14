using System.Text.Json;
using backend.Application.Contracts;
using backend.Application.Features.GameRounds;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameRoundRepository
{
    public async Task<PreviewGameRoundScoreResult> BroadcastSummaryAsync(Guid roundId,
        BroadcastGameRoundSummaryInput input, Guid userId, CancellationToken cancellationToken = default)
    {
        if (input.CompleteInput is not null && input.PartialInput is not null)
            return new(FinalizeGameRoundOutcome.InvalidModifierResults, null, []);
        var gameId = await ResolveRoundGameIdAsync(roundId, cancellationToken);
        if (gameId is null) return new(FinalizeGameRoundOutcome.NotFound, null, []);
        await using var transaction = _dbContext.Database.IsRelational()
            ? await _dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
        if (!await LockAndValidateActiveGameAsync(gameId.Value, cancellationToken))
            return new(FinalizeGameRoundOutcome.NotInProgress, null, []);
        await LockRoundAsync(roundId, cancellationToken);
        var round = await _dbContext.GameRounds.AsNoTracking().SingleAsync(row => row.Id == roundId, cancellationToken);
        if (round.Status != GameRoundStatusValue.ReviewingResults)
            return new(FinalizeGameRoundOutcome.NotInProgress, null, []);
        if (round.Version != input.ExpectedRoundVersion)
            return new(FinalizeGameRoundOutcome.StaleVersion, null, []);
        if (input.KillsCount < 0 || input.BountyCount < 0)
            return new(FinalizeGameRoundOutcome.InvalidModifierResults, null, []);
        var result = new PreviewGameRoundScoreResult(FinalizeGameRoundOutcome.Completed, null, []);
        if (input.CompleteInput is { } complete)
        {
            if (complete.Status != GameRoundStatusValue.Completed)
                return new(FinalizeGameRoundOutcome.InvalidStatus, null, []);
            if (complete.KillsCount != input.KillsCount || complete.BountyCount != input.BountyCount)
                return new(FinalizeGameRoundOutcome.InvalidModifierResults, null, []);
            if (complete.ExpectedRoundVersion != input.ExpectedRoundVersion)
                return new(FinalizeGameRoundOutcome.StaleVersion, null, []);
            result = await PreviewScoreAsync(roundId, complete, userId, cancellationToken);
            if (result.Outcome != FinalizeGameRoundOutcome.Completed) return result;
        }
        var preview = result.ScoreDetails is not null ? result
            : await PreviewPartialSummaryAsync(roundId, input, userId, cancellationToken);
        if (preview.Outcome != FinalizeGameRoundOutcome.Completed) return preview;
        var modifiers = preview.ModifierResults.Where(modifier => modifier.RuntimeBehavior?.Reward != null
            && modifier.RuntimeBehavior.Reward != backend.Domain.GameModifiers.ModifierRewardKind.None).Select(modifier => (modifier.ModifierId, modifier.ModifierName)).ToArray();
        var broadcastScore = input.HasChanges
            ? GameRoundBroadcastScore.Create(preview.ScoreDetails!, modifiers)
            : GameRoundBroadcastScore.CreateInitial(round.BaseScore, modifiers);
        var draft = await _dbContext.Set<GameRoundBroadcastDraft>().SingleOrDefaultAsync(
            row => row.RoundId == roundId, cancellationToken);
        if (draft is null)
        {
            draft = new GameRoundBroadcastDraft { RoundId = roundId };
            _dbContext.Add(draft);
        }
        draft.RoundVersion = round.Version;
        draft.KillsCount = input.HasChanges ? input.KillsCount : 0;
        draft.BountyCount = input.HasChanges ? input.BountyCount : 0;
        draft.ScoreDetailsJson = JsonSerializer.Serialize(broadcastScore, JsonOptions);
        draft.UpdatedAtUtc = _timeProvider.GetUtcNow().UtcDateTime;
        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return result;
    }

    private async Task<PreviewGameRoundScoreResult> PreviewPartialSummaryAsync(Guid roundId,
        BroadcastGameRoundSummaryInput input, Guid userId, CancellationToken cancellationToken)
    {
        var partial = input.PartialInput ?? new FinalizeGameRoundInput("completed", input.KillsCount,
            input.BountyCount, null, [], [], input.ExpectedRoundVersion);
        if (partial.Status != "completed" || partial.KillsCount != input.KillsCount
            || partial.BountyCount != input.BountyCount || partial.ExpectedRoundVersion != input.ExpectedRoundVersion)
            return new(FinalizeGameRoundOutcome.InvalidStatus, null, []);
        var round = await _dbContext.GameRounds.AsNoTracking().Include(row => row.ModifierResults)
            .SingleAsync(row => row.Id == roundId, cancellationToken);
        if (!TryCreateModifierInputsById(partial.ModifierResults, out var inputs, out var inputError))
            return new(FinalizeGameRoundOutcome.InvalidModifierResults, null, [], ErrorCode: inputError);
        var all = round.ModifierResults.ToArray();
        if (inputs.Keys.Any(id => all.All(row => row.Id != id)))
            return new(FinalizeGameRoundOutcome.InvalidModifierResults, null, []);
        foreach (var group in partial.RuleGroups)
        {
            var expected = all.Where(row => row.ResolutionKind == "ruleStatus"
                && (row.ResolutionGroupId ?? row.ModifierId) == group.ResolutionGroupId).Select(row => row.Id).Order();
            if (!expected.Any() || !expected.SequenceEqual(group.MemberResultIds.Order()))
                return new(FinalizeGameRoundOutcome.InvalidModifierResults, null, []);
        }
        var ruleIds = partial.RuleGroups.SelectMany(group => group.MemberResultIds).ToHashSet();
        round.KillsCount = input.KillsCount;
        round.BountyCount = input.BountyCount;
        round.ModifierResults = all.Where(row => inputs.ContainsKey(row.Id) || ruleIds.Contains(row.Id)
            || row.ResolutionKind is "automaticRoundMetric" or "perActivation").ToList();
        if (!TryApplyModifierScoring(round, inputs, partial.RuleGroups, userId, _timeProvider.GetUtcNow().UtcDateTime,
            out var error, out var configurationError))
            return new(configurationError ? FinalizeGameRoundOutcome.CalculationFailed : FinalizeGameRoundOutcome.InvalidModifierResults,
                null, [], ErrorCode: error);
        round.ModifierResults = all;
        return new(FinalizeGameRoundOutcome.Completed,
            Application.Features.GameRounds.GameRoundScoreCalculator.ToDetails(CalculateRoundScore(round, "completed")),
            all.Select(ToModifierSnapshot).ToArray());
    }
}
