using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Application.Configuration;
using backend.Data;
using backend.Infrastructure.Twitch;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Tests.Unit.Infrastructure;

public sealed class TwitchBotApiClientTests
{
    [Fact]
    public async Task Send_UsesAppTokenAndSourceOnly_AndReusesTokenAcrossMessages()
    {
        using var fixture = new Fixture();
        await fixture.ConnectAsync();
        var tokenCalls = 0;
        fixture.Handler.Handle = async request =>
        {
            if (request.RequestUri!.AbsolutePath == "/oauth2/token")
            {
                tokenCalls++;
                Assert.Contains("grant_type=client_credentials", await request.Content!.ReadAsStringAsync());
                return Token();
            }
            Assert.Equal("/helix/chat/messages", request.RequestUri.AbsolutePath);
            Assert.Equal("app-token", request.Headers.Authorization?.Parameter);
            using var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync());
            Assert.True(body.RootElement.GetProperty("for_source_only").GetBoolean());
            Assert.Equal("100001", body.RootElement.GetProperty("sender_id").GetString());
            Assert.Equal("200001", body.RootElement.GetProperty("broadcaster_id").GetString());
            return Sent();
        };
        Assert.Equal(TwitchChatSendOutcome.Sent, (await fixture.Client.SendChatMessageAsync("Question", default)).Outcome);
        Assert.Equal(TwitchChatSendOutcome.Sent, (await fixture.Client.SendChatMessageAsync("Options", default)).Outcome);
        Assert.Equal(1, tokenCalls);
    }

    [Theory]
    [InlineData(400, "Failed")]
    [InlineData(403, "Failed")]
    [InlineData(429, "Failed")]
    [InlineData(500, "Uncertain")]
    [InlineData(503, "Uncertain")]
    public async Task Send_ClassifiesRejectionAndAmbiguousServerFailure(int status, string expected)
    {
        using var fixture = new Fixture();
        await fixture.ConnectAsync();
        fixture.Handler.Handle = request => Task.FromResult(request.RequestUri!.AbsolutePath == "/oauth2/token"
            ? Token() : Json(new { message = "Rejected" }, (HttpStatusCode)status));
        Assert.Equal(expected, (await fixture.Client.SendChatMessageAsync("Question", default)).Outcome.ToString());
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"data\":[{\"is_sent\":true}]}")]
    [InlineData("{\"data\":[{\"message_id\":\"x\"}]}")]
    [InlineData("not-json")]
    public async Task Send_MalformedReceiptIsUncertain(string receipt)
    {
        using var fixture = new Fixture();
        await fixture.ConnectAsync();
        fixture.Handler.Handle = request => Task.FromResult(request.RequestUri!.AbsolutePath == "/oauth2/token"
            ? Token() : new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(receipt) });
        Assert.Equal(TwitchChatSendOutcome.Uncertain, (await fixture.Client.SendChatMessageAsync("Question", default)).Outcome);
    }

    [Fact]
    public async Task Send_AuthorizationOutageDoesNotSendOrRevokeGrant()
    {
        using var fixture = new Fixture();
        await fixture.ConnectAsync();
        var bot = await fixture.Db.TwitchQuizConnections.SingleAsync(x => x.Role == "bot");
        bot.ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1);
        await fixture.Db.SaveChangesAsync();
        fixture.Handler.Handle = request =>
        {
            Assert.Equal("/oauth2/token", request.RequestUri!.AbsolutePath);
            return Task.FromResult(Json(new { message = "Temporary outage" }, HttpStatusCode.ServiceUnavailable));
        };
        Assert.Equal(TwitchChatSendOutcome.Failed, (await fixture.Client.SendChatMessageAsync("Question", default)).Outcome);
        Assert.Null(bot.RevokedAtUtc);
    }

    [Fact]
    public async Task Send_TokenFailureBeforeChatRequestIsConfirmedFailure()
    {
        using var fixture = new Fixture();
        await fixture.ConnectAsync();
        fixture.Handler.Handle = request => throw new HttpRequestException("offline");
        Assert.Equal(TwitchChatSendOutcome.Failed, (await fixture.Client.SendChatMessageAsync("Question", default)).Outcome);
    }

    [Fact]
    public async Task Subscription_FindsEnabledAfterFailedRecordAndAcrossPages()
    {
        using var fixture = new Fixture();
        await fixture.ConnectAsync();
        fixture.Handler.Handle = request =>
        {
            if (request.RequestUri!.AbsolutePath == "/oauth2/token") return Task.FromResult(Token());
            if (request.RequestUri.AbsolutePath == "/oauth2/validate") return Task.FromResult(ValidGrant(request));
            Assert.Equal(HttpMethod.Get, request.Method);
            var secondPage = request.RequestUri.Query.Contains("after=next");
            return Task.FromResult(Json(new
            {
                data = new[] { new { type = "channel.chat.message",
                    status = secondPage ? "enabled" : "webhook_callback_verification_failed",
                    condition = new { broadcaster_user_id = "200001", user_id = "100001" },
                    transport = new { callback = "https://example.test/webhook" } } },
                pagination = new { cursor = secondPage ? null : "next" }
            }));
        };
        Assert.True(await fixture.Client.EnsureEventSubSubscriptionAsync(default));
    }

    [Fact]
    public async Task Subscription_ListFailureDoesNotCreateSubscription()
    {
        using var fixture = new Fixture();
        await fixture.ConnectAsync();
        fixture.Handler.Handle = request =>
        {
            if (request.RequestUri!.AbsolutePath == "/oauth2/token") return Task.FromResult(Token());
            if (request.RequestUri.AbsolutePath == "/oauth2/validate") return Task.FromResult(ValidGrant(request));
            Assert.Equal(HttpMethod.Get, request.Method);
            return Task.FromResult(Json(new { message = "Unavailable" }, HttpStatusCode.ServiceUnavailable));
        };
        await Assert.ThrowsAsync<HttpRequestException>(() => fixture.Client.EnsureEventSubSubscriptionAsync(default));
    }

    [Fact]
    public async Task Subscription_RevokedTokenRequiresReconnectionWithoutCreatingSubscription()
    {
        using var fixture = new Fixture();
        await fixture.ConnectAsync();
        fixture.Handler.Handle = request =>
        {
            Assert.Equal("/oauth2/validate", request.RequestUri!.AbsolutePath);
            return Task.FromResult(request.Headers.Authorization?.Parameter == "user-token"
                ? Json(new { message = "invalid access token" }, HttpStatusCode.Unauthorized) : ValidGrant(request));
        };
        Assert.False(await fixture.Client.EnsureEventSubSubscriptionAsync(default));
        Assert.NotNull((await fixture.Db.TwitchQuizConnections.SingleAsync(x => x.Role == "bot")).RevokedAtUtc);
        Assert.Null((await fixture.Db.TwitchQuizConnections.SingleAsync(x => x.Role == "broadcaster")).RevokedAtUtc);
    }

    [Fact]
    public async Task Subscription_ValidationOutageDoesNotRevokeTokens()
    {
        using var fixture = new Fixture();
        await fixture.ConnectAsync();
        fixture.Handler.Handle = request =>
        {
            Assert.Equal("/oauth2/validate", request.RequestUri!.AbsolutePath);
            return Task.FromResult(Json(new { message = "unavailable" }, HttpStatusCode.ServiceUnavailable));
        };
        await Assert.ThrowsAsync<HttpRequestException>(() => fixture.Client.EnsureEventSubSubscriptionAsync(default));
        Assert.All(await fixture.Db.TwitchQuizConnections.ToArrayAsync(), x => Assert.Null(x.RevokedAtUtc));
    }

    private static HttpResponseMessage ValidGrant(HttpRequestMessage request)
    {
        var bot = request.Headers.Authorization?.Parameter == "user-token";
        return Json(new
        {
            client_id = "client",
            user_id = bot ? "100001" : "200001",
            scopes = bot ? TwitchBotOptions.BotScopes : TwitchBotOptions.BroadcasterScopes,
            expires_in = 3600
        });
    }

    private static HttpResponseMessage Json(object payload, HttpStatusCode status = HttpStatusCode.OK) =>
        new(status) { Content = JsonContent.Create(payload) };
    private static HttpResponseMessage Token() => Json(new { access_token = "app-token", expires_in = 3600 });
    private static HttpResponseMessage Sent() => Json(new { data = new[] { new { is_sent = true, message_id = "sent" } } });

    private sealed class Fixture : IDisposable
    {
        public ApplicationDbContext Db { get; } = new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public Handler Handler { get; } = new();
        public TwitchBotApiClient Client { get; }
        private readonly HttpClient _http;
        private readonly TwitchApplicationTokenCache _tokens = new();
        public Fixture()
        {
            _http = new HttpClient(Handler);
            Client = new TwitchBotApiClient(_http, Options.Create(new TwitchBotOptions
            {
                ClientId = "client",
                ClientSecret = "client-secret",
                ExpectedBotUserId = "100001",
                ExpectedBroadcasterUserId = "200001",
                WebhookCallbackUrl = "https://example.test/webhook"
            }), Db, new EphemeralDataProtectionProvider(), TimeProvider.System, _tokens);
        }
        public async Task ConnectAsync()
        {
            await Client.SaveGrantAsync("bot", new("user-token", "refresh", 3600, TwitchBotOptions.BotScopes,
                new("100001", "bot", "Bot")), default);
            await Client.SaveGrantAsync("broadcaster", new("owner-token", "refresh-owner", 3600, TwitchBotOptions.BroadcasterScopes,
                new("200001", "owner", "Owner")), default);
        }
        public void Dispose() { _http.Dispose(); _tokens.Dispose(); Db.Dispose(); }
    }
    private sealed class Handler : HttpMessageHandler
    {
        public Func<HttpRequestMessage, Task<HttpResponseMessage>> Handle { get; set; } = _ => throw new InvalidOperationException("Unexpected request");
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => Handle(request);
    }
}
