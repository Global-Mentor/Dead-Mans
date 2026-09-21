using System.Globalization;
using System.Text;
using System.Text.Json;
using backend.Application.Abstractions;
using backend.Application.Configuration;
using backend.Application.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace backend.Controllers;

[ApiController]
[Route("api/integrations/twitch/eventsub")]
[AllowAnonymous]
public sealed class TwitchEventSubController : ControllerBase
{
    private readonly ITwitchBotService _service;
    private readonly TwitchBotOptions _options;
    private readonly TimeProvider _clock;
    public TwitchEventSubController(ITwitchBotService service, IOptions<TwitchBotOptions> options, TimeProvider clock)
    { _service = service; _options = options.Value; _clock = clock; }

    [HttpPost]
    [Consumes("application/json")]
    [RequestSizeLimit(256 * 1024)]
    public async Task<IActionResult> Receive(CancellationToken cancellationToken)
    {
        if (!_options.Enabled) return NotFound();
        using var memory = new MemoryStream();
        await Request.Body.CopyToAsync(memory, cancellationToken);
        var body = memory.ToArray();
        if (!TryHeader("Twitch-Eventsub-Message-Id", out var notificationId)
            || !TryHeader("Twitch-Eventsub-Message-Timestamp", out var timestampText)
            || !TryHeader("Twitch-Eventsub-Message-Signature", out var signature)
            || !TryHeader("Twitch-Eventsub-Message-Type", out var messageType)
            || !DateTime.TryParse(timestampText, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var timestamp)
            || Math.Abs((_clock.GetUtcNow().UtcDateTime - timestamp).TotalMinutes) > 10
            || !TwitchEventSubSignatureVerifier.Verify(notificationId, timestampText, body, signature, _options.WebhookSecret))
            return Unauthorized();

        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;
        var subscription = root.GetProperty("subscription");
        var subscriptionType = subscription.GetProperty("type").GetString() ?? string.Empty;
        if (subscriptionType != "channel.chat.message") return Unauthorized();
        var condition = subscription.GetProperty("condition");
        if (condition.GetProperty("broadcaster_user_id").GetString() != _options.ExpectedBroadcasterUserId
            || condition.GetProperty("user_id").GetString() != _options.ExpectedBotUserId)
            return Unauthorized();
        if (messageType == "webhook_callback_verification")
        {
            return Content(root.GetProperty("challenge").GetString() ?? string.Empty, "text/plain", Encoding.UTF8);
        }
        if (messageType == "revocation")
        {
            await _service.HandleRevocationAsync(subscriptionType, subscription.GetProperty("status").GetString() ?? "unknown", cancellationToken);
            return NoContent();
        }
        if (messageType != "notification" || subscriptionType != "channel.chat.message") return NoContent();
        var evt = root.GetProperty("event");
        await _service.HandleChatMessageAsync(new TwitchEventSubMessage(
            notificationId, timestamp, subscriptionType,
            evt.GetProperty("broadcaster_user_id").GetString() ?? string.Empty,
            evt.GetProperty("chatter_user_id").GetString() ?? string.Empty,
            evt.GetProperty("chatter_user_login").GetString() ?? string.Empty,
            evt.GetProperty("chatter_user_name").GetString() ?? string.Empty,
            evt.GetProperty("message_id").GetString() ?? string.Empty,
            evt.GetProperty("message").GetProperty("text").GetString() ?? string.Empty,
            evt.TryGetProperty("source_broadcaster_user_id", out var source) ? source.GetString() : null), cancellationToken);
        return NoContent();
    }

    private bool TryHeader(string name, out string value)
    {
        var values = Request.Headers[name];
        if (values.Count != 1)
        {
            value = string.Empty;
            return false;
        }
        value = values[0] ?? string.Empty;
        return value.Length is > 0 and <= 512;
    }
}
