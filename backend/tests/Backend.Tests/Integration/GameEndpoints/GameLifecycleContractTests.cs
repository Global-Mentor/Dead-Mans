using System.Net;
using System.Net.Http.Json;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Data;
using backend.Domain.Persistence;
using backend.Messaging;
using Backend.Tests.Support;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed class GameLifecycleContractTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public GameLifecycleContractTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task OpenRegistration_WhenAnonymous_ReturnsUnauthorized()
    {
        var response = await _client.PostAsync("/api/game/lifecycle/open-registration", content: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task OpenRegistration_WhenNoDraft_ReturnsNotFound()
    {
        await ClearGamesAsync();
        using var adminClient = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);

        var response = await adminClient.PostAsync("/api/game/lifecycle/open-registration", content: null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(payload);
        Assert.Equal(AppMessages.Client.NoDraftGameForSetup, payload.Error);
    }

    [Fact]
    public async Task OpenRegistration_WhenDraftExists_MovesGameToReady()
    {
        await ClearGamesAsync();
        using var adminClient = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        var setupResponse = await adminClient.PostAsJsonAsync(
            "/api/game/setup",
            new CreateGameSetupRequestDto("Draft for registration")
        );
        Assert.Equal(HttpStatusCode.Created, setupResponse.StatusCode);

        var response = await adminClient.PostAsync("/api/game/lifecycle/open-registration", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<GameLifecycleStateDto>();
        Assert.NotNull(payload);
        Assert.Equal(GameStatusValue.Ready, payload.Status);
    }

    [Fact]
    public async Task Start_WhenReadyGameExists_MovesGameToActive()
    {
        await ClearGamesAsync();
        using var adminClient = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        var setupResponse = await adminClient.PostAsJsonAsync(
            "/api/game/setup",
            new CreateGameSetupRequestDto("Ready to start")
        );
        Assert.Equal(HttpStatusCode.Created, setupResponse.StatusCode);

        var openResponse = await adminClient.PostAsync("/api/game/lifecycle/open-registration", content: null);
        Assert.Equal(HttpStatusCode.OK, openResponse.StatusCode);

        var response = await adminClient.PostAsync("/api/game/lifecycle/start", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<GameLifecycleStateDto>();
        Assert.NotNull(payload);
        Assert.Equal(GameStatusValue.Active, payload.Status);
    }

    [Fact]
    public async Task Finish_WhenActiveGameExists_MovesGameToFinished()
    {
        await ClearGamesAsync();
        using var adminClient = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        await adminClient.PostAsJsonAsync("/api/game/setup", new CreateGameSetupRequestDto("Active run"));
        await adminClient.PostAsync("/api/game/lifecycle/open-registration", content: null);
        await adminClient.PostAsync("/api/game/lifecycle/start", content: null);

        var response = await adminClient.PostAsync("/api/game/lifecycle/finish", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<GameLifecycleStateDto>();
        Assert.NotNull(payload);
        Assert.Equal(GameStatusValue.Finished, payload.Status);
    }

    [Fact]
    public async Task Start_WhenNoReadyGame_ReturnsNotFound()
    {
        await ClearGamesAsync();
        using var adminClient = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);

        var response = await adminClient.PostAsync("/api/game/lifecycle/start", content: null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(payload);
        Assert.Equal(AppMessages.Client.GameNotReadyForStart, payload.Error);
    }

    private async Task ClearGamesAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        dbContext.GameParticipationInvitations.RemoveRange(dbContext.GameParticipationInvitations);
        dbContext.GameTeamMembers.RemoveRange(dbContext.GameTeamMembers);
        dbContext.GameTeams.RemoveRange(dbContext.GameTeams);
        dbContext.GameParticipationSlots.RemoveRange(dbContext.GameParticipationSlots);
        dbContext.BoardCellMedia.RemoveRange(dbContext.BoardCellMedia);
        dbContext.BoardCells.RemoveRange(dbContext.BoardCells);
        dbContext.GameBoards.RemoveRange(dbContext.GameBoards);
        dbContext.Games.RemoveRange(dbContext.Games);
        await dbContext.SaveChangesAsync();
    }
}
