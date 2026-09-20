using System.Net;
using System.Net.Http.Json;
using System.Text;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using Backend.Tests.Support;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed class GameQuestionContractTests(TestWebApplicationFactory factory)
    : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task CurrentQuiz_WhenNoQuestionExists_ReturnsNoContentForAuthenticatedViewer()
    {
        factory.ResetDatabase();
        using var client = TestAuthClientFactory.CreateClient(factory, [AuthRoleCodes.Viewer]);
        var response = await client.GetAsync("/api/game/quiz/current");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task CreateAndUpdate_AcceptMultipleChoiceOptions()
    {
        using var client = CreateAdminClient();
        var categoryId = await CreateCategoryAsync(client);
        var createdResponse = await client.PostAsJsonAsync("/api/game/questions", new
        {
            categoryId,
            text = "Capital?",
            options = new[] { new { text = "Paris", isCorrect = true }, new { text = "London", isCorrect = false } },
            reward = 1
        });
        Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
        var created = await createdResponse.Content.ReadFromJsonAsync<GameQuestionCatalogItemDto>();
        Assert.NotNull(created);
        Assert.Equal("Paris", Assert.Single(created.Options, x => x.IsCorrect).Text);
        Assert.Equal(2, created.Options.Length);

        var updatedResponse = await client.PutAsJsonAsync($"/api/game/questions/{created.QuestionId}", new
        {
            categoryId,
            text = "New capital?",
            options = new[] { new { text = "Warsaw", isCorrect = true }, new { text = "Berlin", isCorrect = false } },
            reward = 2
        });
        Assert.Equal(HttpStatusCode.OK, updatedResponse.StatusCode);
        var updated = await updatedResponse.Content.ReadFromJsonAsync<GameQuestionCatalogItemDto>();
        Assert.NotNull(updated);
        Assert.Equal("Warsaw", Assert.Single(updated.Options, x => x.IsCorrect).Text);
    }

    [Fact]
    public async Task CreateAndUpdate_RejectNullOptionsWithoutChangingTheQuestion()
    {
        using var client = CreateAdminClient();
        var categoryId = await CreateCategoryAsync(client);
        var payload = new
        {
            categoryId,
            text = "Capital?",
            reward = 5,
            options = new object?[] { new { text = "Paris", isCorrect = true }, null, new { text = "London", isCorrect = false } }
        };
        var invalidCreate = await client.PostAsJsonAsync("/api/game/questions", payload);
        Assert.Equal(HttpStatusCode.BadRequest, invalidCreate.StatusCode);
        var validCreate = await client.PostAsJsonAsync("/api/game/questions", new
        {
            categoryId,
            text = "Original?",
            reward = 1,
            options = new[] { new { text = "Yes", isCorrect = true }, new { text = "No", isCorrect = false } }
        });
        Assert.Equal(HttpStatusCode.Created, validCreate.StatusCode);
        var created = (await validCreate.Content.ReadFromJsonAsync<GameQuestionCatalogItemDto>())!;
        var invalidUpdate = await client.PutAsJsonAsync($"/api/game/questions/{created.QuestionId}", payload);
        Assert.Equal(HttpStatusCode.BadRequest, invalidUpdate.StatusCode);
        var catalog = await client.GetFromJsonAsync<GameQuestionCatalogItemDto[]>("/api/game/questions/catalog");
        Assert.Equal("Original?", Assert.Single(catalog!).Text);
    }

    [Fact]
    public async Task Import_RejectsNullOptionWithoutDroppingItAndImportsOtherQuestions()
    {
        using var client = CreateAdminClient();
        using var body = new MultipartFormDataContent();
        body.Add(new StringContent(
            """
            { "questions": [
                { "text": "Invalid?", "options": [{"text":"Paris","isCorrect":true},null,{"text":"London","isCorrect":false}], "reward": 1 },
                { "text": "Valid?", "options": [{"text":"Yes","isCorrect":true},{"text":"No","isCorrect":false}], "reward": 1 }
            ] }
            """, Encoding.UTF8, "application/json"), "file", "questions.jsonc");
        var response = await client.PostAsync("/api/game/questions/import", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = (await response.Content.ReadFromJsonAsync<ImportGameQuestionsResultDto>())!;
        Assert.Equal(1, result.ImportedCount);
        var skipped = Assert.Single(result.SkippedQuestions);
        Assert.Equal(1, skipped.RowNumber);
        Assert.Equal(3, skipped.SourceQuestion!.Options!.Length);
        Assert.Equal(string.Empty, skipped.SourceQuestion.Options[1].Text);
        var catalog = await client.GetFromJsonAsync<GameQuestionCatalogItemDto[]>("/api/game/questions/catalog");
        Assert.Equal("Valid?", Assert.Single(catalog!).Text);
    }

    [Fact]
    public async Task Create_RejectsInvalidOptionSets()
    {
        using var client = CreateAdminClient();
        var categoryId = await CreateCategoryAsync(client);
        var validResponse = await client.PostAsJsonAsync("/api/game/questions", new
        {
            categoryId,
            text = "Capital?",
            options = new[] { new { text = "Paris", isCorrect = true }, new { text = "London", isCorrect = false } },
            reward = 1
        });
        Assert.Equal(HttpStatusCode.Created, validResponse.StatusCode);

        var invalidResponse = await client.PostAsJsonAsync("/api/game/questions", new
        {
            categoryId,
            text = "Capital?",
            options = new[] { new { text = "", isCorrect = true }, new { text = "  ", isCorrect = false } },
            reward = 1
        });
        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);
    }

    [Fact]
    public async Task Import_NormalizesOptionsAndPreservesRejectedSourceForRetry()
    {
        using var client = CreateAdminClient();
        using var body = new MultipartFormDataContent();
        body.Add(new StringContent(
            """
            { "questions": [
                { "text": "Capital?", "options": [{"text":"Paris","isCorrect":true},{"text":"London","isCorrect":false}], "reward": 1 },
                { "text": "Invalid?", "options": [{"text":"","isCorrect":true},{"text":"  ","isCorrect":false}], "reward": 1 }
            ] }
            """, Encoding.UTF8, "application/json"), "file", "questions.jsonc");

        var response = await client.PostAsync("/api/game/questions/import", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ImportGameQuestionsResultDto>();
        Assert.NotNull(result);
        Assert.Equal(1, result.ImportedCount);
        var skipped = Assert.Single(result.SkippedQuestions);
        Assert.Equal(2, skipped.RowNumber);
        Assert.NotNull(skipped.SourceQuestion?.Options);
        Assert.Equal(["", "  "], skipped.SourceQuestion.Options.Select(x => x.Text));
        var catalog = await client.GetFromJsonAsync<GameQuestionCatalogItemDto[]>("/api/game/questions/catalog");
        Assert.Equal(["Paris", "London"], Assert.Single(catalog!).Options.Select(x => x.Text));
    }

    [Theory]
    [InlineData(AuthRoleCodes.Viewer)]
    [InlineData(AuthRoleCodes.Moderator)]
    public async Task CatalogAndAnswerMutations_AreRestrictedToAdmins(string role)
    {
        using var client = TestAuthClientFactory.CreateClient(factory, [role]);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/game/questions/catalog")).StatusCode);
        var response = await client.PostAsJsonAsync("/api/game/questions", new
        {
            categoryId = Guid.NewGuid(),
            text = "Capital?",
            answers = new[] { "Paris" },
            reward = 1
        });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private HttpClient CreateAdminClient()
    {
        factory.ResetDatabase();
        var client = TestAuthClientFactory.CreateClient(factory, [AuthRoleCodes.Admin]);
        client.DefaultRequestHeaders.Add("X-Dead-Mans-Api-Client", "1");
        return client;
    }

    private static async Task<string> CreateCategoryAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/game/questions/categories", new { name = "Geography" });
        response.EnsureSuccessStatusCode();
        var category = await response.Content.ReadFromJsonAsync<GameQuestionCategoryItemDto>();
        Assert.NotNull(category);
        return category.Id;
    }
}
