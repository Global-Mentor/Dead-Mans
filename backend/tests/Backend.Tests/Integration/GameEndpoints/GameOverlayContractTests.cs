using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using backend.Data;
using backend.Data.Entities;
using Backend.Tests.Support;
using Microsoft.Extensions.DependencyInjection;
using backend.Api.Contracts;
using backend.Application.Abstractions.Realtime;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed class GameOverlayContractTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task OverlayHub_ReceivesInvalidations_AndRevalidatesRevokedKey()
    {
        var key = Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(32));
        var ownerId = Guid.NewGuid();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Add(new GameOverlayKey
            {
                Owner = CreateStaffOwner(db, ownerId),
                KeyHash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(key)))
            });
            await db.SaveChangesAsync();
        }
        await using var connection = new HubConnectionBuilder().WithUrl(
            new Uri(factory.Server.BaseAddress, RealtimeHubContracts.GameOverlay.HubPath), options =>
            {
                options.Transports = HttpTransportType.LongPolling;
                options.Headers.Add("X-Overlay-Key", key);
                options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
            }).Build();
        var received = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var closed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        connection.On(RealtimeHubContracts.GameOverlay.FrameChangedEvent, () => received.TrySetResult());
        connection.Closed += _ => { closed.TrySetResult(); return Task.CompletedTask; };
        await connection.StartAsync();
        var publisher = factory.Services.GetRequiredService<IGameBoardEventsPublisher>();
        await publisher.PublishTeamStateChangedAsync();
        await received.Task.WaitAsync(TimeSpan.FromSeconds(5));
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Remove(await db.Set<GameOverlayKey>().FindAsync(ownerId) ?? throw new InvalidOperationException());
            await db.SaveChangesAsync();
        }
        await publisher.PublishTeamStateChangedAsync();
        await closed.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Equal(HubConnectionState.Disconnected, connection.State);
    }

    [Fact]
    public async Task OverlayKey_AuthenticatesOnlySnapshot_AndCannotAccessGameOrManageKeys()
    {
        var key = new string('a', 64);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Set<GameOverlayKey>().Add(new GameOverlayKey
            {
                Owner = CreateStaffOwner(db, Guid.NewGuid()),
                KeyHash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(key)))
            });
            await db.SaveChangesAsync();
        }
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Overlay-Key", key);
        using var snapshot = await client.GetAsync("/api/overlay/snapshot");
        Assert.Equal(HttpStatusCode.OK, snapshot.StatusCode);
        Assert.True(snapshot.Headers.CacheControl?.NoStore);
        foreach (var path in new[] { "/api/game", "/api/game/team-queue" })
        {
            using var denied = await client.GetAsync(path);
            Assert.Equal(HttpStatusCode.Unauthorized, denied.StatusCode);
        }
        using var mutation = await client.PostAsync("/api/overlay/key", null);
        Assert.Equal(HttpStatusCode.Unauthorized, mutation.StatusCode);
        using var draftMutation = await client.PostAsJsonAsync($"/api/game/rounds/{Guid.NewGuid()}/broadcast-summary",
            new { expectedRoundVersion = 1, killsCount = 1, bountyCount = 0 });
        Assert.Equal(HttpStatusCode.Unauthorized, draftMutation.StatusCode);
    }

    [Theory]
    [InlineData("POST")]
    [InlineData("DELETE")]
    public async Task Viewer_CannotManageKeys(string method)
    {
        using var client = TestAuthClientFactory.CreateClient(factory, ["viewer"]);
        using var request = new HttpRequestMessage(new HttpMethod(method), "/api/overlay/key");
        request.Headers.Add("X-Dead-Mans-Api-Client", "1");
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Viewer_CannotBroadcastRoundDraft()
    {
        using var client = TestAuthClientFactory.CreateClient(factory, ["viewer"]);
        using var request = new HttpRequestMessage(HttpMethod.Post, $"/api/game/rounds/{Guid.NewGuid()}/broadcast-summary")
        {
            Content = JsonContent.Create(new { expectedRoundVersion = 1, killsCount = 1, bountyCount = 0 })
        };
        request.Headers.Add("X-Dead-Mans-Api-Client", "1");
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("GET", "/api/overlay/snapshot")]
    [InlineData("POST", "/api/overlay/key")]
    [InlineData("DELETE", "/api/overlay/key")]
    [InlineData("POST", "/hubs/game-overlay/negotiate?negotiateVersion=1")]
    public async Task AnonymousWithoutKey_CannotReadOrManageOverlay(string method, string path)
    {
        using var client = factory.CreateClient();
        using var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), path));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static User CreateStaffOwner(ApplicationDbContext db, Guid id) => new()
    {
        Id = id,
        UserRoles = [new UserRole
        {
            Role = db.Roles.FirstOrDefault(role => role.Code == "moderator")
                ?? new Role { Id = 10, Code = "moderator", Name = "Moderator" }
        }]
    };
}
