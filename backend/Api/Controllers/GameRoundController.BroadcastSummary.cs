using backend.Api.Contracts;
using backend.Api.Http;
using backend.Api.Mapping;
using backend.Application.Abstractions.Auth;
using backend.Application.Contracts;
using backend.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

public sealed partial class GameRoundController
{
    [HttpPost("{roundId:guid}/broadcast-summary")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    public async Task<IActionResult> BroadcastSummary(Guid roundId,
        [FromBody] BroadcastGameRoundSummaryRequestDto request, CancellationToken cancellationToken)
    {
        var userId = HttpContext.TryGetUserId();
        if (userId is null) return Unauthorized();
        if (request.ExpectedRoundVersion < 1 || request.KillsCount < 0 || request.BountyCount < 0)
            return this.BadRequestError(AppMessages.Client.GameRoundInvalidRequest, AppMessages.ErrorCodes.GameRoundInvalidRequest);
        if ((request.CompleteInput is not null && request.PartialInput is not null)
            || !TryMapBroadcastInput(request.CompleteInput, out var completeInput)
            || !TryMapBroadcastInput(request.PartialInput, out var partialInput))
            return this.BadRequestError(AppMessages.Client.GameRoundInvalidRequest, AppMessages.ErrorCodes.GameRoundInvalidRequest);
        var result = await _service.BroadcastSummaryAsync(roundId,
            new(request.ExpectedRoundVersion, request.KillsCount, request.BountyCount, completeInput,
                partialInput, request.HasChanges), userId.Value, cancellationToken);
        return result.Outcome switch
        {
            FinalizeGameRoundOutcome.Completed => result.ScoreDetails is null ? NoContent() : Ok(result.ToDto()),
            FinalizeGameRoundOutcome.NotFound => this.NotFoundError(AppMessages.Client.GameRoundNotFound, AppMessages.ErrorCodes.GameRoundNotFound),
            FinalizeGameRoundOutcome.NotInProgress => this.ConflictError(AppMessages.Client.GameRoundNotInProgress, AppMessages.ErrorCodes.GameRoundNotInProgress),
            FinalizeGameRoundOutcome.StaleVersion => this.ConflictError(AppMessages.Client.GameRoundStaleVersion, AppMessages.ErrorCodes.GameRoundStaleVersion),
            FinalizeGameRoundOutcome.CalculationFailed => this.StatusError(StatusCodes.Status422UnprocessableEntity,
                AppMessages.Client.GameRoundModifierCalculationFailed, result.ErrorCode ?? AppMessages.ErrorCodes.ModifierCalculationFailed),
            FinalizeGameRoundOutcome.InvalidStatus or FinalizeGameRoundOutcome.ModifierResultNotFound
                or FinalizeGameRoundOutcome.InvalidModifierResults => this.BadRequestError(
                    AppMessages.Client.GameRoundInvalidRequest, result.ErrorCode ?? AppMessages.ErrorCodes.GameRoundInvalidRequest),
            _ => throw new InvalidOperationException($"Unsupported broadcast outcome: {result.Outcome}.")
        };
    }

    private static bool TryMapBroadcastInput(FinalizeGameRoundRequestDto? request, out FinalizeGameRoundInput? input)
    {
        input = null;
        if (request is null) return true;
        var modifiers = new List<FinalizeGameRoundModifierInput>();
        foreach (var modifier in request.ModifierResults ?? [])
        {
            if (!Guid.TryParse(modifier.ModifierResultId, out var id)) return false;
            modifiers.Add(modifier.ToInput(id));
        }
        if (string.IsNullOrWhiteSpace(request.Status) || !TryMapRuleGroups(request.RuleGroups, out var groups)) return false;
        input = request.ToInput(modifiers, groups);
        return true;
    }
}
