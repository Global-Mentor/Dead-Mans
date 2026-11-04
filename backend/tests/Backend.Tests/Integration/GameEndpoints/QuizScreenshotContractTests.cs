using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using Backend.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed class QuizScreenshotContractTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Theory]
    [InlineData(null, HttpStatusCode.Unauthorized)]
    [InlineData(AuthRoleCodes.Viewer, HttpStatusCode.Forbidden)]
    [InlineData(AuthRoleCodes.Moderator, HttpStatusCode.Forbidden)]
    public async Task CatalogueAndUploadRequireAdmin(string? role, HttpStatusCode expected)
    {
        using var authenticated = role is null ? null : TestAuthClientFactory.CreateFactory(factory, [role]);
        using var client = (authenticated ?? factory).CreateClient();
        using var upload = Content(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        Assert.Equal(expected, (await client.GetAsync("/api/game/questions/hunt-maps")).StatusCode);
        Assert.Equal(expected, (await client.PostAsync("/api/game/questions/screenshots", upload)).StatusCode);
        var hideStatus = (await client.PostAsync($"/api/game/quiz/question-sessions/{Guid.NewGuid()}/hide", null)).StatusCode;
        Assert.Equal(role == AuthRoleCodes.Moderator ? HttpStatusCode.Conflict : expected, hideStatus);
    }

    [Fact]
    public async Task MultipartUploadBindsSettingsAndRetryReturnsSameLocalizedQuestion()
    {
        factory.ResetDatabase();
        using var authenticated = TestAuthClientFactory.CreateFactory(factory, [AuthRoleCodes.Admin]);
        using var client = authenticated.CreateClient();
        using var scope = authenticated.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        string[] locales = ["en", "ru", "uk", "pl"];
        var map = new HuntMap
        {
            Id = Guid.NewGuid(),
            Code = "test-map",
            Translations = locales.Select(locale => new HuntMapTranslation { Locale = locale, Name = $"Map {locale}" }).ToArray(),
            Locations = Enumerable.Range(0, 6).Select(index => new HuntLocation
            {
                Id = Guid.NewGuid(),
                Code = $"location-{index}",
                Translations = locales.Select(locale => new HuntLocationTranslation { Locale = locale, Name = $"Location {index} {locale}" }).ToArray()
            }).ToArray()
        };
        var category = new QuestionCategory { Format = "screenshot", Id = QuestionCatalogDefaults.LocationScreenshotCategoryId, Name = "Locations", CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.AddRange(map, category);
        await db.SaveChangesAsync();
        var maps = await client.GetFromJsonAsync<HuntMapItemDto[]>("/api/game/questions/hunt-maps");
        Assert.Equal(6, Assert.Single(maps!).Locations.Count);
        var requestId = Guid.NewGuid();
        var locationId = map.Locations.First().Id;
        using var first = Content(requestId, locationId, category.Id);
        using var response = await client.PostAsync("/api/game/questions/screenshots", first);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<UploadQuizScreenshotResponseDto>();
        using var retry = Content(requestId, locationId, category.Id);
        using var repeated = await client.PostAsync("/api/game/questions/screenshots", retry);
        Assert.Equal(HttpStatusCode.OK, repeated.StatusCode);
        Assert.Equal(created, await repeated.Content.ReadFromJsonAsync<UploadQuizScreenshotResponseDto>());
        var question = await db.QuestionDefinitions.AsNoTracking().Include(x => x.Options).SingleAsync();
        Assert.Equal(created!.QuestionId, question.Id.ToString());
        var catalog = await client.GetFromJsonAsync<GameQuestionCatalogItemDto[]>("/api/game/questions/catalog");
        var item = Assert.Single(catalog!);
        Assert.Equal(map.Id.ToString(), item.ScreenshotMapId);
        Assert.Equal(locationId.ToString(), item.ScreenshotLocationId);
        Assert.Equal(7, question.Reward);
        Assert.Equal("Which compound is behind the tower?", question.Text);
        Assert.Equal(-2, question.Priority);
        Assert.True(question.IsEnabled);
        Assert.Equal(6, question.Options.Count);
        Assert.Contains("Location 0 ru", question.Options.Single(x => x.IsCorrect).Text, StringComparison.Ordinal);

        using var conflict = Content(requestId, locationId, category.Id, reward: "8");
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync("/api/game/questions/screenshots", conflict)).StatusCode);
        using var textConflict = Content(requestId, locationId, category.Id, text: "A different question?");
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync("/api/game/questions/screenshots", textConflict)).StatusCode);
        foreach (var text in new[] { "   ", "invalid\0text", new string('x', 500), new string('x', 2001) })
        {
            using var invalidText = Content(Guid.NewGuid(), locationId, category.Id, text: text);
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/game/questions/screenshots", invalidText)).StatusCode);
        }
        using var invalid = Content(Guid.NewGuid(), locationId, category.Id, bytes: "invalid image"u8.ToArray());
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/game/questions/screenshots", invalid)).StatusCode);
        Assert.Equal(1, await db.QuestionDefinitions.CountAsync());
    }

    [Fact]
    public async Task MultipartManualAnswersAreValidatedAndRetriedWithoutLocationFields()
    {
        factory.ResetDatabase();
        using var authenticated = TestAuthClientFactory.CreateFactory(factory, [AuthRoleCodes.Admin]);
        using var client = authenticated.CreateClient();
        var categories = await client.GetFromJsonAsync<GameQuestionCategoryItemDto[]>("/api/game/questions/categories?format=screenshot");
        var fallback = Assert.Single(categories!);
        Assert.False(fallback.IsLocationCategory);
        const string answers = """[{"text":" Medkit ","isCorrect":true},{"text":"Knife","isCorrect":false}]""";
        var requestId = Guid.NewGuid();
        using var content = Content(requestId, null, Guid.Parse(fallback.Id), options: answers);
        using var response = await client.PostAsync("/api/game/questions/screenshots", content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<UploadQuizScreenshotResponseDto>();
        using var retry = Content(requestId, null, Guid.Parse(fallback.Id), options: answers);
        using var repeated = await client.PostAsync("/api/game/questions/screenshots", retry);
        Assert.Equal(HttpStatusCode.OK, repeated.StatusCode);
        Assert.Equal(created, await repeated.Content.ReadFromJsonAsync<UploadQuizScreenshotResponseDto>());
        var catalog = await client.GetFromJsonAsync<GameQuestionCatalogItemDto[]>("/api/game/questions/catalog");
        var question = Assert.Single(catalog!);
        Assert.Null(question.ScreenshotLocationId);
        Assert.Null(question.ScreenshotMapId);
        Assert.Empty(question.Image!.MapNames);
        Assert.Empty(question.Image.OptionNames);
        Assert.Equal(["Medkit", "Knife"], question.Options.Select(option => option.Text));
        foreach (var invalid in new[] { "{", "null", "[null]", "[]", "{}" })
        {
            using var malformed = Content(Guid.NewGuid(), null, Guid.Parse(fallback.Id), options: invalid);
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/game/questions/screenshots", malformed)).StatusCode);
        }
    }

    private static MultipartFormDataContent Content(Guid requestId, Guid? locationId, Guid categoryId,
        string reward = "7", byte[]? bytes = null, string text = "  Which compound is behind the tower?  ", string? options = null)
    {
        var content = new MultipartFormDataContent
        {
            { new StringContent(requestId.ToString()), "requestId" },
            { new StringContent(categoryId.ToString()), "categoryId" },
            { new StringContent(reward), "reward" },
            { new StringContent(text), "text" },
            { new StringContent("-2"), "priority" },
            { new StringContent("true"), "isEnabled" }
        };
        if (locationId.HasValue) content.Add(new StringContent(locationId.Value.ToString()), "locationId");
        if (options is not null) content.Add(new StringContent(options), "options");
        var image = new ByteArrayContent(bytes ?? Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1sAAAAASUVORK5CYII="));
        image.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(image, "file", "screenshot.png");
        return content;
    }
}
