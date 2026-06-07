using backend.Api.Contracts;
using backend.Api.Http;
using backend.Api.Mapping;
using backend.Application.Abstractions;
using backend.Application.Abstractions.Auth;
using backend.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/game/modifiers")]
[Authorize]
public sealed class GameModifierController : ControllerBase
{
    private readonly IGameModifierService _gameModifierService;

    public GameModifierController(IGameModifierService gameModifierService)
    {
        _gameModifierService = gameModifierService;
    }

    [HttpGet("catalog")]
    [ProducesResponseType(typeof(IReadOnlyList<GameModifierDefinitionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCatalog(CancellationToken cancellationToken)
    {
        var catalog = await _gameModifierService.GetCatalogAsync(cancellationToken);
        return Ok(catalog.Select(x => x.ToDto()).ToArray());
    }

    [HttpPost("{modifierCode}/activate")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Activate(string modifierCode, CancellationToken cancellationToken)
    {
        var result = await _gameModifierService.ActivateAsync(
            modifierCode,
            HttpContext.TryGetUserId(),
            cancellationToken
        );

        return result.Outcome switch
        {
            ActivateGameModifierOutcome.Activated => NoContent(),
            ActivateGameModifierOutcome.UnknownModifierCode => this.NotFoundError(
                AppMessages.Client.GameModifierUnknownCode,
                AppMessages.ErrorCodes.GameModifierUnknownCode
            ),
            ActivateGameModifierOutcome.GameNotActive => this.NotFoundError(
                AppMessages.Client.GameModifierGameNotActive,
                AppMessages.ErrorCodes.GameModifierGameNotActive
            ),
            ActivateGameModifierOutcome.ModifierNotEnabled => this.ConflictError(
                AppMessages.Client.GameModifierNotEnabled,
                AppMessages.ErrorCodes.GameModifierNotEnabled
            ),
            ActivateGameModifierOutcome.ModifierConflictActive => this.ConflictError(
                AppMessages.Client.GameModifierConflictActive,
                AppMessages.ErrorCodes.GameModifierConflictActive
            ),
            ActivateGameModifierOutcome.ModifierLimitReached => this.ConflictError(
                AppMessages.Client.GameModifierLimitReached,
                AppMessages.ErrorCodes.GameModifierLimitReached
            ),
            ActivateGameModifierOutcome.UserNotResolved => this.BadRequestError(
                AppMessages.Client.AuthCookieMissingClaims,
                AppMessages.ErrorCodes.GameModifierUserNotResolved
            ),
            _ => this.StatusError(
                StatusCodes.Status500InternalServerError,
                AppMessages.Client.UnexpectedServerError
            )
        };
    }
}
