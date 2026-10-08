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
    [InlineData(AuthRoleCodes.Admin)]
    [InlineData(AuthRoleCodes.SuperAdmin)]
    [InlineData(AuthRoleCodes.Moderator)]
    public async Task RejectReadyTeam_NotifiesEveryMemberAndPreservesHistory(string role)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var first = Guid.NewGuid(); var second = Guid.NewGuid();
        var teamId = await SeedTeamAsync(first, true, 2, [first, second]);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            foreach (var member in await db.GameTeamMembers.Where(m => m.TeamId == teamId).ToListAsync())
                member.ReadyAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
        using var admin = TestAuthClientFactory.CreateClient(_factory, [role]);
        var response = await admin.PostAsync($"/api/game/registration/teams/{teamId}/reject", null);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        using var verifyScope = _factory.Services.CreateScope();
        var verify = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(TeamStatusValue.Rejected, (await verify.GameTeams.SingleAsync(t => t.Id == teamId)).Status);
        Assert.All(await verify.GameTeamMembers.Where(m => m.TeamId == teamId).ToListAsync(), m => Assert.NotNull(m.LeftAtUtc));
        foreach (var id in new[] { first, second })
        {
            using var player = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], id);
            var notifications = await player.GetFromJsonAsync<GameUserNotificationDto[]>("/api/game/notifications");
            var notification = Assert.Single(notifications!);
            Assert.Equal("team_rejected", notification.Type);
            Assert.Equal("Team 2", notification.TeamName);
            var snapshot = await player.GetFromJsonAsync<GameRegistrationSnapshotDto>("/api/game/registration");
            Assert.Null(snapshot!.MyTeam);
        }
        var repeat = await admin.PostAsync($"/api/game/registration/teams/{teamId}/reject", null);
        Assert.Equal(HttpStatusCode.Conflict, repeat.StatusCode);
        Assert.Equal(2, await verify.GameUserNotifications.CountAsync());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task RejectTeam_RequiresFullReadyRosterWithoutPendingInvitations(bool full)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var first = Guid.NewGuid(); var second = Guid.NewGuid();
        var teamId = await SeedTeamAsync(first, true, 2, full ? [first, second] : [first]);
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        var response = await admin.PostAsync($"/api/game/registration/teams/{teamId}/reject", null);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationTeamNotReady, (await response.Content.ReadFromJsonAsync<ErrorResponse>())!.Code);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(TeamStatusValue.Forming, (await db.GameTeams.SingleAsync(t => t.Id == teamId)).Status);
        Assert.All(await db.GameTeamMembers.Where(m => m.TeamId == teamId).ToListAsync(), m => Assert.Null(m.LeftAtUtc));
        Assert.Empty(await db.GameUserNotifications.ToListAsync());
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsync($"/api/game/registration/teams/{teamId}/disband", null)).StatusCode);
        Assert.Empty(await db.GameUserNotifications.ToListAsync());
    }
}
