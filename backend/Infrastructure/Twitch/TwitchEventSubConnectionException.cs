using System.Net;

namespace backend.Infrastructure.Twitch;

internal sealed class TwitchEventSubConnectionException(string code, HttpStatusCode status, TimeSpan? retryAfter = null)
    : HttpRequestException("Twitch EventSub connection failed: " + code, null, status)
{
    public string Code { get; } = code;
    public TimeSpan? RetryAfter { get; } = retryAfter;
}
