using backend.Application.Abstractions;
using backend.Application.Abstractions.Auth;
using backend.Api.Contracts;
using backend.Api.Http;
using backend.Api.Mapping;
using backend.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>Read-only current game board snapshot from the database.</summary>
[ApiController]
[Route("api/game")]
[Authorize]
public sealed class GameController : ControllerBase
{
    private readonly IGameBoardService _gameBoardService;
    private readonly ILogger<GameController> _logger;

    public GameController(IGameBoardService gameBoardService, ILogger<GameController> logger)
    {
        _gameBoardService = gameBoardService;
        _logger = logger;
    }

    [HttpGet]
    [ProducesResponseType(typeof(GameBoardSnapshotDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var board = await _gameBoardService.GetCurrentBoardAsync(cancellationToken);
        if (board is null)
        {
            _logger.LogInformation(AppMessages.Logs.GameNoBoardForGet);
            return this.NotFoundError(
                AppMessages.Client.NoCurrentGameBoard,
                AppMessages.ErrorCodes.GameBoardNotFound
            );
        }

        return Ok(board.ToDto());
    }

    [HttpPost("cells/{cellId:guid}/open")]
    [Authorize(Roles = AuthRoleCodes.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> OpenCell(Guid cellId, CancellationToken cancellationToken)
    {
        var openResult = await _gameBoardService.TryOpenCellAsync(cellId, cancellationToken);
        if (openResult is null)
        {
            return this.NotFoundError(
                AppMessages.Client.GameCellNotFound,
                AppMessages.ErrorCodes.GameBoardCellNotFound
            );
        }

        return NoContent();
    }
}
