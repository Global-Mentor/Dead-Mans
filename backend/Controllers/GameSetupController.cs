using backend.Application.Abstractions;
using backend.Application.Abstractions.Auth;
using backend.Api.Contracts;
using backend.Api.Mapping;
using backend.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/game/setup")]
[Authorize(Roles = AuthRoleCodes.Admin)]
public sealed class GameSetupController : ControllerBase
{
    private readonly IGameSetupService _gameSetupService;
    private readonly ILogger<GameSetupController> _logger;

    public GameSetupController(IGameSetupService gameSetupService, ILogger<GameSetupController> logger)
    {
        _gameSetupService = gameSetupService;
        _logger = logger;
    }

    [HttpGet]
    [ProducesResponseType(typeof(GameSetupSnapshotDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        try
        {
            var snapshot = await _gameSetupService.GetDraftSetupAsync(cancellationToken);
            if (snapshot is null)
            {
                _logger.LogInformation(AppMessages.Logs.GameSetupDraftNotFound);
                return NotFound(new ErrorResponse(AppMessages.Client.NoDraftGameForSetup));
            }

            return Ok(snapshot.ToSetupDto());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, AppMessages.Logs.GameSetupDraftLoadFailed);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new ErrorResponse(AppMessages.Client.UnableToLoadGameSetup)
            );
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(GameSetupSnapshotDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Create(
        [FromBody] CreateGameSetupRequestDto? request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var result = await _gameSetupService.CreateDraftSetupAsync(request?.Title ?? string.Empty, cancellationToken);
            return result.Outcome switch
            {
                CreateDraftGameSetupOutcome.Created when result.Snapshot is not null =>
                    CreatedAtAction(nameof(Get), null, result.Snapshot.ToSetupDto()),
                CreateDraftGameSetupOutcome.DraftAlreadyExists => Conflict(
                    new ErrorResponse(AppMessages.Client.DraftGameAlreadyExists)
                ),
                CreateDraftGameSetupOutcome.InvalidTitle => BadRequest(
                    new ErrorResponse(
                        AppMessages.Client.InvalidGameSetupTitle,
                        AppMessages.ErrorCodes.InvalidGameSetupTitle
                    )
                ),
                _ => StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new ErrorResponse(AppMessages.Client.UnableToCreateGameSetup)
                )
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, AppMessages.Logs.GameSetupDraftCreateFailed);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new ErrorResponse(AppMessages.Client.UnableToCreateGameSetup)
            );
        }
    }

    [HttpPut]
    [ProducesResponseType(typeof(GameSetupSnapshotDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Update(
        [FromBody] UpdateGameSetupRequestDto? request,
        CancellationToken cancellationToken
    )
    {
        if (request is null)
        {
            return BadRequest(new ErrorResponse(AppMessages.Client.InvalidGameSetupSaveRequest));
        }

        try
        {
            var result = await _gameSetupService.UpdateDraftSetupAsync(
                request.ToUpdateModel(),
                cancellationToken
            );

            return result.Outcome switch
            {
                UpdateDraftGameSetupOutcome.Updated when result.Snapshot is not null =>
                    Ok(result.Snapshot.ToSetupDto()),
                UpdateDraftGameSetupOutcome.NoDraftFound => NotFound(
                    new ErrorResponse(AppMessages.Client.NoDraftGameForSetup)
                ),
                UpdateDraftGameSetupOutcome.StaleVersion => Conflict(
                    new ErrorResponse(
                        AppMessages.Client.GameSetupDraftVersionConflict,
                        AppMessages.ErrorCodes.GameSetupDraftVersionConflict
                    )
                ),
                UpdateDraftGameSetupOutcome.InvalidTitle => BadRequest(
                    new ErrorResponse(
                        AppMessages.Client.InvalidGameSetupTitle,
                        AppMessages.ErrorCodes.InvalidGameSetupTitle
                    )
                ),
                UpdateDraftGameSetupOutcome.InvalidRowLabels
                or UpdateDraftGameSetupOutcome.InvalidColumnLabels
                or UpdateDraftGameSetupOutcome.InvalidCells =>
                    BadRequest(new ErrorResponse(AppMessages.Client.InvalidGameSetupSaveRequest)),
                _ => StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new ErrorResponse(AppMessages.Client.UnableToSaveGameSetup)
                )
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, AppMessages.Logs.GameSetupDraftSaveFailed);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new ErrorResponse(AppMessages.Client.UnableToSaveGameSetup)
            );
        }
    }

    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Delete(CancellationToken cancellationToken)
    {
        try
        {
            var result = await _gameSetupService.DeleteDraftSetupAsync(cancellationToken);
            return result.Outcome switch
            {
                DeleteDraftGameSetupOutcome.Deleted => NoContent(),
                DeleteDraftGameSetupOutcome.NoDraftFound => NotFound(
                    new ErrorResponse(AppMessages.Client.NoDraftGameForSetup)
                ),
                _ => StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new ErrorResponse(AppMessages.Client.UnableToDeleteGameSetup)
                )
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, AppMessages.Logs.GameSetupDraftDeleteFailed);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new ErrorResponse(AppMessages.Client.UnableToDeleteGameSetup)
            );
        }
    }
}
