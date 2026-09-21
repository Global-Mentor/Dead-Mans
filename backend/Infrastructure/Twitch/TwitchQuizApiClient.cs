using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using backend.Application.Configuration;
using backend.Data;
using backend.Data.Entities;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Infrastructure.Twitch;

internal enum TwitchChatSendOutcome { Sent, NotSent, Uncertain, Failed }
internal sealed record TwitchChatSendResult(TwitchChatSendOutcome Outcome, string? MessageId = null, string? Error = null);
internal sealed record TwitchOAuthIdentity(string Id, string Login, string DisplayName);
internal sealed record TwitchOAuthGrant(string AccessToken, string RefreshToken, int ExpiresIn, string[] Scopes, TwitchOAuthIdentity Identity);

internal sealed class TwitchQuizApiClient
{
    private static readonly SemaphoreSlim RefreshLock = new(1, 1);
    private readonly HttpClient _httpClient;
    private readonly TwitchQuizOptions _options;
    private readonly ApplicationDbContext _db;
    private readonly IDataProtector _protector;
    private readonly TimeProvider _clock;
    private readonly TwitchApplicationTokenCache _appTokens;

    public TwitchQuizApiClient(
        HttpClient httpClient,
        IOptions<TwitchQuizOptions> options,
        ApplicationDbContext db,
        IDataProtectionProvider dataProtectionProvider,
        TimeProvider clock,
        TwitchApplicationTokenCache appTokens)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _db = db;
        _protector = dataProtectionProvider.CreateProtector("DeadMans.TwitchQuiz.Tokens.v1");
        _clock = clock;
        _appTokens = appTokens;
    }

    public async Task<TwitchOAuthGrant> ExchangeCodeAsync(string code, CancellationToken cancellationToken)
    {
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["code"] = code,
            ["grant_type"] = "authorization_code",
            ["redirect_uri"] = _options.OAuthCallbackUrl
        });
        using var response = await _httpClient.PostAsync($"{_options.OAuthBaseUrl.TrimEnd('/')}/oauth2/token", content, cancellationToken);
        response.EnsureSuccessStatusCode();
        var token = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken)
            ?? throw new InvalidOperationException("Twitch returned an empty token response.");
        if (string.IsNullOrWhiteSpace(token.AccessToken) || string.IsNullOrWhiteSpace(token.RefreshToken) || token.ExpiresIn <= 0)
            throw new InvalidOperationException("Twitch returned an invalid token response.");
        var identity = await GetIdentityAsync(token.AccessToken, cancellationToken);
        return new(token.AccessToken, token.RefreshToken, token.ExpiresIn, token.Scope ?? [], identity);
    }

    public async Task SaveGrantAsync(string role, TwitchOAuthGrant grant, CancellationToken cancellationToken)
    {
        var row = await _db.TwitchQuizConnections.SingleOrDefaultAsync(x => x.Role == role, cancellationToken);
        if (row is null)
        {
            row = new TwitchQuizConnection { Role = role };
            _db.Add(row);
        }
        row.TwitchUserId = grant.Identity.Id;
        row.Login = grant.Identity.Login;
        row.DisplayName = grant.Identity.DisplayName;
        row.ProtectedAccessToken = _protector.Protect(grant.AccessToken);
        row.ProtectedRefreshToken = _protector.Protect(grant.RefreshToken);
        row.Scopes = grant.Scopes;
        row.ExpiresAtUtc = _clock.GetUtcNow().UtcDateTime.AddSeconds(Math.Max(30, grant.ExpiresIn));
        row.UpdatedAtUtc = _clock.GetUtcNow().UtcDateTime;
        row.RevokedAtUtc = null;
        row.LastError = null;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<TwitchChatSendResult> SendChatMessageAsync(string message, CancellationToken cancellationToken)
    {
        string appToken;
        try
        {
            if (await GetValidConnectionAsync("bot", cancellationToken) is null)
                return new(TwitchChatSendOutcome.Failed, Error: "Bot OAuth connection is unavailable.");
            if (await GetValidConnectionAsync("broadcaster", cancellationToken) is null)
                return new(TwitchChatSendOutcome.Failed, Error: "Broadcaster OAuth connection is unavailable.");
            appToken = await GetApplicationTokenAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is HttpRequestException or JsonException or InvalidOperationException
            || exception is OperationCanceledException && !cancellationToken.IsCancellationRequested)
        {
            return new(TwitchChatSendOutcome.Failed, Error: "Twitch authorization is temporarily unavailable. No chat message was sent.");
        }
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_options.ApiBaseUrl.TrimEnd('/')}/helix/chat/messages");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", appToken);
        request.Headers.Add("Client-Id", _options.ClientId);
        request.Content = JsonContent.Create(new
        {
            broadcaster_id = _options.ExpectedBroadcasterUserId,
            sender_id = _options.ExpectedBotUserId,
            message,
            for_source_only = true
        });
        try
        {
            using var response = await _httpClient.SendAsync(request, cancellationToken);
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                return new(TwitchChatSendOutcome.Failed, Error: "Twitch rate limit (429). Retry after the advertised reset time.");
            }
            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == HttpStatusCode.Unauthorized)
                    await _appTokens.InvalidateAsync(appToken, cancellationToken);
                var error = await ReadTwitchErrorAsync(response, cancellationToken);
                return new((int)response.StatusCode >= 500 ? TwitchChatSendOutcome.Uncertain : TwitchChatSendOutcome.Failed, Error:
                    $"Twitch Send Chat Message failed with HTTP {(int)response.StatusCode}{(error is null ? "." : $": {error}")}");
            }
            var payload = await response.Content.ReadFromJsonAsync<SendMessageResponse>(cancellationToken);
            var result = payload?.Data is { Count: 1 } ? payload.Data[0] : null;
            if (result?.IsSent == false)
                return new(TwitchChatSendOutcome.NotSent, Error: result.DropReason?.Message ?? "Twitch returned is_sent=false.");
            return result?.IsSent == true && !string.IsNullOrWhiteSpace(result.MessageId)
                ? new(TwitchChatSendOutcome.Sent, result.MessageId)
                : new(TwitchChatSendOutcome.Uncertain, Error: "Twitch returned an incomplete delivery receipt; delivery is unknown.");
        }
        catch (JsonException)
        {
            return new(TwitchChatSendOutcome.Uncertain, Error: "Twitch returned an invalid delivery receipt; delivery is unknown.");
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return new(TwitchChatSendOutcome.Uncertain, Error: "Twitch request timed out; delivery is unknown.");
        }
        catch (HttpRequestException exception)
        {
            return new(TwitchChatSendOutcome.Uncertain, Error: $"Twitch transport failed; delivery is unknown: {exception.Message}");
        }
    }

    public async Task<bool> EnsureEventSubSubscriptionAsync(CancellationToken cancellationToken)
    {
        var bot = await GetValidConnectionAsync("bot", cancellationToken);
        var broadcaster = await GetValidConnectionAsync("broadcaster", cancellationToken);
        if (bot is null || broadcaster is null) return false;
        var botValid = await ValidateConnectionAsync(bot.Value, TwitchQuizOptions.BotScopes, cancellationToken);
        var broadcasterValid = await ValidateConnectionAsync(broadcaster.Value, TwitchQuizOptions.BroadcasterScopes, cancellationToken);
        if (!botValid || !broadcasterValid) return false;

        var appToken = await GetApplicationTokenAsync(cancellationToken);
        string? cursor = null;
        var pending = false;
        do
        {
            var url = $"{_options.ApiBaseUrl.TrimEnd('/')}/helix/eventsub/subscriptions?type=channel.chat.message";
            if (!string.IsNullOrEmpty(cursor)) url += $"&after={Uri.EscapeDataString(cursor)}";
            using var listRequest = new HttpRequestMessage(HttpMethod.Get, url);
            listRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", appToken);
            listRequest.Headers.Add("Client-Id", _options.ClientId);
            using var listResponse = await _httpClient.SendAsync(listRequest, cancellationToken);
            if (listResponse.StatusCode == HttpStatusCode.Unauthorized)
                await _appTokens.InvalidateAsync(appToken, cancellationToken);
            listResponse.EnsureSuccessStatusCode();
            var existing = await listResponse.Content.ReadFromJsonAsync<EventSubListResponse>(cancellationToken)
                ?? throw new InvalidOperationException("Twitch subscription list is empty.");
            var matching = existing.Data?.Where(x =>
                    x.Type == "channel.chat.message"
                    && x.Condition?.BroadcasterUserId == _options.ExpectedBroadcasterUserId
                    && x.Condition?.UserId == _options.ExpectedBotUserId
                    && x.Transport?.Callback == _options.WebhookCallbackUrl).ToArray() ?? [];
            if (matching.Any(x => x.Status == "enabled")) return true;
            pending |= matching.Any(x => x.Status == "webhook_callback_verification_pending");
            var nextCursor = existing.Pagination?.Cursor;
            if (!string.IsNullOrEmpty(nextCursor) && nextCursor == cursor)
                throw new InvalidOperationException("Twitch repeated the subscription page cursor.");
            cursor = nextCursor;
        } while (!string.IsNullOrEmpty(cursor));
        if (pending) return false;
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_options.ApiBaseUrl.TrimEnd('/')}/helix/eventsub/subscriptions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", appToken);
        request.Headers.Add("Client-Id", _options.ClientId);
        request.Content = JsonContent.Create(new
        {
            type = "channel.chat.message",
            version = "1",
            condition = new
            {
                broadcaster_user_id = _options.ExpectedBroadcasterUserId,
                user_id = _options.ExpectedBotUserId
            },
            transport = new
            {
                method = "webhook",
                callback = _options.WebhookCallbackUrl,
                secret = _options.WebhookSecret
            }
        });
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode && response.StatusCode != HttpStatusCode.Conflict)
            response.EnsureSuccessStatusCode();
        return false;
    }

    private async Task<(TwitchQuizConnection Row, string AccessToken)?> GetValidConnectionAsync(string role, CancellationToken cancellationToken)
    {
        var row = await _db.TwitchQuizConnections.SingleOrDefaultAsync(x => x.Role == role && x.RevokedAtUtc == null, cancellationToken);
        if (row is null) return null;
        var expectedId = role == "bot" ? _options.ExpectedBotUserId : _options.ExpectedBroadcasterUserId;
        var requiredScopes = role == "bot" ? TwitchQuizOptions.BotScopes : TwitchQuizOptions.BroadcasterScopes;
        if (row.TwitchUserId != expectedId || requiredScopes.Except(row.Scopes, StringComparer.Ordinal).Any()) return null;
        if (row.ExpiresAtUtc > _clock.GetUtcNow().UtcDateTime.AddMinutes(2))
        {
            return (row, _protector.Unprotect(row.ProtectedAccessToken));
        }

        await RefreshLock.WaitAsync(cancellationToken);
        try
        {
            await _db.Entry(row).ReloadAsync(cancellationToken);
            if (row.RevokedAtUtc is not null) return null;
            if (row.ExpiresAtUtc > _clock.GetUtcNow().UtcDateTime.AddMinutes(2))
                return (row, _protector.Unprotect(row.ProtectedAccessToken));
            using var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = _options.ClientId,
                ["client_secret"] = _options.ClientSecret,
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = _protector.Unprotect(row.ProtectedRefreshToken)
            });
            using var response = await _httpClient.PostAsync($"{_options.OAuthBaseUrl.TrimEnd('/')}/oauth2/token", content, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.Unauthorized)
                    row.RevokedAtUtc = _clock.GetUtcNow().UtcDateTime;
                row.LastError = $"Token refresh failed with HTTP {(int)response.StatusCode}.";
                await _db.SaveChangesAsync(cancellationToken);
                return null;
            }
            var token = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken)
                ?? throw new InvalidOperationException("Twitch returned an empty refresh response.");
            if (string.IsNullOrWhiteSpace(token.AccessToken) || token.ExpiresIn <= 0)
                throw new InvalidOperationException("Twitch returned an invalid refresh response.");
            row.ProtectedAccessToken = _protector.Protect(token.AccessToken);
            if (!string.IsNullOrWhiteSpace(token.RefreshToken)) row.ProtectedRefreshToken = _protector.Protect(token.RefreshToken);
            row.ExpiresAtUtc = _clock.GetUtcNow().UtcDateTime.AddSeconds(Math.Max(30, token.ExpiresIn));
            row.Scopes = token.Scope ?? row.Scopes;
            row.UpdatedAtUtc = _clock.GetUtcNow().UtcDateTime;
            row.LastError = null;
            await _db.SaveChangesAsync(cancellationToken);
            if (requiredScopes.Except(row.Scopes, StringComparer.Ordinal).Any()) return null;
            return (row, token.AccessToken);
        }
        finally { RefreshLock.Release(); }
    }

    private async Task<bool> ValidateConnectionAsync((TwitchQuizConnection Row, string AccessToken) connection,
        string[] requiredScopes, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{_options.OAuthBaseUrl.TrimEnd('/')}/oauth2/validate");
        request.Headers.Authorization = new AuthenticationHeaderValue("OAuth", connection.AccessToken);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var valid = false;
        if (response.StatusCode != HttpStatusCode.Unauthorized)
        {
            response.EnsureSuccessStatusCode();
            var token = await response.Content.ReadFromJsonAsync<ValidatedTokenResponse>(cancellationToken)
                ?? throw new InvalidOperationException("Twitch returned an empty token validation response.");
            valid = token.ClientId == _options.ClientId && token.UserId == connection.Row.TwitchUserId
                && token.ExpiresIn > 0 && !requiredScopes.Except(token.Scopes ?? [], StringComparer.Ordinal).Any();
        }
        if (valid) return true;
        // Transient transport/server failures throw above and never revoke a working grant.
        connection.Row.RevokedAtUtc = _clock.GetUtcNow().UtcDateTime;
        connection.Row.LastError = "Twitch authorization is no longer valid. Reconnect this account.";
        connection.Row.UpdatedAtUtc = _clock.GetUtcNow().UtcDateTime;
        await _db.SaveChangesAsync(cancellationToken);
        return false;
    }

    private async Task<TwitchOAuthIdentity> GetIdentityAsync(string accessToken, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{_options.ApiBaseUrl.TrimEnd('/')}/helix/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Headers.Add("Client-Id", _options.ClientId);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<UsersResponse>(cancellationToken);
        var user = payload?.Data?.SingleOrDefault() ?? throw new InvalidOperationException("Twitch identity response is invalid.");
        return new(user.Id, user.Login, user.DisplayName);
    }

    private Task<string> GetApplicationTokenAsync(CancellationToken cancellationToken) =>
        _appTokens.GetAsync(_clock, () => AcquireApplicationTokenAsync(cancellationToken), cancellationToken);

    private async Task<(string Token, int ExpiresIn)> AcquireApplicationTokenAsync(CancellationToken cancellationToken)
    {
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["grant_type"] = "client_credentials"
        });
        using var response = await _httpClient.PostAsync($"{_options.OAuthBaseUrl.TrimEnd('/')}/oauth2/token", content, cancellationToken);
        response.EnsureSuccessStatusCode();
        var token = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken);
        return token is null ? throw new InvalidOperationException("Twitch application token response is empty.")
            : (token.AccessToken, token.ExpiresIn);
    }

    private static async Task<string?> ReadTwitchErrorAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        try
        {
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            if (document.RootElement.ValueKind != JsonValueKind.Object
                || !document.RootElement.TryGetProperty("message", out var messageElement)
                || messageElement.ValueKind != JsonValueKind.String) return null;
            var message = messageElement.GetString()?.Trim();
            return string.IsNullOrWhiteSpace(message) ? null : message[..Math.Min(message.Length, 300)];
        }
        catch (JsonException) { return null; }
    }

    private sealed class TokenResponse
    {
        [JsonPropertyName("access_token")] public string AccessToken { get; set; } = string.Empty;
        [JsonPropertyName("refresh_token")] public string RefreshToken { get; set; } = string.Empty;
        [JsonPropertyName("expires_in")] public int ExpiresIn { get; set; }
        [JsonPropertyName("scope")] public string[]? Scope { get; set; }
    }
    private sealed class ValidatedTokenResponse
    {
        [JsonPropertyName("client_id")] public string? ClientId { get; set; }
        [JsonPropertyName("user_id")] public string? UserId { get; set; }
        [JsonPropertyName("scopes")] public string[]? Scopes { get; set; }
        [JsonPropertyName("expires_in")] public int ExpiresIn { get; set; }
    }
    private sealed class UsersResponse { [JsonPropertyName("data")] public List<UserResponse>? Data { get; set; } }
    private sealed class UserResponse
    {
        [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
        [JsonPropertyName("login")] public string Login { get; set; } = string.Empty;
        [JsonPropertyName("display_name")] public string DisplayName { get; set; } = string.Empty;
    }
    private sealed class SendMessageResponse { [JsonPropertyName("data")] public List<SendMessageResult>? Data { get; set; } }
    private sealed class EventSubListResponse
    {
        [JsonPropertyName("data")] public List<EventSubItem>? Data { get; set; }
        [JsonPropertyName("pagination")] public EventSubPagination? Pagination { get; set; }
    }
    private sealed class EventSubPagination { [JsonPropertyName("cursor")] public string? Cursor { get; set; } }
    private sealed class EventSubItem
    {
        [JsonPropertyName("type")] public string? Type { get; set; }
        [JsonPropertyName("status")] public string? Status { get; set; }
        [JsonPropertyName("condition")] public EventSubCondition? Condition { get; set; }
        [JsonPropertyName("transport")] public EventSubTransport? Transport { get; set; }
    }
    private sealed class EventSubCondition
    {
        [JsonPropertyName("broadcaster_user_id")] public string? BroadcasterUserId { get; set; }
        [JsonPropertyName("user_id")] public string? UserId { get; set; }
    }
    private sealed class EventSubTransport { [JsonPropertyName("callback")] public string? Callback { get; set; } }
    private sealed class SendMessageResult
    {
        [JsonPropertyName("message_id")] public string? MessageId { get; set; }
        [JsonPropertyName("is_sent")] public bool? IsSent { get; set; }
        [JsonPropertyName("drop_reason")] public DropReason? DropReason { get; set; }
    }
    private sealed class DropReason { [JsonPropertyName("message")] public string? Message { get; set; } }
}
