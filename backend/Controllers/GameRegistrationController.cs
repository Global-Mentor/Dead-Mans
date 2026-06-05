using ApiContracts = backend.Api.Contracts;
using backend.Api.Http;
using backend.Api.Mapping;
using backend.Application.Abstractions;
using backend.Application.Abstractions.Auth;
using AppContracts = backend.Application.Contracts;
using backend.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/game/registration")]
[Authorize]
public sealed class GameRegistrationController : ControllerBase
{
    private readonly IGameRegistrationService _registrationService;

    public GameRegistrationController(IGameRegistrationService registrationService)
    {
        _registrationService = registrationService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiContracts.GameRegistrationSnapshotDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null)
        {
            return this.UnauthorizedError(AppMessages.Client.AuthenticationRequired);
        }

        var snapshot = await _registrationService.GetRegistrationSnapshotAsync(
            userId.Value,
            cancellationToken
        );
        if (snapshot is null)
        {
            return NotFound(GameRegistrationErrorMapping.NotOpenResponse());
        }

        return Ok(snapshot.ToDto());
    }

    [HttpPost("teams")]
    [ProducesResponseType(typeof(ApiContracts.RegistrationTeamDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateTeam(
        [FromBody] ApiContracts.CreateRegistrationTeamRequestDto request,
        CancellationToken cancellationToken
    )
    {
        var userId = RequireUserId();
        if (userId is null)
        {
            return this.UnauthorizedError(AppMessages.Client.AuthenticationRequired);
        }

        var result = await _registrationService.CreateTeamAsync(
            userId.Value,
            request.RecruitmentOpen,
            cancellationToken
        );
        return ToTeamResult(result, StatusCodes.Status201Created);
    }

    [HttpPost("teams/{teamId:guid}/join")]
    [ProducesResponseType(typeof(ApiContracts.RegistrationTeamDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> JoinTeam(Guid teamId, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null)
        {
            return this.UnauthorizedError(AppMessages.Client.AuthenticationRequired);
        }

        var result = await _registrationService.JoinTeamAsync(userId.Value, teamId, cancellationToken);
        return ToTeamResult(result, StatusCodes.Status200OK);
    }

    [HttpPost("teams/leave")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> LeaveTeam(CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null)
        {
            return this.UnauthorizedError(AppMessages.Client.AuthenticationRequired);
        }

        var result = await _registrationService.LeaveTeamAsync(userId.Value, cancellationToken);
        if (result.Success)
        {
            return NoContent();
        }

        return GameRegistrationErrorMapping.ToActionResult(this, result.Error);
    }

    [HttpGet("teams")]
    [Authorize(Roles = AuthRoleCodes.Admin)]
    [ProducesResponseType(typeof(IReadOnlyList<ApiContracts.RegistrationTeamDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ListTeams(CancellationToken cancellationToken)
    {
        var teams = await _registrationService.ListTeamsAsync(cancellationToken);
        if (teams is null)
        {
            return NotFound(GameRegistrationErrorMapping.NotOpenResponse());
        }

        return Ok(teams.Select(team => team.ToDto()).ToArray());
    }

    [HttpPost("teams/{teamId:guid}/confirm")]
    [Authorize(Roles = AuthRoleCodes.Admin)]
    [ProducesResponseType(typeof(ApiContracts.RegistrationTeamDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ConfirmTeam(Guid teamId, CancellationToken cancellationToken)
    {
        var adminId = RequireUserId();
        if (adminId is null)
        {
            return this.UnauthorizedError(AppMessages.Client.AuthenticationRequired);
        }

        var result = await _registrationService.ConfirmTeamAsync(
            adminId.Value,
            teamId,
            cancellationToken
        );
        return ToTeamResult(result, StatusCodes.Status200OK);
    }

    [HttpPost("teams/{teamId:guid}/reject")]
    [Authorize(Roles = AuthRoleCodes.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RejectTeam(Guid teamId, CancellationToken cancellationToken)
    {
        var adminId = RequireUserId();
        if (adminId is null)
        {
            return this.UnauthorizedError(AppMessages.Client.AuthenticationRequired);
        }

        var result = await _registrationService.RejectTeamAsync(
            adminId.Value,
            teamId,
            cancellationToken
        );
        if (result.Success)
        {
            return NoContent();
        }

        return GameRegistrationErrorMapping.ToActionResult(this, result.Error);
    }

    [HttpPost("invitations")]
    [Authorize(Roles = AuthRoleCodes.Admin)]
    [ProducesResponseType(typeof(ApiContracts.RegistrationInvitationDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateInvitation(
        [FromBody] ApiContracts.CreateAdminInvitationRequestDto request,
        CancellationToken cancellationToken
    )
    {
        var adminId = RequireUserId();
        if (adminId is null)
        {
            return this.UnauthorizedError(AppMessages.Client.AuthenticationRequired);
        }

        var result = await _registrationService.CreateAdminInvitationAsync(
            adminId.Value,
            request.SlotId,
            request.InvitedUserId,
            request.TeamId,
            cancellationToken
        );
        if (result.Success && result.Value is not null)
        {
            return StatusCode(StatusCodes.Status201Created, result.Value.ToDto());
        }

        return GameRegistrationErrorMapping.ToActionResult(this, result.Error);
    }

    [HttpPost("invitations/{invitationId:guid}/accept")]
    [ProducesResponseType(typeof(ApiContracts.RegistrationTeamDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AcceptInvitation(
        Guid invitationId,
        CancellationToken cancellationToken
    )
    {
        var userId = RequireUserId();
        if (userId is null)
        {
            return this.UnauthorizedError(AppMessages.Client.AuthenticationRequired);
        }

        var result = await _registrationService.AcceptInvitationAsync(
            userId.Value,
            invitationId,
            cancellationToken
        );
        return ToTeamResult(result, StatusCodes.Status200OK);
    }

    [HttpPost("invitations/{invitationId:guid}/decline")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeclineInvitation(
        Guid invitationId,
        CancellationToken cancellationToken
    )
    {
        var userId = RequireUserId();
        if (userId is null)
        {
            return this.UnauthorizedError(AppMessages.Client.AuthenticationRequired);
        }

        var result = await _registrationService.DeclineInvitationAsync(
            userId.Value,
            invitationId,
            cancellationToken
        );
        if (result.Success)
        {
            return NoContent();
        }

        return GameRegistrationErrorMapping.ToActionResult(this, result.Error);
    }

    private Guid? RequireUserId() => HttpContext.TryGetUserId();

    private IActionResult ToTeamResult(
        AppContracts.GameRegistrationResult<AppContracts.RegistrationTeamDto> result,
        int successStatusCode
    )
    {
        if (result.Success && result.Value is not null)
        {
            return StatusCode(successStatusCode, result.Value.ToDto());
        }

        return GameRegistrationErrorMapping.ToActionResult(this, result.Error);
    }
}
