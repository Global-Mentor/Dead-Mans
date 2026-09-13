using System.Net;
using System.Net.Http.Json;
using System.Text;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Application.Abstractions.Repositories;
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
    [InlineData("active", true)]
    [InlineData("active", false)]
    [InlineData("deleted", true)]
    [InlineData("deleted", false)]
    public async Task PersistReadiness_RejectsClosedRegistrationEvenWithAnEarlierGameId(string state, bool isReady)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var userId = Guid.NewGuid();
        var teamId = await SeedTeamAsync(userId, false, 2, [userId, Guid.NewGuid()]);
        var gameId = await GetReadyGameIdAsync();
        using var player = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], userId);
        await SetReadinessAsync(player, true);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var game = await db.Games.SingleAsync(candidate => candidate.Id == gameId);
        if (state == "deleted")
        {
            game.IsDeleted = true;
            game.DeletedAtUtc = DateTime.UtcNow;
        }
        else
        {
            game.Status = GameStatusValue.Active;
            game.StartedAtUtc = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();

        var persistence = scope.ServiceProvider.GetRequiredService<IGameRegistrationPersistence>();
        var result = await persistence.PersistSetMemberReadinessAsync(gameId, userId, isReady);

        Assert.False(result.Success);
        Assert.Equal(backend.Application.Contracts.GameRegistrationErrorCode.GameNotInReady, result.Error);
        Assert.NotNull((await db.GameTeamMembers.SingleAsync(member =>
            member.TeamId == teamId && member.UserId == userId)).ReadyAtUtc);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"isReady\":null}")]
    [InlineData("{\"isReady\":\"true\"}")]
    public async Task UpdateReadiness_RejectsMalformedRequestWithoutClearingReadiness(string json)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var userId = Guid.NewGuid();
        var teamId = await SeedTeamAsync(userId, false, 2, [userId, Guid.NewGuid()]);
        using var player = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], userId);
        await SetReadinessAsync(player, true);

        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await player.PatchAsync("/api/game/registration/my-team/readiness", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.NotNull((await db.GameTeamMembers.SingleAsync(member =>
            member.TeamId == teamId && member.UserId == userId)).ReadyAtUtc);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task UpdateReadiness_RejectsOutsidersAndConfirmedMembers(bool isReady)
    {
        await ClearRegistrationDataAsync();
        var userId = Guid.NewGuid();
        await SeedConfirmedTeamAsync(userId);
        using var outsider = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer]);
        using var player = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], userId);

        var outsiderResponse = await outsider.PatchAsJsonAsync("/api/game/registration/my-team/readiness",
            new UpdateRegistrationReadinessRequestDto(isReady));
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationNotTeamMember,
            (await outsiderResponse.Content.ReadFromJsonAsync<ErrorResponse>())!.Code);
        var confirmedResponse = await player.PatchAsJsonAsync("/api/game/registration/my-team/readiness",
            new UpdateRegistrationReadinessRequestDto(isReady));
        Assert.Equal(HttpStatusCode.Conflict, confirmedResponse.StatusCode);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationTeamRosterLocked,
            (await confirmedResponse.Content.ReadFromJsonAsync<ErrorResponse>())!.Code);
    }

    [Theory]
    [InlineData("remove")]
    [InlineData("transfer")]
    [InlineData("reject")]
    [InlineData("disband")]
    [InlineData("clear-name")]
    public async Task AdminChange_ClearsReadinessWithoutResurrectingIt(string operation)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var firstId = Guid.NewGuid();
        var secondId = Guid.NewGuid();
        var teamId = await SeedTeamAsync(firstId, false, 2, [firstId, secondId]);
        using var first = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], firstId);
        using var second = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], secondId);
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        await SetReadinessAsync(first, true);
        Assert.True((await SetReadinessAsync(second, true)).IsReady);

        HttpResponseMessage response;
        if (operation == "transfer")
        {
            var targetId = await SeedTeamAsync(Guid.NewGuid(), false, 3, []);
            response = await admin.PostAsJsonAsync($"/api/game/registration/admin/teams/{targetId}/assign",
                new AssignRegistrationPlayerRequestDto(firstId));
        }
        else if (operation == "clear-name")
        {
            response = await admin.PatchAsJsonAsync($"/api/game/registration/admin/teams/{teamId}/name",
                new UpdateRegistrationTeamNameRequestDto(null));
        }
        else
        {
            var path = operation == "remove"
                ? $"/api/game/registration/admin/teams/{teamId}/members/{firstId}/remove"
                : $"/api/game/registration/teams/{teamId}/{operation}";
            response = await admin.PostAsync(path, null);
        }
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        if (operation == "clear-name")
        {
            var rename = await admin.PatchAsJsonAsync($"/api/game/registration/admin/teams/{teamId}/name",
                new UpdateRegistrationTeamNameRequestDto("Restored name"));
            Assert.Equal(HttpStatusCode.OK, rename.StatusCode);
            Assert.False((await rename.Content.ReadFromJsonAsync<RegistrationTeamDto>())!.IsReady);
        }

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var memberships = await db.GameTeamMembers.Where(member =>
            member.UserId == firstId || member.UserId == secondId).ToListAsync();
        Assert.All(memberships, member => Assert.Null(member.ReadyAtUtc));
        if (operation is "remove" or "transfer" or "reject" or "disband")
        {
            Assert.NotNull(memberships.Single(member => member.TeamId == teamId && member.UserId == firstId).LeftAtUtc);
        }
    }

    [Fact]
    public async Task UpdateReadiness_RequiresNamedFullTeam()
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var firstPlayerId = Guid.NewGuid();
        var secondPlayerId = Guid.NewGuid();
        var teamId = await SeedTeamAsync(
            firstPlayerId,
            recruitmentOpen: false,
            slotIndex: 2,
            memberUserIds: [firstPlayerId, secondPlayerId]
        );
        using var firstPlayer = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Viewer],
            firstPlayerId
        );

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var team = await dbContext.GameTeams.FirstAsync(candidate => candidate.Id == teamId);
            team.Name = null;
            await dbContext.SaveChangesAsync();
        }

        var unnamedResponse = await firstPlayer.PatchAsJsonAsync(
            "/api/game/registration/my-team/readiness",
            new UpdateRegistrationReadinessRequestDto(true)
        );
        Assert.Equal(HttpStatusCode.Conflict, unnamedResponse.StatusCode);
        Assert.Equal(
            AppMessages.ErrorCodes.GameRegistrationTeamNameRequired,
            (await unnamedResponse.Content.ReadFromJsonAsync<ErrorResponse>())!.Code
        );

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var team = await dbContext.GameTeams.FirstAsync(candidate => candidate.Id == teamId);
            team.Name = "Named team";
            var secondMembership = await dbContext.GameTeamMembers.FirstAsync(member =>
                member.TeamId == teamId && member.UserId == secondPlayerId
            );
            secondMembership.LeftAtUtc = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
        }

        var incompleteResponse = await firstPlayer.PatchAsJsonAsync(
            "/api/game/registration/my-team/readiness",
            new UpdateRegistrationReadinessRequestDto(true)
        );
        Assert.Equal(HttpStatusCode.Conflict, incompleteResponse.StatusCode);
        Assert.Equal(
            AppMessages.ErrorCodes.GameRegistrationTeamNotFull,
            (await incompleteResponse.Content.ReadFromJsonAsync<ErrorResponse>())!.Code
        );
    }

    [Fact]
    public async Task UpdateReadiness_AllPlayersControlOnlyTheirOwnState()
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var firstPlayerId = Guid.NewGuid();
        var secondPlayerId = Guid.NewGuid();
        await SeedTeamAsync(
            firstPlayerId,
            recruitmentOpen: false,
            slotIndex: 2,
            memberUserIds: [firstPlayerId, secondPlayerId]
        );
        using var firstPlayer = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Viewer],
            firstPlayerId
        );
        using var secondPlayer = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Viewer],
            secondPlayerId
        );

        var firstReady = await SetReadinessAsync(firstPlayer, true);
        Assert.False(firstReady.IsReady);
        Assert.NotNull(firstReady.Members.Single(member => member.Player.UserId == firstPlayerId).ReadyAtUtc);
        Assert.Null(firstReady.Members.Single(member => member.Player.UserId == secondPlayerId).ReadyAtUtc);

        var wholeTeamReady = await SetReadinessAsync(secondPlayer, true);
        Assert.True(wholeTeamReady.IsReady);
        Assert.All(wholeTeamReady.Members, member => Assert.NotNull(member.ReadyAtUtc));

        var firstNotReady = await SetReadinessAsync(firstPlayer, false);
        Assert.False(firstNotReady.IsReady);
        Assert.Null(firstNotReady.Members.Single(member => member.Player.UserId == firstPlayerId).ReadyAtUtc);
        Assert.NotNull(firstNotReady.Members.Single(member => member.Player.UserId == secondPlayerId).ReadyAtUtc);
    }

    [Fact]
    public async Task LeaveTeam_ResetsReadinessForRemainingPlayers()
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var leavingPlayerId = Guid.NewGuid();
        var remainingPlayerId = Guid.NewGuid();
        await SeedTeamAsync(
            leavingPlayerId,
            recruitmentOpen: true,
            slotIndex: 2,
            memberUserIds: [leavingPlayerId, remainingPlayerId]
        );
        using var leavingPlayer = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Viewer],
            leavingPlayerId
        );
        using var remainingPlayer = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Viewer],
            remainingPlayerId
        );

        await SetReadinessAsync(leavingPlayer, true);
        await SetReadinessAsync(remainingPlayer, true);

        var leaveResponse = await leavingPlayer.PostAsync(
            "/api/game/registration/teams/leave",
            content: null
        );
        Assert.Equal(HttpStatusCode.NoContent, leaveResponse.StatusCode);

        var snapshot = await remainingPlayer.GetFromJsonAsync<GameRegistrationSnapshotDto>(
            "/api/game/registration"
        );
        Assert.NotNull(snapshot?.MyTeam);
        Assert.False(snapshot.MyTeam.IsReady);
        Assert.Single(snapshot.MyTeam.Members);
        Assert.Null(snapshot.MyTeam.Members[0].ReadyAtUtc);
    }

    [Fact]
    public async Task ConfirmTeam_AllowsUnreadyRosterButRejectsMissingName()
    {
        await ClearRegistrationDataAsync();
        var adminId = Guid.NewGuid();
        var playerId = Guid.NewGuid();
        var teamId = await SeedFormingTeamAsync(playerId, recruitmentOpen: false);
        using var admin = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Admin],
            adminId
        );

        var confirmedResponse = await admin.PostAsync(
            $"/api/game/registration/teams/{teamId}/confirm",
            content: null
        );
        Assert.Equal(HttpStatusCode.OK, confirmedResponse.StatusCode);

        await ClearRegistrationDataAsync();
        var unnamedPlayerId = Guid.NewGuid();
        var unnamedTeamId = await SeedFormingTeamAsync(unnamedPlayerId, recruitmentOpen: false);
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var team = await dbContext.GameTeams.FirstAsync(candidate => candidate.Id == unnamedTeamId);
            team.Name = null;
            await dbContext.SaveChangesAsync();
        }

        var unnamedResponse = await admin.PostAsync(
            $"/api/game/registration/teams/{unnamedTeamId}/confirm",
            content: null
        );
        Assert.Equal(HttpStatusCode.Conflict, unnamedResponse.StatusCode);
        Assert.Equal(
            AppMessages.ErrorCodes.GameRegistrationTeamNameRequired,
            (await unnamedResponse.Content.ReadFromJsonAsync<ErrorResponse>())!.Code
        );
    }

    private static async Task<RegistrationTeamDto> SetReadinessAsync(
        HttpClient client,
        bool isReady
    )
    {
        var response = await client.PatchAsJsonAsync(
            "/api/game/registration/my-team/readiness",
            new UpdateRegistrationReadinessRequestDto(isReady)
        );
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<RegistrationTeamDto>())!;
    }
}
