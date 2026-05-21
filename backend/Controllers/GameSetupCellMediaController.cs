using backend.Application.Abstractions;
using backend.Application.Abstractions.Auth;
using backend.Api.Contracts;
using backend.Api.Mapping;
using backend.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/game/setup/cells/{cellId:guid}/media")]
[Authorize(Roles = AuthRoleCodes.Admin)]
public sealed class GameSetupCellMediaController : ControllerBase
{
    private readonly IGameSetupCellMediaService _cellMediaService;
    private readonly ILogger<GameSetupCellMediaController> _logger;

    public GameSetupCellMediaController(
        IGameSetupCellMediaService cellMediaService,
        ILogger<GameSetupCellMediaController> logger
    )
    {
        _cellMediaService = cellMediaService;
        _logger = logger;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(GameBoardCellMediaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Upload(
        Guid cellId,
        IFormFile? file,
        CancellationToken cancellationToken
    )
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new ErrorResponse(AppMessages.Client.InvalidGameSetupCellMediaUpload));
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await _cellMediaService.UploadAsync(
                cellId,
                stream,
                file.ContentType,
                file.Length,
                cancellationToken
            );

            return result.Outcome switch
            {
                UploadDraftGameSetupCellMediaOutcome.Uploaded when result.Media is not null =>
                    Ok(result.Media.ToDto()),
                UploadDraftGameSetupCellMediaOutcome.NoDraft => NotFound(
                    new ErrorResponse(AppMessages.Client.NoDraftGameForSetup)
                ),
                UploadDraftGameSetupCellMediaOutcome.CellNotFound => NotFound(
                    new ErrorResponse(AppMessages.Client.GameSetupCellNotFound)
                ),
                UploadDraftGameSetupCellMediaOutcome.InvalidFile => BadRequest(
                    new ErrorResponse(AppMessages.Client.InvalidGameSetupCellMediaUpload)
                ),
                _ => StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new ErrorResponse(AppMessages.Client.UnableToUploadGameSetupCellMedia)
                ),
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, AppMessages.Logs.GameSetupCellMediaUploadFailed, cellId);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new ErrorResponse(AppMessages.Client.UnableToUploadGameSetupCellMedia)
            );
        }
    }

    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Delete(Guid cellId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _cellMediaService.DeleteAsync(cellId, cancellationToken);
            return result.Outcome switch
            {
                DeleteDraftGameSetupCellMediaOutcome.Deleted => NoContent(),
                DeleteDraftGameSetupCellMediaOutcome.NoDraft => NotFound(
                    new ErrorResponse(AppMessages.Client.NoDraftGameForSetup)
                ),
                DeleteDraftGameSetupCellMediaOutcome.CellNotFound => NotFound(
                    new ErrorResponse(AppMessages.Client.GameSetupCellNotFound)
                ),
                DeleteDraftGameSetupCellMediaOutcome.MediaNotFound => NotFound(
                    new ErrorResponse(AppMessages.Client.GameSetupCellMediaNotFound)
                ),
                _ => StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new ErrorResponse(AppMessages.Client.UnableToDeleteGameSetupCellMedia)
                ),
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, AppMessages.Logs.GameSetupCellMediaDeleteFailed, cellId);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new ErrorResponse(AppMessages.Client.UnableToDeleteGameSetupCellMedia)
            );
        }
    }
}
