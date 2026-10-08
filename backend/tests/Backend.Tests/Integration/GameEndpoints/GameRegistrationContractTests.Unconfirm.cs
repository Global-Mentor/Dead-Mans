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
    [InlineData(false, AuthRoleCodes.Admin)]
    [InlineData(true, AuthRoleCodes.Admin)]
    [InlineData(false, AuthRoleCodes.Moderator)]
    [InlineData(true, AuthRoleCodes.SuperAdmin)]
    public async Task UnconfirmTeam_PreservesRosterAndReadiness(bool active, string role)
    {
        await ClearRegistrationDataAsync();
        var playerId = Guid.NewGuid();
        var teamId = await SeedConfirmedTeamAsync(playerId);
        DateTime readyAt;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            readyAt = DateTime.UtcNow;
            (await db.GameTeamMembers.SingleAsync(member => member.TeamId == teamId)).ReadyAtUtc = readyAt;
            await db.SaveChangesAsync();
        }
        if (active) await SetReadyGameActiveAsync();
        using var client = TestAuthClientFactory.CreateClient(_factory, [role], playerId);
        var response = await client.PostAsync($"/api/game/registration/teams/{teamId}/unconfirm", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<RegistrationTeamDto>();
        Assert.NotNull(payload);
        Assert.Equal(TeamStatusValue.Forming, payload.Status);
        Assert.Single(payload.Members);
        Assert.Equal(readyAt, payload.Members[0].ReadyAtUtc);
        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var team = await verifyDb.GameTeams.SingleAsync(candidate => candidate.Id == teamId);
        Assert.Null(team.ConfirmedAtUtc);
        Assert.Null(team.ConfirmedByUserId);
        Assert.False(team.RecruitmentOpen);
        Assert.Null((await verifyDb.GameTeamMembers.SingleAsync(member => member.TeamId == teamId)).LeftAtUtc);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/game/registration/teams/{teamId}/confirm", null)).StatusCode);
    }

    [Theory]
    [InlineData("active", AppMessages.ErrorCodes.GameRegistrationTeamActiveInGame)]
    [InlineData("played", AppMessages.ErrorCodes.GameRegistrationTeamAlreadyPlayed)]
    [InlineData("forming", AppMessages.ErrorCodes.GameRegistrationTeamNotJoinable)]
    public async Task UnconfirmTeam_RejectsLockedOrUnconfirmedTeams(string state, string code)
    {
        await ClearRegistrationDataAsync();
        var playerId = Guid.NewGuid();
        var teamId = await SeedConfirmedTeamAsync(playerId);
        if (state == "active") await SetReadyGameActiveAsync(teamId);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var team = await db.GameTeams.SingleAsync(candidate => candidate.Id == teamId);
            if (state == "played") team.IsPlayed = true;
            if (state == "forming") { team.Status = TeamStatusValue.Forming; team.ConfirmedAtUtc = null; team.ConfirmedByUserId = null; }
            await db.SaveChangesAsync();
        }
        using var client = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin], playerId);
        var response = await client.PostAsync($"/api/game/registration/teams/{teamId}/unconfirm", null);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(code, (await response.Content.ReadFromJsonAsync<ErrorResponse>())!.Code);
    }

    [Fact]
    public async Task UnconfirmTeam_RequiresStaffAuthorization()
    {
        await ClearRegistrationDataAsync();
        var teamId = await SeedConfirmedTeamAsync(Guid.NewGuid());
        var path = $"/api/game/registration/teams/{teamId}/unconfirm";
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.PostAsync(path, null)).StatusCode);
        using var viewer = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer]);
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.PostAsync(path, null)).StatusCode);
    }
}
