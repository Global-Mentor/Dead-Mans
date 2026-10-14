using System.Net;
using System.Net.Http.Json;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Data;
using backend.Domain.Persistence;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed partial class GameRegistrationContractTests
{
    [Theory]
    [InlineData(AuthRoleCodes.Admin, false)]
    [InlineData(AuthRoleCodes.Admin, true)]
    [InlineData(AuthRoleCodes.SuperAdmin, false)]
    [InlineData(AuthRoleCodes.SuperAdmin, true)]
    [InlineData(AuthRoleCodes.Moderator, false)]
    [InlineData(AuthRoleCodes.Moderator, true)]
    public async Task CreateAdminTeam_AutomaticPlacementAppendsAcrossAFreeMiddleSlot(string role, bool active)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var firstSlot = await GetFirstSlotIdForReadyGameAsync();
        await CreateSlotAsync(2);
        var thirdSlot = await CreateSlotAsync(3);
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        foreach (var (slot, name) in new[] { (firstSlot, "First team"), (thirdSlot, "Second team") })
        {
            Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/game/registration/admin/teams",
                new CreateAdminRegistrationTeamRequestDto(slot, false, name))).StatusCode);
        }
        if (active) await SetReadyGameActiveAsync();
        using var client = TestAuthClientFactory.CreateClient(_factory, [role]);
        var response = await client.PostAsJsonAsync("/api/game/registration/admin/teams",
            new CreateAdminRegistrationTeamRequestDto(null, true, "New team"));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<RegistrationTeamDto>();
        Assert.NotNull(created);
        Assert.Empty(created.Members);
        Assert.Equal(3, created.TeamSlotIndex);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var ordered = await db.GameTeams.OrderBy(team => team.Slot!.SlotIndex).Select(team => team.Name).ToArrayAsync();
        Assert.Equal(new[] { "First team", "Second team", "New team" }, ordered);
        Assert.Equal(3, await db.GameTeamSlots.CountAsync());
        Assert.All(await db.GameTeamSlots.ToArrayAsync(), slot => Assert.Equal(TeamSlotTypeValue.Public, slot.SlotType));
    }
}
