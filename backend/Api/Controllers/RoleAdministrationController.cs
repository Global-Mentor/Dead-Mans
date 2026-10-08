using System.ComponentModel.DataAnnotations;
using backend.Api.Contracts;
using backend.Api.Http;
using backend.Api.Mapping;
using backend.Application.Abstractions.Auth;
using backend.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = AuthRoleCodes.SuperAdmin)]
public sealed class RoleAdministrationController : ControllerBase
{
    private readonly IRoleAdministrationService _roleAdministrationService;

    public RoleAdministrationController(IRoleAdministrationService roleAdministrationService)
    {
        _roleAdministrationService = roleAdministrationService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(RoleAdministrationPageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUsers(
        [FromQuery, StringLength(100)] string? search = null,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 25,
        [FromQuery] bool? isActive = null,
        [FromQuery] bool? hasLoggedIn = null,
        [FromQuery, RegularExpression("^(moderator|admin|superadmin)$")] string? role = null,
        [FromQuery, Range(1, 365)] int? registeredWithinDays = null,
        [FromQuery, RegularExpression("^(createdDesc|createdAsc|lastLoginDesc|lastLoginAsc|nameAsc|nameDesc|roleAsc|roleDesc)$")] string sort = "lastLoginDesc",
        CancellationToken cancellationToken = default
    )
    {
        var result = await _roleAdministrationService.GetUsersAsync(
            search,
            page,
            pageSize,
            new RoleAdministrationFilter(isActive, hasLoggedIn, role, registeredWithinDays, sort),
            cancellationToken
        );
        return Ok(result.ToDto());
    }

    [HttpPut("{userId:guid}/roles")]
    [ProducesResponseType(typeof(RoleAdministrationUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateRoles(
        Guid userId,
        [FromBody] UpdateUserRolesRequestDto? request,
        CancellationToken cancellationToken
    )
    {
        var actorUserId = HttpContext.TryGetUserId();
        if (!actorUserId.HasValue || request?.Roles is null)
        {
            return this.BadRequestError(
                AppMessages.Client.RoleAdministrationInvalidRequest,
                AppMessages.ErrorCodes.RoleAdministrationInvalidRequest
            );
        }

        var result = await _roleAdministrationService.UpdateRolesAsync(
            actorUserId.Value,
            userId,
            request.Roles.Select(ToRoleCode).ToArray(),
            cancellationToken
        );
        return result.Outcome switch
        {
            UpdateUserRolesOutcome.Updated when result.User is not null => Ok(result.User.ToDto()),
            UpdateUserRolesOutcome.UserNotFound => this.NotFoundError(
                AppMessages.Client.RoleAdministrationUserNotFound,
                AppMessages.ErrorCodes.RoleAdministrationUserNotFound
            ),
            UpdateUserRolesOutcome.PermanentSuperAdminProtected => this.ConflictError(
                AppMessages.Client.PermanentSuperAdminProtected,
                AppMessages.ErrorCodes.PermanentSuperAdminProtected
            ),
            _ => this.BadRequestError(
                AppMessages.Client.RoleAdministrationInvalidRequest,
                AppMessages.ErrorCodes.RoleAdministrationInvalidRequest
            )
        };
    }

    [HttpPut("{userId:guid}/access")]
    [ProducesResponseType(typeof(RoleAdministrationUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateAccess(
        Guid userId,
        [FromBody] UpdateUserAccessRequestDto? request,
        CancellationToken cancellationToken
    )
    {
        var actorUserId = HttpContext.TryGetUserId();
        if (!actorUserId.HasValue || request?.IsActive is not { } isActive)
        {
            return this.BadRequestError(
                AppMessages.Client.UserAccessInvalidRequest,
                AppMessages.ErrorCodes.RoleAdministrationInvalidRequest
            );
        }
        var result = await _roleAdministrationService.UpdateAccessAsync(
            actorUserId.Value, userId, isActive, cancellationToken
        );
        return result.Outcome switch
        {
            UpdateUserAccessOutcome.Updated when result.User is not null => Ok(result.User.ToDto()),
            UpdateUserAccessOutcome.UserNotFound => this.NotFoundError(
                AppMessages.Client.RoleAdministrationUserNotFound,
                AppMessages.ErrorCodes.RoleAdministrationUserNotFound
            ),
            UpdateUserAccessOutcome.PermanentSuperAdminProtected => this.ConflictError(
                AppMessages.Client.PermanentSuperAdminAccessProtected,
                AppMessages.ErrorCodes.PermanentSuperAdminProtected
            ),
            UpdateUserAccessOutcome.SelfBlockProtected => this.ConflictError(
                AppMessages.Client.SelfBlockProtected,
                AppMessages.ErrorCodes.SelfBlockProtected
            ),
            _ => throw new InvalidOperationException("Unexpected account access result.")
        };
    }

    private static string ToRoleCode(AuthRole role)
    {
        return role switch
        {
            AuthRole.SuperAdmin => AuthRoleCodes.SuperAdmin,
            AuthRole.Admin => AuthRoleCodes.Admin,
            AuthRole.Moderator => AuthRoleCodes.Moderator,
            AuthRole.Viewer => AuthRoleCodes.Viewer,
            _ => string.Empty
        };
    }
}
