using backend.Api.Contracts;
using backend.Application.Abstractions;
using backend.Application.Abstractions.Auth;
using backend.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/game/lifecycle")]
[Authorize(Roles = AuthRoleCodes.Admin)]
public sealed class GameLifecycleController : ControllerBase
{
    private readonly IGameLifecycleService _lifecycleService;

    public GameLifecycleController(IGameLifecycleService lifecycleService)
    {
        _lifecycleService = lifecycleService;
    }

    [HttpPost("open-registration")]
    [ProducesResponseType(typeof(GameLifecycleStateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> OpenRegistration(CancellationToken cancellationToken)
    {
        var result = await _lifecycleService.OpenRegistrationAsync(cancellationToken);
        return ToActionResult(result, GameLifecycleStatuses.Ready);
    }

    [HttpPost("start")]
    [ProducesResponseType(typeof(GameLifecycleStateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Start(CancellationToken cancellationToken)
    {
        var result = await _lifecycleService.StartGameAsync(cancellationToken);
        return ToActionResult(result, GameLifecycleStatuses.Active);
    }

    [HttpPost("finish")]
    [ProducesResponseType(typeof(GameLifecycleStateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Finish(CancellationToken cancellationToken)
    {
        var result = await _lifecycleService.FinishGameAsync(cancellationToken);
        return ToActionResult(result, GameLifecycleStatuses.Finished);
    }

    private IActionResult ToActionResult(GameLifecycleResult result, string successStatus)
    {
        if (result.Success && result.GameId.HasValue)
        {
            return Ok(new GameLifecycleStateDto(result.GameId.Value, successStatus));
        }

        return result.Error switch
        {
            GameLifecycleErrorCode.DraftNotFound or GameLifecycleErrorCode.GameNotReady
                or GameLifecycleErrorCode.GameNotActive =>
                NotFound(new ErrorResponse(MapLifecycleError(result.Error))),
            GameLifecycleErrorCode.ReadyGameAlreadyExists
                or GameLifecycleErrorCode.ActiveGameAlreadyExists
                or GameLifecycleErrorCode.NoParticipationSlots
                or GameLifecycleErrorCode.InvalidTeamSizeLimits =>
                Conflict(new ErrorResponse(MapLifecycleError(result.Error))),
            _ => StatusCode(
                StatusCodes.Status500InternalServerError,
                new ErrorResponse(AppMessages.Client.UnableToLoadCurrentGame)
            )
        };
    }

    private static string MapLifecycleError(GameLifecycleErrorCode error) =>
        error switch
        {
            GameLifecycleErrorCode.DraftNotFound => AppMessages.Client.NoDraftGameForSetup,
            GameLifecycleErrorCode.ReadyGameAlreadyExists => AppMessages.Client.ReadyGameAlreadyExists,
            GameLifecycleErrorCode.ActiveGameAlreadyExists => AppMessages.Client.ActiveGameAlreadyExists,
            GameLifecycleErrorCode.GameNotReady => AppMessages.Client.GameNotReadyForStart,
            GameLifecycleErrorCode.GameNotActive => AppMessages.Client.GameNotActiveForFinish,
            GameLifecycleErrorCode.NoParticipationSlots => AppMessages.Client.GameRegistrationSlotsRequired,
            GameLifecycleErrorCode.InvalidTeamSizeLimits =>
                AppMessages.Client.GameRegistrationInvalidTeamSizeLimits,
            _ => AppMessages.Client.UnableToLoadCurrentGame
        };
}
