using System.Net;
using System.Net.Http.Json;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Application.Abstractions.Realtime;
using backend.Data;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed class GameSetupQuestionAvailabilityContractTests(TestWebApplicationFactory factory)
    : IClassFixture<TestWebApplicationFactory>
{
    [Theory]
    [InlineData("question", false)]
    [InlineData("category", false)]
    [InlineData("edit", false)]
    [InlineData("delete", false)]
    [InlineData("question", true)]
    public async Task DisablingQuestions_SynchronizesDraftAndCatalogEvenWhenRealtimeFails(string action, bool failRealtime)
    {
        factory.ResetDatabase();
        var events = new RecordingSetupEvents(failRealtime);
        using var configured = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IGameSetupEventsPublisher>();
            services.AddSingleton<IGameSetupEventsPublisher>(events);
        }));
        using var admin = TestAuthClientFactory.CreateClient(configured, [AuthRoleCodes.Admin]);
        var first = await CreateQuestionAsync(admin, "First question");
        var second = await CreateQuestionAsync(admin, "Second question", first.CategoryId);
        var draft = await CreateDraftAsync(admin);
        var savedResponse = await admin.PutAsJsonAsync("/api/game/setup", Update(draft, [first.QuestionId, second.QuestionId]));
        Assert.Equal(HttpStatusCode.OK, savedResponse.StatusCode);
        var saved = (await savedResponse.Content.ReadFromJsonAsync<GameSetupSnapshotDto>())!;
        var eventCount = events.Count;

        var changed = action switch
        {
            "category" => await admin.PatchAsJsonAsync($"/api/game/questions/categories/{first.CategoryId}/enabled", new { isEnabled = false }),
            "edit" => await admin.PutAsJsonAsync($"/api/game/questions/{first.QuestionId}",
                new UpdateGameQuestionRequestDto(first.CategoryId, first.Text,
                    [new GameQuestionOptionInputDto("Paris", true), new GameQuestionOptionInputDto("London", false)], 1, false, 0)),
            "delete" => await admin.DeleteAsync($"/api/game/questions/{first.QuestionId}"),
            _ => await admin.PatchAsJsonAsync($"/api/game/questions/{first.QuestionId}/enabled", new { isEnabled = false })
        };
        Assert.True(changed.IsSuccessStatusCode);
        Assert.Equal(eventCount + 1, events.Count);

        var refreshed = (await admin.GetFromJsonAsync<GameSetupSnapshotDto>("/api/game/setup"))!;
        Assert.Equal(saved.Version + 1, refreshed.Version);
        Assert.Equal(saved.Title, refreshed.Title);
        Assert.Equal(saved.Cells.Select(cell => cell.Id), refreshed.Cells.Select(cell => cell.Id));
        Assert.Equal(action == "category" ? [] : new[] { second.QuestionId }, refreshed.EnabledQuestionIds);
        var available = (await admin.GetFromJsonAsync<GameQuestionCatalogItemDto[]>("/api/game/questions/catalog?includeDisabled=false"))!;
        Assert.DoesNotContain(available, question => question.QuestionId == first.QuestionId);

        var staleSave = await admin.PutAsJsonAsync("/api/game/setup", Update(saved, [first.QuestionId]));
        Assert.Equal(HttpStatusCode.BadRequest, staleSave.StatusCode);
        var stalePublication = await admin.PostAsJsonAsync("/api/game/lifecycle/open-registration",
            new OpenGameRegistrationRequestDto(Guid.Parse(saved.GameId), saved.Version));
        Assert.Equal(HttpStatusCode.Conflict, stalePublication.StatusCode);

        if (action != "delete")
        {
            Assert.Equal(HttpStatusCode.NoContent, (await admin.PatchAsJsonAsync(
                $"/api/game/questions/{first.QuestionId}/enabled", new { isEnabled = true })).StatusCode);
            var enabledAgain = (await admin.GetFromJsonAsync<GameSetupSnapshotDto>("/api/game/setup"))!;
            Assert.Equal(refreshed.Version, enabledAgain.Version);
            Assert.DoesNotContain(first.QuestionId, enabledAgain.EnabledQuestionIds);
        }
    }

    [Fact]
    public async Task SaveDraft_CannotAttachGloballyDisabledQuestion()
    {
        factory.ResetDatabase();
        using var admin = TestAuthClientFactory.CreateClient(factory, [AuthRoleCodes.Admin]);
        var question = await CreateQuestionAsync(admin, "Disabled question", isEnabled: false);
        var draft = await CreateDraftAsync(admin);

        var response = await admin.PutAsJsonAsync("/api/game/setup", Update(draft, [question.QuestionId]));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var unchanged = (await admin.GetFromJsonAsync<GameSetupSnapshotDto>("/api/game/setup"))!;
        Assert.Equal(draft.Version, unchanged.Version);
        Assert.Empty(unchanged.EnabledQuestionIds);
        var catalog = (await admin.GetFromJsonAsync<GameQuestionCatalogItemDto[]>("/api/game/questions/catalog"))!;
        Assert.Contains(catalog, item => item.QuestionId == question.QuestionId && !item.IsEnabled);
        Assert.Empty((await admin.GetFromJsonAsync<GameQuestionCatalogItemDto[]>("/api/game/questions/catalog?includeDisabled=false"))!);
    }

    [Fact]
    public async Task DisableQuestion_LeavesPublishedSnapshotIntact()
    {
        factory.ResetDatabase();
        using var admin = TestAuthClientFactory.CreateClient(factory, [AuthRoleCodes.Admin]);
        var question = await CreateQuestionAsync(admin, "Published question");
        var draft = await CreateDraftAsync(admin);
        Assert.Equal(HttpStatusCode.OK, (await admin.PutAsJsonAsync("/api/game/setup", Update(draft, [question.QuestionId]))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync("/api/game/lifecycle/open-registration", null)).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await admin.PatchAsJsonAsync(
            $"/api/game/questions/{question.QuestionId}/enabled", new { isEnabled = false })).StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var published = await db.GameEnabledQuestions.SingleAsync();
        Assert.Equal(question.QuestionId, published.QuestionId.ToString());
        Assert.Equal(question.Text, published.QuestionTextSnapshot);
        Assert.Equal("ready", (await db.Games.SingleAsync()).Status);
    }

    private static async Task<GameQuestionCatalogItemDto> CreateQuestionAsync(
        HttpClient admin, string text, string? categoryId = null, bool isEnabled = true)
    {
        if (categoryId is null)
        {
            var createdCategory = await admin.PostAsJsonAsync("/api/game/questions/categories", new { name = "Availability" });
            categoryId = (await createdCategory.Content.ReadFromJsonAsync<GameQuestionCategoryItemDto>())!.Id;
        }
        var response = await admin.PostAsJsonAsync("/api/game/questions",
            new CreateGameQuestionRequestDto(null, categoryId, text,
                [new GameQuestionOptionInputDto("Paris", true), new GameQuestionOptionInputDto("London", false)],
                1, isEnabled, 0));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<GameQuestionCatalogItemDto>())!;
    }

    private static async Task<GameSetupSnapshotDto> CreateDraftAsync(HttpClient admin)
    {
        var response = await admin.PostAsJsonAsync("/api/game/setup", new CreateGameSetupRequestDto("Availability draft"));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<GameSetupSnapshotDto>())!;
    }

    private static UpdateGameSetupRequestDto Update(GameSetupSnapshotDto draft, string[] questions) => new(
        draft.Version, draft.Title, draft.RowLabels, draft.ColLabels,
        draft.Cells.Select(cell => new UpdateGameSetupCellDto(cell.Id, cell.Row, cell.Col, cell.Title, cell.Cost)).ToArray(),
        [], questions);

    private sealed class RecordingSetupEvents(bool fail) : IGameSetupEventsPublisher
    {
        public int Count { get; private set; }
        public Task PublishDraftChangedAsync(CancellationToken cancellationToken = default)
        {
            Count++;
            return fail ? Task.FromException(new InvalidOperationException("Realtime unavailable")) : Task.CompletedTask;
        }
    }
}
