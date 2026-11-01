using System.Net;
using System.Net.Http.Json;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Data;
using backend.Domain.Persistence;
using backend.Messaging;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed partial class GameRegistrationContractTests
{
    [Theory]
    [InlineData(GameStatusValue.Ready)]
    [InlineData(GameStatusValue.Active)]
    public async Task TeamLimit_CanBeLoweredAndRemovedWithoutChangingExistingTeams(string status)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var gameId = await GetReadyGameIdAsync();
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        var url = $"/api/game/registration/admin/games/{gameId}/team-limit";
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync(url, new { teamLimit = 6 })).StatusCode);
        for (var index = 1; index <= 6; index++)
            Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/game/registration/admin/teams",
                new CreateAdminRegistrationTeamRequestDto(null, true, $"Team {index}"))).StatusCode);
        if (status == GameStatusValue.Active) await SetReadyGameActiveAsync();
        var before = await admin.GetFromJsonAsync<GameRegistrationAdminSnapshotDto>("/api/game/registration/admin");
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync(url, new { teamLimit = 4 })).StatusCode);
        var reduced = await admin.GetFromJsonAsync<GameRegistrationAdminSnapshotDto>("/api/game/registration/admin");
        Assert.Equal(4, reduced!.TeamLimit);
        Assert.False(reduced.CanCreateTeam);
        Assert.Equal(before!.Teams.Select(team => team.TeamId), reduced.Teams.Select(team => team.TeamId));
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync("/api/game/registration/admin/teams",
            new CreateAdminRegistrationTeamRequestDto(null, true, "Blocked"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync(url, new { teamLimit = (int?)null })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/game/registration/admin/teams",
            new CreateAdminRegistrationTeamRequestDto(null, true, "Unlimited"))).StatusCode);
        var unlimited = await admin.GetFromJsonAsync<GameRegistrationAdminSnapshotDto>("/api/game/registration/admin");
        Assert.Null(unlimited!.TeamLimit);
        Assert.True(unlimited.CanCreateTeam);
        Assert.Equal(7, unlimited.Teams.Count);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(1001)]
    public async Task TeamLimit_RejectsInvalidValuesWithoutChangingSavedLimit(int limit)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        var response = await admin.PutAsJsonAsync($"/api/game/registration/admin/games/{await GetReadyGameIdAsync()}/team-limit", new { teamLimit = limit });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationInvalidTeamLimit, (await response.Content.ReadFromJsonAsync<ErrorResponse>())!.Code);
        Assert.Equal(1, (await admin.GetFromJsonAsync<GameRegistrationAdminSnapshotDto>("/api/game/registration/admin"))!.TeamLimit);
    }

    [Fact]
    public async Task TeamLimit_RequiresExplicitValueAndStaffRoleAndRejectsFinishedGames()
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var gameId = await GetReadyGameIdAsync();
        var url = $"/api/game/registration/admin/games/{gameId}/team-limit";
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        using var viewer = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer]);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.PutAsJsonAsync(url, new { teamLimit = 2 })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.PutAsJsonAsync(url, new { teamLimit = 2 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync(url, new { })).StatusCode);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await db.Games.SingleAsync()).Status = GameStatusValue.Finished;
        await db.SaveChangesAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PutAsJsonAsync(url, new { teamLimit = (int?)null })).StatusCode);
        Assert.Equal(1, (await db.Games.AsNoTracking().SingleAsync()).TeamLimit);
    }

    [Fact]
    public async Task TeamLimit_PublicCreationUsesConfiguredCapacityBeyondInitialSlots()
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Moderator]);
        var url = $"/api/game/registration/admin/games/{await GetReadyGameIdAsync()}/team-limit";
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync(url, new { teamLimit = 2 })).StatusCode);
        for (var index = 1; index <= 3; index++)
        {
            var userId = Guid.NewGuid();
            await SeedUserAsync(userId, $"limit-user-{index}");
            using var player = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], userId);
            var response = await player.PostAsJsonAsync("/api/game/registration/teams", new CreateRegistrationTeamRequestDto(true, $"Public {index}"));
            Assert.Equal(index <= 2 ? HttpStatusCode.Created : HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal(index < 2, (await player.GetFromJsonAsync<GameRegistrationSnapshotDto>("/api/game/registration"))!.CanCreateTeam);
        }
    }
}
