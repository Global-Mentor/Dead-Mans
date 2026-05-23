using System.Security.Claims;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Api.Mapping;
using backend.Infrastructure.Auth;
using backend.Messaging;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("auth")]
public sealed class AuthSessionController : ControllerBase
{
    private readonly IAuthSessionService _authSessionService;
    private readonly ILogger<AuthSessionController> _logger;

    public AuthSessionController(
        IAuthSessionService authSessionService,
        ILogger<AuthSessionController> logger
    )
    {
        _authSessionService = authSessionService;
        _logger = logger;
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(AuthSessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId) || !Guid.TryParse(userId, out var parsedUserId))
        {
            _logger.LogWarning(AppMessages.Logs.AuthSessionMissingClaim);
            return Unauthorized(new ErrorResponse(AppMessages.Client.AuthCookieMissingClaims));
        }

        var session = await _authSessionService.GetSessionAsync(parsedUserId, HttpContext.RequestAborted);
        if (session is null)
        {
            _logger.LogWarning(AppMessages.Logs.AuthSessionUserGone, parsedUserId);
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Unauthorized(new ErrorResponse(AppMessages.Client.UserMissingOrInactive));
        }

        return Ok(session.ToDto());
    }

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Logout()
    {
        if (!IsApiClientRequest())
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new ErrorResponse(AppMessages.Client.LogoutRequiresApiClientHeader)
            );
        }

        _logger.LogInformation(AppMessages.Logs.UserSignedOut);
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    private bool IsApiClientRequest()
    {
        return Request.Headers.TryGetValue(AuthRequestHeaders.ApiClient, out var values)
            && values.Any(value => string.Equals(value, AuthRequestHeaders.ApiClientValue, StringComparison.Ordinal));
    }
}
