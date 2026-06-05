using System.Net;
using System.Net.Http.Json;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Messaging;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed class GameRegistrationContractTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public GameRegistrationContractTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetRegistration_WhenAnonymous_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/game/registration");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetRegistration_WhenNoReadyGame_ReturnsNotFound()
    {
        await ClearRegistrationDataAsync();
        using var viewerClient = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer]);

        var response = await viewerClient.GetAsync("/api/game/registration");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(payload);
        Assert.Equal(AppMessages.Client.GameRegistrationNotOpen, payload.Error);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationNotOpen, payload.Code);
    }

    [Fact]
    public async Task ListTeams_WhenAdminAndNoReadyGame_ReturnsNotFound()
    {
        await ClearRegistrationDataAsync();
        using var adminClient = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);

        var response = await adminClient.GetAsync("/api/game/registration/teams");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(payload);
        Assert.Equal(AppMessages.Client.GameRegistrationNotOpen, payload.Error);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationNotOpen, payload.Code);
    }

    [Fact]
    public async Task CreateTeam_WhenReadyGame_ReturnsCreated()
    {
        await ClearRegistrationDataAsync();
        var userId = Guid.NewGuid();
        await SeedReadyGameAsync();
        await SeedUserAsync(userId);
        using var viewerClient = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Viewer],
            userId
        );

        var response = await viewerClient.PostAsJsonAsync(
            "/api/game/registration/teams",
            new CreateRegistrationTeamRequestDto(true)
        );

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<RegistrationTeamDto>();
        Assert.NotNull(payload);
        Assert.Equal("forming", payload.Status);
    }

    [Fact]
    public async Task RejectTeam_WhenConfirmed_ReturnsConflict()
    {
        await ClearRegistrationDataAsync();
        var adminId = Guid.NewGuid();
        var teamId = await SeedConfirmedTeamAsync(adminId);
        using var adminClient = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Admin],
            adminId
        );

        var response = await adminClient.PostAsync(
            $"/api/game/registration/teams/{teamId}/reject",
            content: null
        );

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(payload);
        Assert.Equal(AppMessages.Client.GameRegistrationTeamNotJoinable, payload.Error);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationTeamNotJoinable, payload.Code);
    }

    [Fact]
    public async Task LeaveTeam_WhenMember_ReturnsOk()
    {
        await ClearRegistrationDataAsync();
        var userId = Guid.NewGuid();
        await SeedReadyGameAsync();
        await SeedUserAsync(userId);
        using var viewerClient = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Viewer],
            userId
        );

        var createResponse = await viewerClient.PostAsJsonAsync(
            "/api/game/registration/teams",
            new CreateRegistrationTeamRequestDto(true)
        );
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var response = await viewerClient.PostAsync("/api/game/registration/teams/leave", content: null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task ConfirmTeam_WhenFormingTeamMeetsMinimum_ReturnsOk()
    {
        await ClearRegistrationDataAsync();
        var adminId = Guid.NewGuid();
        var playerId = Guid.NewGuid();
        var teamId = await SeedFormingTeamAsync(playerId, recruitmentOpen: false);
        using var adminClient = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Admin],
            adminId
        );

        var response = await adminClient.PostAsync(
            $"/api/game/registration/teams/{teamId}/confirm",
            content: null
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<RegistrationTeamDto>();
        Assert.NotNull(payload);
        Assert.Equal("confirmed", payload.Status);
    }

    [Fact]
    public async Task DeclineInvitation_WhenPending_ReturnsOk()
    {
        await ClearRegistrationDataAsync();
        var userId = Guid.NewGuid();
        var invitationId = await SeedPendingInvitationAsync(userId);
        await SeedUserAsync(userId);
        using var viewerClient = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Viewer],
            userId
        );

        var response = await viewerClient.PostAsync(
            $"/api/game/registration/invitations/{invitationId}/decline",
            content: null
        );

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task JoinTeam_WhenRecruitmentClosed_ReturnsConflict()
    {
        await ClearRegistrationDataAsync();
        var ownerId = Guid.NewGuid();
        var joinerId = Guid.NewGuid();
        var teamId = await SeedFormingTeamAsync(ownerId, recruitmentOpen: false);
        await SeedUserAsync(joinerId, "joiner");
        using var joinerClient = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Viewer],
            joinerId
        );

        var response = await joinerClient.PostAsync(
            $"/api/game/registration/teams/{teamId}/join",
            content: null
        );

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(payload);
        Assert.Equal(AppMessages.Client.GameRegistrationTeamNotJoinable, payload.Error);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationTeamNotJoinable, payload.Code);
    }

    [Fact]
    public async Task CreateInvitation_WhenDuplicatePendingForUser_ReturnsConflict()
    {
        await ClearRegistrationDataAsync();
        var adminId = Guid.NewGuid();
        var invitedUserId = Guid.NewGuid();
        await SeedReadyGameAsync();
        await SeedUserAsync(invitedUserId, "invited-player");
        var slotId = await GetFirstSlotIdForReadyGameAsync();
        using var adminClient = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Admin],
            adminId
        );

        var request = new CreateAdminInvitationRequestDto(slotId, invitedUserId, null);

        var firstResponse = await adminClient.PostAsJsonAsync("/api/game/registration/invitations", request);
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        var secondResponse = await adminClient.PostAsJsonAsync("/api/game/registration/invitations", request);

        Assert.Equal(HttpStatusCode.Conflict, secondResponse.StatusCode);
        var payload = await secondResponse.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(payload);
        Assert.Equal(AppMessages.Client.GameRegistrationPendingInvitationExists, payload.Error);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationPendingInvitation, payload.Code);
    }

    [Fact]
    public async Task CreateInvitation_WhenInvitedUserMissing_ReturnsNotFoundWithSpecificCode()
    {
        await ClearRegistrationDataAsync();
        var adminId = Guid.NewGuid();
        await SeedReadyGameAsync();
        var slotId = await GetFirstSlotIdForReadyGameAsync();
        using var adminClient = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Admin],
            adminId
        );

        var response = await adminClient.PostAsJsonAsync(
            "/api/game/registration/invitations",
            new CreateAdminInvitationRequestDto(slotId, Guid.NewGuid(), null)
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(payload);
        Assert.Equal(AppMessages.Client.UserMissingOrInactive, payload.Error);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationUserNotFound, payload.Code);
    }

    [Fact]
    public async Task CreateInvitation_WhenSlotAlreadyHasPendingInvite_ReturnsConflict()
    {
        await ClearRegistrationDataAsync();
        var adminId = Guid.NewGuid();
        var firstInvitedUserId = Guid.NewGuid();
        var secondInvitedUserId = Guid.NewGuid();
        await SeedReadyGameAsync();
        await SeedUserAsync(firstInvitedUserId, "invited-one");
        await SeedUserAsync(secondInvitedUserId, "invited-two");
        var slotId = await GetFirstSlotIdForReadyGameAsync();
        using var adminClient = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Admin],
            adminId
        );

        var firstResponse = await adminClient.PostAsJsonAsync(
            "/api/game/registration/invitations",
            new CreateAdminInvitationRequestDto(slotId, firstInvitedUserId, null)
        );
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        var secondResponse = await adminClient.PostAsJsonAsync(
            "/api/game/registration/invitations",
            new CreateAdminInvitationRequestDto(slotId, secondInvitedUserId, null)
        );

        Assert.Equal(HttpStatusCode.Conflict, secondResponse.StatusCode);
        var payload = await secondResponse.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(payload);
        Assert.Equal(AppMessages.Client.GameRegistrationSlotNotAvailable, payload.Error);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationSlotNotAvailable, payload.Code);
    }

    private async Task ClearRegistrationDataAsync()
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

    private async Task SeedReadyGameAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var utc = DateTime.UtcNow;
        var gameId = Guid.NewGuid();
        dbContext.Games.Add(
            new Game
            {
                Id = gameId,
                Title = "Ready game",
                Status = GameStatusValue.Ready,
                CreatedAtUtc = utc,
                ReadyAtUtc = utc,
                MinPlayersPerTeam = 1,
                MaxPlayersPerTeam = 3
            }
        );
        dbContext.GameParticipationSlots.Add(
            new GameParticipationSlot
            {
                Id = Guid.NewGuid(),
                GameId = gameId,
                SlotIndex = 1,
                Availability = SlotAvailabilityValue.Public,
                CreatedAtUtc = utc
            }
        );
        await dbContext.SaveChangesAsync();
    }

    private async Task SeedUserAsync(Guid userId, string login = "player")
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var utc = DateTime.UtcNow;
        dbContext.Users.Add(
            new User
            {
                Id = userId,
                TwitchUserId = userId.ToString("N")[..15],
                Login = login,
                DisplayName = login,
                IsActive = true,
                CreatedAtUtc = utc,
                UpdatedAtUtc = utc
            }
        );
        await dbContext.SaveChangesAsync();
    }

    private async Task<Guid> SeedFormingTeamAsync(Guid ownerId, bool recruitmentOpen)
    {
        await SeedReadyGameAsync();
        await SeedUserAsync(ownerId);
        var gameId = await GetReadyGameIdAsync();
        var slotId = Guid.NewGuid();
        var teamId = Guid.NewGuid();
        var utc = DateTime.UtcNow;
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        dbContext.GameParticipationSlots.Add(
            new GameParticipationSlot
            {
                Id = slotId,
                GameId = gameId,
                SlotIndex = 2,
                Availability = SlotAvailabilityValue.Public,
                CreatedAtUtc = utc
            }
        );
        dbContext.GameTeams.Add(
            new GameTeam
            {
                Id = teamId,
                GameId = gameId,
                SlotId = slotId,
                RecruitmentOpen = recruitmentOpen,
                Status = TeamStatusValue.Forming,
                CreatedByUserId = ownerId,
                CreatedAtUtc = utc,
                UpdatedAtUtc = utc
            }
        );
        dbContext.GameTeamMembers.Add(
            new GameTeamMember
            {
                Id = Guid.NewGuid(),
                GameId = gameId,
                TeamId = teamId,
                UserId = ownerId,
                JoinedAtUtc = utc
            }
        );
        await dbContext.SaveChangesAsync();
        return teamId;
    }

    private async Task<Guid> SeedConfirmedTeamAsync(Guid adminId)
    {
        var teamId = await SeedFormingTeamAsync(adminId, recruitmentOpen: false);
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var team = await dbContext.GameTeams.FirstAsync(team => team.Id == teamId);
        var utc = DateTime.UtcNow;
        team.Status = TeamStatusValue.Confirmed;
        team.ConfirmedAtUtc = utc;
        team.ConfirmedByUserId = adminId;
        team.UpdatedAtUtc = utc;
        await dbContext.SaveChangesAsync();
        return teamId;
    }

    private async Task<Guid> GetReadyGameIdAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await dbContext.Games
            .Where(game => game.Status == GameStatusValue.Ready)
            .Select(game => game.Id)
            .FirstAsync();
    }

    private async Task<Guid> GetFirstSlotIdForReadyGameAsync()
    {
        var gameId = await GetReadyGameIdAsync();
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await dbContext.GameParticipationSlots
            .Where(slot => slot.GameId == gameId)
            .OrderBy(slot => slot.SlotIndex)
            .Select(slot => slot.Id)
            .FirstAsync();
    }

    private async Task<Guid> SeedPendingInvitationAsync(Guid invitedUserId)
    {
        await SeedReadyGameAsync();
        var gameId = await GetReadyGameIdAsync();
        var slotId = Guid.NewGuid();
        var invitationId = Guid.NewGuid();
        var utc = DateTime.UtcNow;
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        dbContext.GameParticipationSlots.Add(
            new GameParticipationSlot
            {
                Id = slotId,
                GameId = gameId,
                SlotIndex = 3,
                Availability = SlotAvailabilityValue.Public,
                CreatedAtUtc = utc
            }
        );
        dbContext.GameParticipationInvitations.Add(
            new GameParticipationInvitation
            {
                Id = invitationId,
                GameId = gameId,
                SlotId = slotId,
                InvitedUserId = invitedUserId,
                InvitedByKind = InvitedByKindValue.Admin,
                Status = ParticipationInvitationStatusValue.Pending,
                CreatedAtUtc = utc
            }
        );
        await dbContext.SaveChangesAsync();
        return invitationId;
    }
}
