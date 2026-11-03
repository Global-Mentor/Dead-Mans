using System.Net;
using System.Net.Http.Json;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using Backend.Tests.Support;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed class QuestionCategoryFormatContractTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task EmptyCataloguesHaveIndependentProtectedFallbacksAndNames()
    {
        factory.ResetDatabase();
        using var authenticated = TestAuthClientFactory.CreateFactory(factory, [AuthRoleCodes.Admin]);
        using var client = authenticated.CreateClient();
        var text = Assert.Single((await client.GetFromJsonAsync<GameQuestionCategoryItemDto[]>("/api/game/questions/categories"))!);
        var screenshot = Assert.Single((await client.GetFromJsonAsync<GameQuestionCategoryItemDto[]>("/api/game/questions/categories?format=screenshot"))!);
        Assert.True(text.IsProtected);
        Assert.True(screenshot.IsProtected);
        Assert.NotEqual(text.Id, screenshot.Id);
        Assert.Equal(text.Name, screenshot.Name);
        foreach (var category in new[] { text, screenshot })
        {
            Assert.Equal(HttpStatusCode.Conflict, (await client.DeleteAsync($"/api/game/questions/categories/{category.Id}")).StatusCode);
            Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync($"/api/game/questions/categories/{category.Id}", new { name = "Changed" })).StatusCode);
        }

        using var textCreate = await client.PostAsJsonAsync("/api/game/questions/categories?format=text", new { name = "Locations" });
        using var screenshotCreate = await client.PostAsJsonAsync("/api/game/questions/categories?format=screenshot", new { name = "Locations" });
        Assert.Equal(HttpStatusCode.Created, textCreate.StatusCode);
        Assert.Equal(HttpStatusCode.Created, screenshotCreate.StatusCode);
        var textCategory = (await textCreate.Content.ReadFromJsonAsync<GameQuestionCategoryItemDto>())!;
        var screenshotCategory = (await screenshotCreate.Content.ReadFromJsonAsync<GameQuestionCategoryItemDto>())!;
        Assert.NotEqual(textCategory.Id, screenshotCategory.Id);

        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/game/questions/categories/{screenshotCategory.Id}", new { name = "Screenshot places" })).StatusCode);
        var textCategories = (await client.GetFromJsonAsync<GameQuestionCategoryItemDto[]>("/api/game/questions/categories?format=text"))!;
        Assert.Equal("Locations", Assert.Single(textCategories, x => x.Id == textCategory.Id).Name);
        Assert.DoesNotContain(textCategories, x => x.Id == screenshotCategory.Id);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/game/questions/categories/{screenshotCategory.Id}")).StatusCode);
        Assert.Single((await client.GetFromJsonAsync<GameQuestionCategoryItemDto[]>("/api/game/questions/categories?format=screenshot"))!);
        Assert.Equal(2, (await client.GetFromJsonAsync<GameQuestionCategoryItemDto[]>("/api/game/questions/categories"))!.Length);
    }

    [Fact]
    public async Task UnknownFormatIsRejected()
    {
        using var authenticated = TestAuthClientFactory.CreateFactory(factory, [AuthRoleCodes.Admin]);
        using var client = authenticated.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/game/questions/categories?format=other")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/game/questions/categories?format=other", new { name = "Other" })).StatusCode);
    }

    [Fact]
    public async Task TextQuestionCannotUseScreenshotCategoryOnCreateOrEdit()
    {
        factory.ResetDatabase();
        using var authenticated = TestAuthClientFactory.CreateFactory(factory, [AuthRoleCodes.Admin]);
        using var client = authenticated.CreateClient();
        var text = Assert.Single((await client.GetFromJsonAsync<GameQuestionCategoryItemDto[]>("/api/game/questions/categories"))!);
        var screenshot = Assert.Single((await client.GetFromJsonAsync<GameQuestionCategoryItemDto[]>("/api/game/questions/categories?format=screenshot"))!);
        object Request(string categoryId) => new
        {
            categoryId,
            text = "Which answer?",
            reward = 1,
            options = new[] { new { text = "Correct", isCorrect = true }, new { text = "Wrong", isCorrect = false } }
        };
        using var rejectedCreate = await client.PostAsJsonAsync("/api/game/questions", Request(screenshot.Id));
        Assert.Equal(HttpStatusCode.NotFound, rejectedCreate.StatusCode);
        using var create = await client.PostAsJsonAsync("/api/game/questions", Request(text.Id));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var question = (await create.Content.ReadFromJsonAsync<GameQuestionCatalogItemDto>())!;
        using var rejectedEdit = await client.PutAsJsonAsync($"/api/game/questions/{question.QuestionId}", Request(screenshot.Id));
        Assert.Equal(HttpStatusCode.NotFound, rejectedEdit.StatusCode);
        var catalog = (await client.GetFromJsonAsync<GameQuestionCatalogItemDto[]>("/api/game/questions/catalog"))!;
        Assert.Equal(text.Id, Assert.Single(catalog).CategoryId);
    }
}
