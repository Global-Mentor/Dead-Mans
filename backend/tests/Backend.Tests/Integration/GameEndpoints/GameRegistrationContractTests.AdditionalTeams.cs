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
    [InlineData(AuthRoleCodes.Admin, GameStatusValue.Ready)]
    [InlineData(AuthRoleCodes.SuperAdmin, GameStatusValue.Ready)]
    [InlineData(AuthRoleCodes.Admin, GameStatusValue.Active)]
    [InlineData(AuthRoleCodes.SuperAdmin, GameStatusValue.Active)]
    public async Task CreateAdminTeam_WhenFull_AdminRolesCreateAdditionalReservedSlots(string role, string status)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        var initial = await admin.PostAsJsonAsync("/api/game/registration/admin/teams", new CreateAdminRegistrationTeamRequestDto(null, true, "Initial"));
        Assert.Equal(HttpStatusCode.Created, initial.StatusCode);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            (await db.Games.SingleAsync()).Status = status;
            await db.SaveChangesAsync();
        }
        using var authorized = TestAuthClientFactory.CreateClient(_factory, [role]);
        for (var index = 2; index <= 3; index++)
        {
            var response = await authorized.PostAsJsonAsync("/api/game/registration/admin/teams", new CreateAdminRegistrationTeamRequestDto(null, index == 2, $"Extra {index}"));
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var team = await response.Content.ReadFromJsonAsync<RegistrationTeamDto>();
            Assert.NotNull(team);
            Assert.Equal(index, team.TeamSlotIndex);
            Assert.Equal(TeamSlotTypeValue.Reserved, team.TeamSlotType);
            Assert.Equal(index == 2, team.RecruitmentOpen);
            Assert.Empty(team.Members);
        }
        using var verifyScope = _factory.Services.CreateScope();
        var verify = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(1, await verify.GameTeamSlots.CountAsync(slot => slot.SlotType == TeamSlotTypeValue.Public));
        Assert.Equal(3, await verify.GameTeams.CountAsync());
    }

    [Theory]
    [InlineData(AuthRoleCodes.Moderator, HttpStatusCode.Conflict)]
    [InlineData(AuthRoleCodes.Viewer, HttpStatusCode.Forbidden)]
    public async Task CreateAdminTeam_WhenFull_OtherRolesCannotExpandCapacity(string role, HttpStatusCode expected)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/game/registration/admin/teams", new CreateAdminRegistrationTeamRequestDto(null, true))).StatusCode);
        using var denied = TestAuthClientFactory.CreateClient(_factory, [role]);
        var response = await denied.PostAsJsonAsync("/api/game/registration/admin/teams", new { recruitmentOpen = true, allowAdditionalSlot = true });
        Assert.Equal(expected, response.StatusCode);
        if (role == AuthRoleCodes.Moderator)
        {
            var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
            Assert.Equal(AppMessages.ErrorCodes.GameRegistrationNoSlots, error?.Code);
        }
        using var scope = _factory.Services.CreateScope();
        Assert.Equal(1, await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().GameTeamSlots.CountAsync());
    }

    [Fact]
    public async Task CreateAdminTeam_ExplicitOccupiedSlotStillRefusesWithoutAllocating()
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/game/registration/admin/teams", new CreateAdminRegistrationTeamRequestDto(null, true))).StatusCode);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var slot = await db.GameTeamSlots.SingleAsync();
        var response = await admin.PostAsJsonAsync("/api/game/registration/admin/teams", new CreateAdminRegistrationTeamRequestDto(slot.Id, false));
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(1, await db.GameTeamSlots.CountAsync());
    }
}
