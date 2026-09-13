using System.Net;
using System.Net.Http.Json;
using System.Threading.Channels;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Application.Abstractions.Realtime;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data;
using Backend.Tests.Support;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ApiTeam = backend.Api.Contracts.RegistrationTeamDto;
using ApiSnapshot = backend.Api.Contracts.GameRegistrationSnapshotDto;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed partial class GameRegistrationContractTests
{
    [Theory]
    [InlineData(AuthRoleCodes.Viewer)]
    [InlineData(AuthRoleCodes.Admin)]
    public async Task Readiness_HttpWriteBroadcastsToConnectedSignalrClients(string role)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var userId = Guid.NewGuid();
        await SeedTeamAsync(userId, false, 2, [userId, Guid.NewGuid()]);
        using var factory = TestAuthClientFactory.CreateFactory(_factory, [role], userId);
        using var http = factory.CreateClient();
        await using var firstConnection = CreateRegistrationConnection(factory);
        await using var secondConnection = CreateRegistrationConnection(factory);
        var firstEvents = Channel.CreateUnbounded<bool>();
        var secondEvents = Channel.CreateUnbounded<bool>();
        using var firstSubscription = firstConnection.On(RealtimeHubContracts.GameBoard.RegistrationChangedEvent,
            () => { firstEvents.Writer.TryWrite(true); });
        using var secondSubscription = secondConnection.On(RealtimeHubContracts.GameBoard.RegistrationChangedEvent,
            () => { secondEvents.Writer.TryWrite(true); });
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        await firstConnection.StartAsync(timeout.Token);
        await secondConnection.StartAsync(timeout.Token);

        foreach (var isReady in new[] { true, false })
        {
            await SetReadinessAsync(http, isReady);
            await firstEvents.Reader.ReadAsync(timeout.Token);
            await secondEvents.Reader.ReadAsync(timeout.Token);

            // An event must expose the committed state to both player and admin readers.
            var snapshot = await http.GetFromJsonAsync<ApiSnapshot>("/api/game/registration", timeout.Token);
            var member = snapshot!.MyTeam!.Members.Single(candidate => candidate.Player.UserId == userId);
            Assert.Equal(isReady, member.ReadyAtUtc.HasValue);
            if (role == AuthRoleCodes.Admin)
            {
                var admin = await http.GetFromJsonAsync<GameRegistrationAdminSnapshotDto>(
                    "/api/game/registration/admin", timeout.Token);
                var adminMember = admin!.Teams.Single().Members.Single(candidate => candidate.Player.UserId == userId);
                Assert.Equal(member.ReadyAtUtc, adminMember.ReadyAtUtc);
            }
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Readiness_PublishesOnlySuccessfulWrites_AndSurvivesRealtimeFailure(bool failRealtime)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var userId = Guid.NewGuid();
        var teamId = await SeedTeamAsync(userId, false, 2, [userId, Guid.NewGuid()]);
        var events = new RecordingRegistrationEvents(failRealtime);
        using var client = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], userId, services =>
        {
            services.RemoveAll<IGameRegistrationEventsPublisher>();
            services.AddSingleton<IGameRegistrationEventsPublisher>(events);
        });
        await SetReadinessAsync(client, true);
        Assert.Equal(1, events.Count);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            (await db.GameTeams.SingleAsync(team => team.Id == teamId)).Name = null;
            await db.SaveChangesAsync();
        }
        var rejected = await client.PatchAsJsonAsync("/api/game/registration/my-team/readiness",
            new UpdateRegistrationReadinessRequestDto(true));
        Assert.Equal(HttpStatusCode.Conflict, rejected.StatusCode);
        Assert.Equal(1, events.Count);
        var withdrawn = await SetReadinessAsync(client, false);
        Assert.Null(withdrawn.Members.Single(member => member.Player.UserId == userId).ReadyAtUtc);
        Assert.Equal(2, events.Count);
    }

    [Fact]
    public async Task Readiness_DoesNotReplaceAdminConfirmationOrBlockAnAdminOverride()
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var firstId = Guid.NewGuid();
        var secondId = Guid.NewGuid();
        var teamId = await SeedTeamAsync(firstId, false, 2, [firstId, secondId]);
        var gameId = await GetReadyGameIdAsync();
        using var first = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], firstId);
        using var second = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], secondId);
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        await SetReadinessAsync(first, true);
        Assert.True((await SetReadinessAsync(second, true)).IsReady);
        using (var scope = _factory.Services.CreateScope())
        {
            var reads = scope.ServiceProvider.GetRequiredService<IGameLifecycleReadStore>();
            Assert.Equal(GameLifecycleErrorCode.UnconfirmedTeams,
                await reads.GetStartValidationErrorAsync(gameId, CancellationToken.None));
        }

        await SetReadinessAsync(first, false);
        var response = await admin.PostAsync($"/api/game/registration/teams/{teamId}/confirm", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False((await response.Content.ReadFromJsonAsync<ApiTeam>())!.IsReady);
        using (var scope = _factory.Services.CreateScope())
        {
            var reads = scope.ServiceProvider.GetRequiredService<IGameLifecycleReadStore>();
            Assert.Equal(GameLifecycleErrorCode.None,
                await reads.GetStartValidationErrorAsync(gameId, CancellationToken.None));
        }
    }

    private static HubConnection CreateRegistrationConnection(WebApplicationFactory<Program> factory) =>
        new HubConnectionBuilder().WithUrl(
            new Uri(factory.Server.BaseAddress, RealtimeHubContracts.GameBoard.HubPath),
            options =>
            {
                options.Transports = HttpTransportType.LongPolling;
                options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
            }).Build();
}
