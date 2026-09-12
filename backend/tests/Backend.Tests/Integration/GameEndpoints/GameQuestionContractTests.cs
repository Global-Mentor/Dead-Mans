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
    public async Task CreateAndUpdate_AcceptAnswerArraysWithoutTheLegacyField()
    {
        using var client = CreateAdminClient();
        var categoryId = await CreateCategoryAsync(client);
        var createdResponse = await client.PostAsJsonAsync("/api/game/questions", new
        {
            categoryId,
            text = "Capital?",
            answers = new[] { "Paris", "Париж" },
            reward = 1
        });
        Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
        var created = await createdResponse.Content.ReadFromJsonAsync<GameQuestionCatalogItemDto>();
        Assert.NotNull(created);
        Assert.Equal("Paris", created.Answer);
        Assert.Equal(["Paris", "Париж"], created.Answers);

        var updatedResponse = await client.PutAsJsonAsync($"/api/game/questions/{created.QuestionId}", new
        {
            categoryId,
            text = "New capital?",
            answers = new[] { "Warsaw", "Варшава" },
            reward = 2
        });
        Assert.Equal(HttpStatusCode.OK, updatedResponse.StatusCode);
        var updated = await updatedResponse.Content.ReadFromJsonAsync<GameQuestionCatalogItemDto>();
        Assert.NotNull(updated);
        Assert.Equal("Warsaw", updated.Answer);
        Assert.Equal(["Warsaw", "Варшава"], updated.Answers);
    }

    [Fact]
    public async Task Create_PreservesLegacyClientsAndRejectsMissingAnswers()
    {
        using var client = CreateAdminClient();
        var categoryId = await CreateCategoryAsync(client);
        var legacyResponse = await client.PostAsJsonAsync("/api/game/questions", new
        {
            categoryId,
            text = "Capital?",
            answer = "Paris",
            reward = 1
        });
        Assert.Equal(HttpStatusCode.Created, legacyResponse.StatusCode);
        var created = await legacyResponse.Content.ReadFromJsonAsync<GameQuestionCatalogItemDto>();
        Assert.NotNull(created);
        Assert.Equal(["Paris"], created.Answers);

        var invalidResponse = await client.PostAsJsonAsync("/api/game/questions", new
        {
            categoryId,
            text = "Capital?",
            answers = new[] { "", "  " },
            reward = 1
        });
        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);
    }

    [Fact]
    public async Task Import_NormalizesAnswersAndPreservesRejectedSourceForRetry()
    {
        using var client = CreateAdminClient();
        using var body = new MultipartFormDataContent();
        body.Add(new StringContent(
            """
            { "questions": [
                { "text": "Capital?", "answers": ["Paris", null, " paris ", "Париж"], "reward": 1 },
                { "text": "Invalid?", "answers": ["", "  "], "reward": 1 }
            ] }
            """, Encoding.UTF8, "application/json"), "file", "questions.jsonc");

        var response = await client.PostAsync("/api/game/questions/import", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ImportGameQuestionsResultDto>();
        Assert.NotNull(result);
        Assert.Equal(1, result.ImportedCount);
        var skipped = Assert.Single(result.SkippedQuestions);
        Assert.Equal(2, skipped.RowNumber);
        Assert.NotNull(skipped.SourceQuestion?.Answers);
        Assert.Equal(["", "  "], skipped.SourceQuestion.Answers);
        var catalog = await client.GetFromJsonAsync<GameQuestionCatalogItemDto[]>("/api/game/questions/catalog");
        Assert.Equal(["Paris", "Париж"], Assert.Single(catalog!).Answers);
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
