using backend.Api.Contracts;
using backend.Api.Mapping;
using backend.Application.Abstractions.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

public sealed partial class GameRegistrationController
{
    [HttpPut("admin/games/{gameId:guid}/team-limit")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateTeamLimit(
        Guid gameId, [FromBody] UpdateTeamLimitRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _registrationService.UpdateTeamLimitAsync(gameId, request.TeamLimit, cancellationToken);
        return result.Success ? NoContent() : GameRegistrationErrorMapping.ToActionResult(this, result.Error);
    }
}
