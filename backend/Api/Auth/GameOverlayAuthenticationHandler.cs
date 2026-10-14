using System.Security.Claims;
using System.Text.Encodings.Web;
using backend.Application.Abstractions;
using backend.Api.Contracts;
using backend.Messaging;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace backend.Api.Auth;

public sealed class GameOverlayAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IGameOverlayService service
) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "GameOverlay";

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.Headers.CacheControl = "no-store";
        return ErrorResponseFactory.WriteAsync(Response, StatusCodes.Status401Unauthorized,
            AppMessages.Client.AuthenticationRequired);
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Overlay-Key", out var values) || values.Count != 1)
        {
            return AuthenticateResult.NoResult();
        }

        if (!await service.ValidateKeyAsync(values[0] ?? string.Empty, Context.RequestAborted))
        {
            return AuthenticateResult.Fail("Invalid overlay key.");
        }

        // This identity has no account ID or role; only overlay endpoints accept this scheme.
        var identity = new ClaimsIdentity(SchemeName);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName));
    }
}
