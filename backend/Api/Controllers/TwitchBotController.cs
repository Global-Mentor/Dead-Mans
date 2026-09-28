using backend.Api.Http;
using backend.Application.Abstractions;
using backend.Application.Abstractions.Auth;
using backend.Application.Configuration;
using backend.Application.Contracts;
using backend.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;

namespace backend.Controllers;

[ApiController]
[Route("api/integrations/twitch")]
[Authorize]
public sealed class TwitchBotController : ControllerBase
{
    private readonly ITwitchBotService _service;
    private readonly TwitchBotOptions _options;

    public TwitchBotController(
        ITwitchBotService service,
        IOptions<TwitchBotOptions> options)
    { _service = service; _options = options.Value; }

    [HttpGet("status")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    public async Task<IActionResult> GetStatus(CancellationToken cancellationToken) =>
        Ok(await _service.GetStatusAsync(cancellationToken));

    [HttpGet("oauth/{role}")]
    [Authorize(Roles = AuthRoleCodes.AdminOrSuperAdmin)]
    public IActionResult Connect(string role)
    {
        if (!_options.Enabled) return NotFound();
        var userId = HttpContext.TryGetUserId();
        if (!userId.HasValue || role is not ("bot" or "broadcaster")) return BadRequest();
        var state = _service.CreateAuthorizationState(role, userId.Value);
        return Redirect(_service.BuildAuthorizationUrl(role, state));
    }

    [HttpGet("oauth/callback")]
    [Authorize(Roles = AuthRoleCodes.AdminOrSuperAdmin)]
    public async Task<IActionResult> OAuthCallback([FromQuery] string? code, [FromQuery] string? state, CancellationToken cancellationToken)
    {
        if (!_options.Enabled) return NotFound();
        var userId = HttpContext.TryGetUserId();
        if (!userId.HasValue || string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state)) return BadRequest();
        try
        {
            await _service.CompleteAuthorizationAsync(code, state, userId.Value, cancellationToken);
        }
        catch (CryptographicException) { return OAuthFailure(); }
        catch (InvalidOperationException) { return OAuthFailure(); }
        catch (HttpRequestException) { return OAuthFailure(); }
        catch (System.Text.Json.JsonException) { return OAuthFailure(); }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested) { return OAuthFailure(); }
        return Redirect(_options.FrontendRedirectUrl);
    }

    private IActionResult OAuthFailure() => this.BadRequestError(
        "Twitch connection failed. Start a new authorization from the bot connection panel, choose the configured account and grant all requested permissions.",
        "twitch_bot.oauth_failed");

    [HttpPost("quiz/questions/prepare")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    public async Task<IActionResult> Prepare([FromBody] PrepareTwitchQuestionRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.PrepareQuestionAsync(request.QuestionId, cancellationToken);
        return result.Outcome == PrepareTwitchQuizQuestionOutcome.Prepared
            ? Accepted(result)
            : result.Outcome is PrepareTwitchQuizQuestionOutcome.PublicationInProgress or PrepareTwitchQuizQuestionOutcome.PendingOutcome or PrepareTwitchQuizQuestionOutcome.ModifierOrderingActive
                ? this.ConflictError(GetPreparationMessage(result.Outcome), GetPreparationCode(result.Outcome))
                : result.Outcome is PrepareTwitchQuizQuestionOutcome.NoActiveGame or PrepareTwitchQuizQuestionOutcome.NoAvailableQuestions
                    ? this.NotFoundError(GetPreparationMessage(result.Outcome), GetPreparationCode(result.Outcome))
                    : this.BadRequestError(GetPreparationMessage(result.Outcome), result.ErrorCode ?? GetPreparationCode(result.Outcome));
    }

    [HttpPost("quiz/publications/{publicationId:guid}/retry")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    public async Task<IActionResult> Retry(Guid publicationId, CancellationToken cancellationToken) =>
        !_options.Enabled ? NotFound()
        : await _service.RetryPublicationAsync(publicationId, cancellationToken) is { } state ? Ok(state) : NotFound();

    [HttpPost("quiz/publications/{publicationId:guid}/cancel")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    public async Task<IActionResult> Cancel(Guid publicationId, CancellationToken cancellationToken) =>
        !_options.Enabled ? NotFound()
        : await _service.CancelPublicationAsync(publicationId, cancellationToken) is { } state ? Ok(state) : NotFound();

    [HttpPost("quiz/publications/{publicationId:guid}/skip-outcome")]
    [Authorize(Roles = AuthRoleCodes.ModeratorOrAdmin)]
    public async Task<IActionResult> SkipOutcome(Guid publicationId, CancellationToken cancellationToken) =>
        !_options.Enabled ? NotFound()
        : await _service.SkipOutcomeAsync(publicationId, cancellationToken) is { } state ? Ok(state) : NotFound();

    internal static string GetPreparationCode(PrepareTwitchQuizQuestionOutcome outcome) => outcome switch
    {
        PrepareTwitchQuizQuestionOutcome.Disabled => AppMessages.ErrorCodes.TwitchBotDisabled,
        PrepareTwitchQuizQuestionOutcome.NotConnected => AppMessages.ErrorCodes.TwitchBotNotConnected,
        PrepareTwitchQuizQuestionOutcome.NoActiveGame => AppMessages.ErrorCodes.GameQuizNoActiveGame,
        PrepareTwitchQuizQuestionOutcome.NoAvailableQuestions => AppMessages.ErrorCodes.GameQuizNoAvailableQuestions,
        PrepareTwitchQuizQuestionOutcome.ModifierOrderingActive => AppMessages.ErrorCodes.GameQuizModifierOrderingActive,
        PrepareTwitchQuizQuestionOutcome.PublicationInProgress => AppMessages.ErrorCodes.TwitchQuizPublicationInProgress,
        PrepareTwitchQuizQuestionOutcome.PendingOutcome => AppMessages.ErrorCodes.TwitchQuizPendingOutcome,
        PrepareTwitchQuizQuestionOutcome.IncompatibleQuestion => AppMessages.ErrorCodes.TwitchQuizIncompatibleQuestion,
        _ => AppMessages.ErrorCodes.TwitchQuizPublicationInProgress
    };

    internal static string GetPreparationMessage(PrepareTwitchQuizQuestionOutcome outcome) => outcome switch
    {
        PrepareTwitchQuizQuestionOutcome.Disabled => AppMessages.Client.TwitchBotDisabled,
        PrepareTwitchQuizQuestionOutcome.NotConnected => AppMessages.Client.TwitchBotNotConnected,
        PrepareTwitchQuizQuestionOutcome.NoActiveGame => AppMessages.Client.GameQuizNoActiveGame,
        PrepareTwitchQuizQuestionOutcome.NoAvailableQuestions => AppMessages.Client.GameQuizNoAvailableQuestions,
        PrepareTwitchQuizQuestionOutcome.ModifierOrderingActive => AppMessages.Client.GameQuizModifierOrderingActive,
        PrepareTwitchQuizQuestionOutcome.PublicationInProgress => AppMessages.Client.TwitchQuizPublicationInProgress,
        PrepareTwitchQuizQuestionOutcome.PendingOutcome => AppMessages.Client.TwitchQuizPendingOutcome,
        PrepareTwitchQuizQuestionOutcome.IncompatibleQuestion => AppMessages.Client.TwitchQuizIncompatibleQuestion,
        _ => AppMessages.Client.UnexpectedServerError
    };
}

public sealed record PrepareTwitchQuestionRequest(Guid? QuestionId);
