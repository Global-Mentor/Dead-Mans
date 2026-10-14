using backend.Api.Contracts;
using backend.Api.Auth;
using backend.Api.Http;
using backend.Api.Mapping;
using backend.Application.Abstractions;
using backend.Application.Abstractions.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/overlay")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class GameOverlayController(IGameOverlayService service) : ControllerBase
{
    [HttpPost("key")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    public async Task<IActionResult> RotateKey(CancellationToken cancellationToken)
    {
        var ownerId = HttpContext.TryGetUserId();
        if (ownerId is null)
        {
            return Unauthorized();
        }

        return Ok(new GameOverlayKeyDto(await service.RotateKeyAsync(ownerId.Value, cancellationToken)));
    }

    [HttpDelete("key")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    public async Task<IActionResult> RevokeKey(CancellationToken cancellationToken)
    {
        var ownerId = HttpContext.TryGetUserId();
        if (ownerId is null)
        {
            return Unauthorized();
        }

        await service.RevokeKeyAsync(ownerId.Value, cancellationToken);
        return NoContent();
    }

    [HttpGet("snapshot")]
    [Authorize(AuthenticationSchemes = GameOverlayAuthenticationHandler.SchemeName)]
    public async Task<IActionResult> GetSnapshot(CancellationToken cancellationToken)
    {
        var snapshot = await service.ReadAsync(Request.Headers["X-Overlay-Key"].ToString(), cancellationToken);
        return Ok(new GameOverlaySnapshotDto(snapshot.GameId, snapshot.Phase,
            snapshot.Team is { } team ? new GameOverlayTeamDto(team.Name, team.SlotIndex, team.Players) : null,
            snapshot.Board is { } board ? new GameOverlayBoardDto(board.RowLabels, board.ColLabels,
                board.Cells.Select(cell => new GameOverlayCellDto(cell.Row, cell.Col, cell.Cost, cell.State, cell.Title,
                    cell.ImageUrl, cell.Result is { } result ? new GameOverlayCellResultDto(result.TeamName,
                        result.TeamSlotIndex, result.FinalScore, result.PenaltyTotal) : null)).ToArray()) : null,
            snapshot.Round is { } round ? new GameOverlayRoundDto(round.Id, round.Title, round.Cost, round.ImageUrl,
                round.Modifiers.Select(modifier => new GameOverlayModifierDto(modifier.Id, modifier.Name,
                    modifier.IconEmoji, modifier.ModifierId)).ToArray(),
                round.ColumnLabel, round.RowLabel) : null,
            snapshot.Gameplay is { } gameplay ? new GameOverlayGameplayDto(gameplay.RoundId,
                gameplay.GameplayStartedAtUtc, gameplay.ServerNowUtc,
                gameplay.Modifiers.Select(modifier => new GameOverlayGameplayModifierDto(modifier.ModifierId,
                    modifier.Name, modifier.IconEmoji, modifier.ActivationCount,
                    modifier.Timers.Select(timer => new GameOverlayTimerDto(timer.Id, timer.DurationSeconds)).ToArray()
                )).ToArray()) : null,
            snapshot.Summary is { } summary ? new GameOverlaySummaryDto(summary.RoundId, summary.IsFinal,
                new GameOverlayRoundDto(summary.Card.Id, summary.Card.Title, summary.Card.Cost, summary.Card.ImageUrl,
                    [], summary.Card.ColumnLabel, summary.Card.RowLabel), summary.TeamName, summary.TeamSlotIndex,
                summary.KillsCount, summary.BountyCount, summary.KillsScore, summary.BountyScore,
                summary.ScoreDetails.ToDto()) : null));
    }

    [HttpGet("test")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    public async Task<IActionResult> GetTestState(CancellationToken cancellationToken)
    {
        var ownerId = HttpContext.TryGetUserId();
        if (ownerId is null) return Unauthorized();
        var state = await service.ReadTestStateAsync(ownerId.Value, cancellationToken);
        return Ok(new GameOverlayTestStateDto(state.HasKey, state.Enabled));
    }

    [HttpPut("test")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    public async Task<IActionResult> SetTestState(SetGameOverlayTestRequest request, CancellationToken cancellationToken)
    {
        var ownerId = HttpContext.TryGetUserId();
        if (ownerId is null) return Unauthorized();
        if (request.Enabled is not { } enabled) return BadRequest();
        var state = await service.SetTestEnabledAsync(ownerId.Value, enabled, cancellationToken);
        return Ok(new GameOverlayTestStateDto(state.HasKey, state.Enabled));
    }
}
