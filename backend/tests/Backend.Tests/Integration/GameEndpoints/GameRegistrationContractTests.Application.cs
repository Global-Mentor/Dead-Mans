using System.Net;
using System.Net.Http.Json;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Application.Abstractions.Realtime;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Messaging;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed partial class GameRegistrationContractTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("a")]
    [InlineData("ab")]
    [InlineData(" \t\n\u00a0 ")]
    public async Task CreateTeam_RequiresNameOfAtLeastThreeCharacters(string? name)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        var userId = Guid.NewGuid();
        await SeedUserAsync(userId);
        using var player = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], userId);
        var response = await player.PostAsJsonAsync("/api/game/registration/teams", new CreateRegistrationTeamRequestDto(true, name));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationInvalidTeamName, (await response.Content.ReadFromJsonAsync<ErrorResponse>())!.Code);
        Assert.Empty((await player.GetFromJsonAsync<GameRegistrationSnapshotDto>("/api/game/registration"))!.Teams);
    }

    [Theory]
    [InlineData("player", "ноЧнойдозор")]
    [InlineData("admin", "  НОЧНОЙ \t ДОЗОР ")]
    [InlineData("rename", "ночной\u00a0дозор")]
    public async Task TeamNames_AreUniqueIgnoringCaseAndWhitespace(string action, string equivalentName)
    {
        await ClearRegistrationDataAsync();
        await SeedReadyGameAsync();
        await CreateSlotAsync(2);
        var firstUser = Guid.NewGuid();
        var secondUser = Guid.NewGuid();
        await SeedUserAsync(firstUser, "first");
        await SeedUserAsync(secondUser, "second");
        using var first = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], firstUser);
        using var second = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin, AuthRoleCodes.Viewer], secondUser);
        Assert.Equal(HttpStatusCode.Created, (await first.PostAsJsonAsync("/api/game/registration/teams", new CreateRegistrationTeamRequestDto(true, "Ночной дозор"))).StatusCode);
        if (action == "rename")
            Assert.Equal(HttpStatusCode.Created, (await second.PostAsJsonAsync("/api/game/registration/teams", new CreateRegistrationTeamRequestDto(true, "Другая"))).StatusCode);
        var response = action switch
        {
            "rename" => await second.PatchAsJsonAsync("/api/game/registration/my-team/name", new UpdateRegistrationTeamNameRequestDto(equivalentName)),
            "admin" => await second.PostAsJsonAsync("/api/game/registration/admin/teams", new { recruitmentOpen = true, name = equivalentName }),
            _ => await second.PostAsJsonAsync("/api/game/registration/teams", new CreateRegistrationTeamRequestDto(true, equivalentName))
        };
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationTeamNameTaken, (await response.Content.ReadFromJsonAsync<ErrorResponse>())!.Code);
        Assert.Equal(HttpStatusCode.OK, (await first.PatchAsJsonAsync("/api/game/registration/my-team/name", new UpdateRegistrationTeamNameRequestDto(equivalentName))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await first.PatchAsJsonAsync("/api/game/registration/my-team/name", new UpdateRegistrationTeamNameRequestDto("  "))).StatusCode);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DisbandRequest_OnlyAuthorCanWithdraw_AndSuccessfulWritesPublishEvenWhenRealtimeFails(bool failRealtime)
    {
        await ClearRegistrationDataAsync();
        var authorId = Guid.NewGuid();
        var teammateId = Guid.NewGuid();
        var teamId = await SeedConfirmedTeamAsync(authorId);
        await SeedUserAsync(teammateId, "teammate");
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.GameTeamMembers.Add(new GameTeamMember { Id = Guid.NewGuid(), GameId = await GetReadyGameIdAsync(), TeamId = teamId, UserId = teammateId, JoinedAtUtc = DateTime.UtcNow });
            await db.SaveChangesAsync();
        }
        var events = new RecordingRegistrationEvents(failRealtime);
        using var author = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], authorId, services =>
        {
            services.RemoveAll<IGameRegistrationEventsPublisher>();
            services.AddSingleton<IGameRegistrationEventsPublisher>(events);
        });
        using var teammate = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Viewer], teammateId);
        Assert.Equal(HttpStatusCode.OK, (await author.PostAsync("/api/game/registration/my-team/disband-request", null)).StatusCode);
        Assert.Equal(1, events.Count);
        var forbidden = await teammate.DeleteAsync("/api/game/registration/my-team/disband-request");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        Assert.Equal(AppMessages.ErrorCodes.GameRegistrationDisbandRequestNotOwned, (await forbidden.Content.ReadFromJsonAsync<ErrorResponse>())!.Code);
        var response = await author.DeleteAsync("/api/game/registration/my-team/disband-request");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, events.Count);
        var team = (await response.Content.ReadFromJsonAsync<RegistrationTeamDto>())!;
        Assert.Null(team.DisbandRequestedAtUtc);
        Assert.Null(team.DisbandRequestedByUserId);
        Assert.Equal(TeamStatusValue.Confirmed, team.Status);
        Assert.Equal(2, team.Members.Count);
        Assert.Equal(HttpStatusCode.OK, (await author.PostAsync("/api/game/registration/my-team/disband-request", null)).StatusCode);
        await SetReadyGameActiveAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await author.DeleteAsync("/api/game/registration/my-team/disband-request")).StatusCode);
        Assert.Equal(3, events.Count);
    }

    private sealed class RecordingRegistrationEvents(bool fail) : IGameRegistrationEventsPublisher
    {
        public int Count { get; private set; }
        public Task PublishRegistrationChangedAsync(CancellationToken cancellationToken = default)
        {
            Count++;
            return fail ? Task.FromException(new InvalidOperationException("SignalR unavailable")) : Task.CompletedTask;
        }
    }
}
