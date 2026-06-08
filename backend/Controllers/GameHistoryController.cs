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
[Route("api/game/history")]
[Authorize]
public sealed class GameHistoryController : ControllerBase
{
    private readonly IGameHistoryService _historyService;

    public GameHistoryController(IGameHistoryService historyService)
    {
        _historyService = historyService;
    }

    [HttpGet("users/{userId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<UserGameHistoryItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUserGameHistory(
        Guid userId,
        CancellationToken cancellationToken
    )
    {
        var currentUserId = HttpContext.TryGetUserId();
        if (!currentUserId.HasValue)
        {
            return this.BadRequestError(AppMessages.Client.AuthCookieMissingClaims);
        }

        var canReadForeignHistory =
            User.IsInRole(AuthRoleCodes.Admin) || User.IsInRole(AuthRoleCodes.Moderator);
        if (currentUserId.Value != userId && !canReadForeignHistory)
        {
            return Forbid();
        }

        var history = await _historyService.GetUserGameHistoryAsync(userId, cancellationToken);
        return Ok(history.Select(x => x.ToDto()).ToArray());
    }
}
