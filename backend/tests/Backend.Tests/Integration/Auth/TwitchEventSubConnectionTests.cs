using System.Net;
using System.Net.Http.Json;
using backend.Application.Configuration;
using backend.Application.Contracts;
using Backend.Tests.Support;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Backend.Tests.Integration.Auth;

public sealed class TwitchEventSubConnectionTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public TwitchEventSubConnectionTests(TestWebApplicationFactory factory) => _factory = factory;

    [Theory]
    [InlineData("viewer")]
    [InlineData("moderator")]
    public async Task Connect_RejectsNonAdministrators(string role)
    {
        using var client = TestAuthClientFactory.CreateClient(_factory, [role]);
        using var response = await client.PostAsync("/api/integrations/twitch/eventsub/connect", null);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Connect_DisabledIntegration_RemainsDisabled()
    {
        using var client = TestAuthClientFactory.CreateClient(_factory, ["admin"]);
        using var response = await client.PostAsync("/api/integrations/twitch/eventsub/connect", null);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("admin")]
    [InlineData("superadmin")]
    public async Task Connect_MissingGrants_ReturnsDisconnectedStatus(string role)
    {
        using var client = TestAuthClientFactory.CreateClient(_factory, [role], configureServices: services =>
            services.AddSingleton<IOptions<TwitchBotOptions>>(Options.Create(new TwitchBotOptions { Enabled = true })));
        using var response = await client.PostAsync("/api/integrations/twitch/eventsub/connect", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var status = await response.Content.ReadFromJsonAsync<TwitchBotStatus>();
        Assert.NotNull(status);
        Assert.True(status.Enabled);
        Assert.False(status.BotConnected);
        Assert.False(status.BroadcasterConnected);
        Assert.False(status.EventSubConnected);
    }
}
