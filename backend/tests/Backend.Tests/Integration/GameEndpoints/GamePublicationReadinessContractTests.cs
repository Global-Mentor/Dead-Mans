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

public sealed class GamePublicationReadinessContractTests(TestWebApplicationFactory factory)
    : IClassFixture<TestWebApplicationFactory>
{
    [Theory]
    [InlineData(false, false, HttpStatusCode.Conflict, AppMessages.ErrorCodes.GameLifecycleEmptyModifiersNotAcknowledged)]
    [InlineData(true, false, HttpStatusCode.Conflict, AppMessages.ErrorCodes.GameLifecycleEmptyQuestionsNotAcknowledged)]
    [InlineData(false, true, HttpStatusCode.Conflict, AppMessages.ErrorCodes.GameLifecycleEmptyModifiersNotAcknowledged)]
    [InlineData(true, true, HttpStatusCode.OK, null)]
    public async Task EmptySelections_RequireEachExplicitConsent(bool modifiers, bool questions, HttpStatusCode status, string? code)
    {
        var (client, draft) = await CreateDraftAsync();
        using (client)
        {
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await PublicationTestData.AddMediaAsync(db, Guid.Parse(draft.GameId));
            // A card name is optional, including when publishing.
            foreach (var cell in await db.BoardCells.ToListAsync()) cell.Title = "";
            await db.SaveChangesAsync();
            var slotsBefore = await db.GameTeamSlots.Select(slot => slot.Id).OrderBy(id => id).ToArrayAsync();
            var response = await client.PostAsJsonAsync("/api/game/lifecycle/open-registration",
                new OpenGameRegistrationRequestDto(Guid.Parse(draft.GameId), draft.Version, modifiers, questions));
            Assert.Equal(status, response.StatusCode);
            if (code is not null)
            {
                Assert.Equal(code, (await response.Content.ReadFromJsonAsync<ErrorResponse>())!.Code);
                db.ChangeTracker.Clear();
                Assert.Equal(GameStatusValue.Draft, (await db.Games.SingleAsync()).Status);
                Assert.Equal(slotsBefore, await db.GameTeamSlots.Select(slot => slot.Id).OrderBy(id => id).ToArrayAsync());
            }
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task MissingMedia_CannotBeBypassedWithBothConsents(bool oneMissing)
    {
        var (client, draft) = await CreateDraftAsync();
        using (client)
        {
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            if (oneMissing)
            {
                await PublicationTestData.AddMediaAsync(db, Guid.Parse(draft.GameId));
                db.BoardCellMedia.Remove(await db.BoardCellMedia.FirstAsync());
                await db.SaveChangesAsync();
            }
            var slotsBefore = await db.GameTeamSlots.Select(slot => slot.Id).OrderBy(id => id).ToArrayAsync();
            var response = await client.PostAsJsonAsync("/api/game/lifecycle/open-registration",
                new OpenGameRegistrationRequestDto(Guid.Parse(draft.GameId), draft.Version, true, true));
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal(AppMessages.ErrorCodes.GameLifecycleCellMediaRequired, (await response.Content.ReadFromJsonAsync<ErrorResponse>())!.Code);
            db.ChangeTracker.Clear();
            Assert.Equal(GameStatusValue.Draft, (await db.Games.SingleAsync()).Status);
            Assert.Equal(slotsBefore, await db.GameTeamSlots.Select(slot => slot.Id).OrderBy(id => id).ToArrayAsync());
        }
    }

    [Fact]
    public async Task LegacyBodyWithoutConsent_CannotPublishEmptySelections()
    {
        var (client, draft) = await CreateDraftAsync();
        using (client)
        {
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await PublicationTestData.AddMediaAsync(db, Guid.Parse(draft.GameId));
            var response = await client.PostAsync("/api/game/lifecycle/open-registration", null);
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal(AppMessages.ErrorCodes.GameLifecycleEmptyModifiersNotAcknowledged, (await response.Content.ReadFromJsonAsync<ErrorResponse>())!.Code);
        }
    }

    [Fact]
    public async Task Start_RevalidatesMediaForLegacyReadyGames()
    {
        var (client, _) = await CreateDraftAsync();
        using (client)
        {
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var game = await db.Games.SingleAsync();
            game.Status = GameStatusValue.Ready;
            game.ReadyAtUtc = DateTime.UtcNow;
            var userId = Guid.NewGuid();
            var teamId = Guid.NewGuid();
            db.GameTeams.Add(new GameTeam
            {
                Id = teamId,
                GameId = game.Id,
                SlotId = (await db.GameTeamSlots.FirstAsync()).Id,
                Status = TeamStatusValue.Confirmed,
                ConfirmedAtUtc = DateTime.UtcNow,
                RecruitmentOpen = false,
                CreatedByUserId = userId
            });
            db.GameTeamMembers.Add(new GameTeamMember { Id = Guid.NewGuid(), GameId = game.Id, TeamId = teamId, UserId = userId });
            await db.SaveChangesAsync();
            var response = await client.PostAsync("/api/game/lifecycle/start", null);
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal(AppMessages.ErrorCodes.GameLifecycleCellMediaRequired, (await response.Content.ReadFromJsonAsync<ErrorResponse>())!.Code);
            db.ChangeTracker.Clear();
            Assert.Equal(GameStatusValue.Ready, (await db.Games.SingleAsync()).Status);
        }
    }

    private async Task<(HttpClient Client, GameSetupSnapshotDto Draft)> CreateDraftAsync()
    {
        factory.ResetDatabase();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Games.RemoveRange(await db.Games.ToListAsync());
        await db.SaveChangesAsync();
        var client = TestAuthClientFactory.CreateClient(factory, [AuthRoleCodes.Admin]);
        var response = await client.PostAsJsonAsync("/api/game/setup", new CreateGameSetupRequestDto("Readiness"));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (client, (await response.Content.ReadFromJsonAsync<GameSetupSnapshotDto>())!);
    }
}
