using System.Net;
using System.Net.Http.Json;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Data;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed partial class GameRegistrationContractTests
{
    [Theory]
    [InlineData("assign", false)]
    [InlineData("transfer", false)]
    [InlineData("remove", false)]
    [InlineData("disband", false)]
    [InlineData("assign", true)]
    [InlineData("transfer", true)]
    [InlineData("remove", true)]
    [InlineData("disband", true)]
    public async Task AdministrativeParticipationChange_NotifiesOnlyAffectedPlayersOnce(string operation, bool self)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var playerId = Guid.NewGuid();
        var otherId = Guid.NewGuid();
        var actorId = self ? playerId : Guid.NewGuid();
        if (operation == "assign") await SeedUserAsync(playerId, "affected-player");
        if (!self) await SeedUserAsync(actorId, "organizer");
        var sourceId = operation == "assign" ? (Guid?)null
            : await SeedTeamAsync(playerId, true, 2, [playerId]);
        var targetId = await SeedTeamAsync(otherId, true, 3, [otherId]);
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Moderator], actorId);
        using var player = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], playerId);
        using var other = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], otherId);
        var path = operation switch
        {
            "assign" or "transfer" => $"/api/game/registration/admin/teams/{targetId}/assign",
            "remove" => $"/api/game/registration/admin/teams/{sourceId}/members/{playerId}/remove",
            "disband" => $"/api/game/registration/teams/{sourceId}/disband",
            _ => throw new ArgumentOutOfRangeException(nameof(operation))
        };
        Task<HttpResponseMessage> Execute(HttpClient client) => operation is "assign" or "transfer"
            ? client.PostAsJsonAsync(path, new AssignRegistrationPlayerRequestDto(playerId))
            : client.PostAsync(path, null);

        Assert.Equal(HttpStatusCode.Forbidden, (await Execute(player)).StatusCode);
        Assert.Empty((await player.GetFromJsonAsync<GameUserNotificationDto[]>("/api/game/notifications"))!);
        var response = await Execute(admin);
        Assert.True(response.IsSuccessStatusCode);
        Assert.False((await Execute(admin)).IsSuccessStatusCode);

        // Later team edits must not rewrite the event's original team names.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        foreach (var team in await db.GameTeams.ToListAsync()) team.Name = $"Renamed {team.Id}";
        await db.SaveChangesAsync();
        var notices = (await player.GetFromJsonAsync<GameUserNotificationDto[]>("/api/game/notifications"))!;
        if (self) Assert.Empty(notices);
        else
        {
            var notice = Assert.Single(notices);
            Assert.Equal(operation switch
            {
                "assign" => "team_member_assigned",
                "transfer" => "team_member_transferred",
                "remove" => "team_member_removed",
                _ => "team_disbanded"
            }, notice.Type);
            Assert.Equal(operation is "assign" or "transfer" ? "Team 3" : "Team 2", notice.TeamName);
            Assert.Equal(operation is "assign" or "transfer" ? 3 : 2, notice.TeamSlotIndex);
            Assert.Equal(operation == "transfer" ? "Team 2" : null, notice.PreviousTeamName);
            Assert.Equal(operation == "transfer" ? 2 : (int?)null, notice.PreviousTeamSlotIndex);
        }
        Assert.Empty((await other.GetFromJsonAsync<GameUserNotificationDto[]>("/api/game/notifications"))!);
        Assert.Empty((await admin.GetFromJsonAsync<GameUserNotificationDto[]>("/api/game/notifications"))!);
        Assert.Equal(self ? 0 : 1, await db.GameUserNotifications.CountAsync());
    }

    [Fact]
    public async Task DisbandTeam_NotifiesCurrentMembersIncludingRequesterButNotFormerMembers()
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        var former = Guid.NewGuid();
        var teamId = await SeedTeamAsync(first, true, 2, [first, second, former]);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await db.GameTeamMembers.SingleAsync(member => member.UserId == former)).LeftAtUtc = DateTime.UtcNow;
        var team = await db.GameTeams.SingleAsync(team => team.Id == teamId);
        team.Name = null;
        team.DisbandRequestedByUserId = first;
        team.DisbandRequestedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsync($"/api/game/registration/teams/{teamId}/disband", null)).StatusCode);
        foreach (var userId in new[] { first, second })
        {
            using var player = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], userId);
            var notice = Assert.Single((await player.GetFromJsonAsync<GameUserNotificationDto[]>("/api/game/notifications"))!);
            Assert.Equal("team_disbanded", notice.Type);
            Assert.Null(notice.TeamName);
            Assert.Equal(2, notice.TeamSlotIndex);
        }
        Assert.Equal(2, await db.GameUserNotifications.CountAsync());
        Assert.False(await db.GameUserNotifications.AnyAsync(notice => notice.UserId == former));
    }

    [Fact]
    public async Task VoluntaryLeave_DoesNotCreateParticipationNotification()
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var playerId = Guid.NewGuid();
        await SeedTeamAsync(playerId, true, 2, [playerId]);
        using var player = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], playerId);
        Assert.Equal(HttpStatusCode.NoContent, (await player.PostAsync("/api/game/registration/teams/leave", null)).StatusCode);
        using var scope = _factory.Services.CreateScope();
        Assert.Empty(await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().GameUserNotifications.ToListAsync());
    }
}
