using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Nodes;
using backend.Api.Contracts;
using backend.Application.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Application.Features.GameQuestions;
using backend.Messaging;
using Backend.Tests.Support;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed class GameQuestionImportContractTests(TestWebApplicationFactory factory)
    : IClassFixture<TestWebApplicationFactory>
{
    [Theory]
    [InlineData("en")]
    [InlineData("ru")]
    public async Task DownloadedTemplate_WithTenQuestions_RoundTripsCategoriesDefaultsAndOptions(string locale)
    {
        using var client = CreateAdminClient();
        var geo = await CreateCategory(client, "География");
        var science = await CreateCategory(client, "Наука");
        var response = await client.GetAsync($"/api/game/questions/import-template?locale={locale}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("question-import-template.jsonc", response.Content.Headers.ContentDisposition!.FileName!.Trim('"'));
        var template = await response.Content.ReadAsStringAsync();
        Assert.Contains(geo.Id, template);
        Assert.Contains(science.Id, template);
        var rows = new JsonArray();
        for (var i = 1; i <= 10; i++) rows.Add(ValidRow($"sample-{i}"));
        rows[0]!["categoryId"] = geo.Id;
        rows[0]!["isEnabled"] = true;
        rows[0]!["priority"] = 3;
        rows[1]!["categoryId"] = science.Id;
        rows[2]!["categoryId"] = null;
        rows[3]!["categoryId"] = "  ";
        rows[4]!["categoryId"] = "not-a-guid";
        rows[5]!["categoryId"] = Guid.NewGuid().ToString();
        rows[6]!["categoryId"] = QuestionCatalogDefaults.UncategorizedCategoryId.ToString();
        rows[7]!["reward"] = 0;
        rows[7]!["priority"] = int.MinValue;
        rows[8]!["options"] = new JsonArray(Enumerable.Range(1, 10)
            .Select(i => (JsonNode)new JsonObject { ["text"] = $"Вариант {i}", ["isCorrect"] = i == 10 }).ToArray());
        rows[9]!["text"] = "  Вопрос с\n  пробелами?  ";
        rows[9]!["options"]![0]!["text"] = "  Да\n точно  ";
        rows[9]!["reward"] = int.MaxValue;
        rows[9]!["priority"] = int.MaxValue;
        var jsonc = template[..template.IndexOf("\"questions\"", StringComparison.Ordinal)]
            + "\"questions\": " + rows.ToJsonString() + ",\n}";
        var result = await Import(client, jsonc);
        Assert.Equal(10, result.ImportedCount);
        Assert.Empty(result.SkippedQuestions);
        var catalog = await Catalog(client);
        Assert.Equal(10, catalog.Length);
        Assert.Equal(geo.Id, catalog.Single(x => x.QuestionCode == "sample-1").CategoryId);
        Assert.Equal(science.Id, catalog.Single(x => x.QuestionCode == "sample-2").CategoryId);
        Assert.Equal(8, catalog.Count(x => x.CategoryId == QuestionCatalogDefaults.UncategorizedCategoryId.ToString()));
        Assert.True(catalog.Single(x => x.QuestionCode == "sample-1").IsEnabled);
        Assert.Equal(3, catalog.Single(x => x.QuestionCode == "sample-1").Priority);
        Assert.All(catalog.Where(x => x.QuestionCode != "sample-1"), x => Assert.False(x.IsEnabled));
        Assert.Equal(0, catalog.Single(x => x.QuestionCode == "sample-2").Priority);
        Assert.Equal(int.MinValue, catalog.Single(x => x.QuestionCode == "sample-8").Priority);
        Assert.Equal(10, catalog.Single(x => x.QuestionCode == "sample-9").Options.Length);
        var normalized = catalog.Single(x => x.QuestionCode == "sample-10");
        Assert.Equal("Вопрос с пробелами?", normalized.Text);
        Assert.Equal("Да точно", normalized.Options[0].Text);
        Assert.Equal(int.MaxValue, normalized.Reward);
        var categoryCounts = await client.GetFromJsonAsync<GameQuestionCategoryItemDto[]>("/api/game/questions/categories");
        Assert.Equal(8, categoryCounts!.Single(x => x.IsProtected).QuestionCount);
    }

    [Theory]
    [MemberData(nameof(InvalidRows))]
    public async Task InvalidRow_IsSkippedWithoutLosingValidNeighborsOrItsSource(string scenario, string invalid)
    {
        using var client = CreateAdminClient();
        var result = await Import(client, "{\"questions\":[" + ValidRow("before").ToJsonString()
            + "," + invalid + "," + ValidRow("after").ToJsonString() + "]}");
        Assert.Equal(2, result.ImportedCount);
        var skipped = Assert.Single(result.SkippedQuestions);
        Assert.Equal(2, skipped.RowNumber);
        Assert.Equal(AppMessages.ErrorCodes.GameQuestionImportInvalidFields, skipped.ReasonCode);
        Assert.NotNull(skipped.SourceQuestion);
        var catalog = await Catalog(client);
        Assert.Equal(["after", "before"], catalog.Select(x => x.QuestionCode).Order().ToArray());
        Assert.DoesNotContain(catalog, x => x.QuestionCode == scenario);
    }

    public static IEnumerable<object[]> InvalidRows()
    {
        var changes = new Dictionary<string, Action<JsonObject>>
        {
            ["null-byte-text"] = q => q["text"] = "bad\0text",
            ["null-byte-code"] = q => q["externalCode"] = "bad\0code",
            ["null-byte-option"] = q => q["options"]![0]!["text"] = "bad\0answer",
            ["duplicate-unicode-normalization"] = q => { q["options"]![0]!["text"] = "Café"; q["options"]![1]!["text"] = "Cafe\u0301"; },
            ["missing-correct-flags"] = q => { q["options"]![0]!.AsObject().Remove("isCorrect"); q["options"]![1]!.AsObject().Remove("isCorrect"); },
            ["missing-option-text"] = q => q["options"]![0]!.AsObject().Remove("text"),
            ["null-option-text"] = q => q["options"]![0]!["text"] = null,
            ["nonbreaking-space-only"] = q => q["text"] = "\u00A0\u2003",
            ["missing-text"] = q => q.Remove("text"),
            ["null-text"] = q => q["text"] = null,
            ["blank-text"] = q => q["text"] = " \n ",
            ["missing-reward"] = q => q.Remove("reward"),
            ["null-reward"] = q => q["reward"] = null,
            ["negative-reward"] = q => q["reward"] = -1,
            ["missing-options"] = q => q.Remove("options"),
            ["null-options"] = q => q["options"] = null,
            ["empty-options"] = q => q["options"] = new JsonArray(),
            ["one-option"] = q => q["options"]!.AsArray().RemoveAt(1),
            ["eleven-options"] = q => q["options"] = new JsonArray(Enumerable.Range(1, 11)
                .Select(i => (JsonNode)new JsonObject { ["text"] = $"Option {i}", ["isCorrect"] = i == 1 }).ToArray()),
            ["null-option"] = q => q["options"]!.AsArray().Add((JsonNode?)null),
            ["blank-option"] = q => q["options"]![1]!["text"] = "   ",
            ["no-correct"] = q => q["options"]![0]!["isCorrect"] = false,
            ["two-correct"] = q => q["options"]![1]!["isCorrect"] = true,
            ["duplicate-case-space"] = q => q["options"]![1]!["text"] = "  ДА  ",
            ["duplicate-yo"] = q => { q["options"]![0]!["text"] = "Ёлка"; q["options"]![1]!["text"] = "елка"; },
            ["long-code"] = q => q["externalCode"] = new string('c', 65),
            ["long-text"] = q => q["text"] = new string('q', 2001),
            ["long-option"] = q => q["options"]![0]!["text"] = new string('a', 501),
            ["twitch-question"] = q => q["text"] = new string('q', 490),
            ["twitch-options"] = q => { q["options"]![0]!["text"] = new string('a', 240); q["options"]![1]!["text"] = new string('b', 240); },
            ["twitch-result"] = q => { q["options"]![0]!["text"] = new string('a', 400); q["reward"] = int.MaxValue; },
        };
        yield return ["null-row", "null"];
        foreach (var (name, change) in changes)
        {
            var row = ValidRow(name);
            change(row);
            yield return [name, row.ToJsonString()];
        }
    }

    [Theory]
    [InlineData("")]
    [InlineData("{")]
    [InlineData("null")]
    [InlineData("[]")]
    [InlineData("{}")]
    [InlineData("{\"questions\":null}")]
    [InlineData("{\"questions\":{}}")]
    [InlineData("{\"questions\":[42]}")]
    [InlineData("{\"questions\":[{\"reward\":\"five\"}]}")]
    [InlineData("{\"questions\":[{\"reward\":1.5}]}")]
    [InlineData("{\"questions\":[{\"reward\":2147483648}]}")]
    [InlineData("{\"questions\":[{\"isEnabled\":\"true\"}]}")]
    [InlineData("{\"questions\":[{\"options\":\"Yes\"}]}")]
    [InlineData("{\"questions\":[{\"options\":[{\"isCorrect\":\"true\"}]}]}")]
    [InlineData("{\"questions\":[{\"priority\":\"high\"}]}")]
    [InlineData("{\"questions\":[{\"categoryId\":123}]}")]
    public async Task MalformedDocument_RejectsWholeFileWithoutMutatingCatalog(string invalid)
    {
        using var client = CreateAdminClient();
        await Import(client, "{\"questions\":[" + ValidRow("retained").ToJsonString() + "]}");
        using var body = Form(invalid);
        var response = await client.PostAsync("/api/game/questions/import", body);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(AppMessages.ErrorCodes.GameQuestionInvalidRequest,
            (await response.Content.ReadFromJsonAsync<ErrorResponse>())!.Code);
        Assert.Equal("retained", Assert.Single(await Catalog(client)).QuestionCode);
    }

    [Theory]
    [InlineData("{\"questions\":[{\"externalCode\":true}]}")]
    [InlineData("{\"questions\":[{\"text\":[]}]} ")]
    [InlineData("{\"questions\":[{\"options\":[1]}]}")]
    [InlineData("{\"questions\":[{\"options\":[{\"isCorrect\":null}]}]}")]
    [InlineData("{\"questions\":[{\"priority\":2147483648}]}")]
    [InlineData("{\"questions\":[{\"priority\":1.1}]}")]
    [InlineData("{\"questions\":[{\"reward\":true}]}")]
    [InlineData("{\"questions\":[]} trailing")]
    [InlineData("{\"questions\":[]}{}")]
    [InlineData("{\"questions\":[]}/* unclosed")]
    [InlineData("{\"questions\":[{\"text\":\"\\uD800\"}]}")]
    public Task AdditionalMalformedDocuments_RejectWithoutMutation(string invalid) =>
        MalformedDocument_RejectsWholeFileWithoutMutatingCatalog(invalid);

    [Fact]
    public async Task UnknownFieldsAndCaseInsensitiveNames_AcceptOptionalNullsAndUnicode()
    {
        using var client = CreateAdminClient();
        var row = ValidRow("Unicode-Ж-🧪");
        row["text"] = "🧪 Вопрос о Café?";
        row["priority"] = null;
        row["isEnabled"] = null;
        row["extra"] = new JsonObject { ["nested"] = new JsonArray(1, 2, 3) };
        var json = new JsonObject { ["QUESTIONS"] = new JsonArray(row), ["version"] = 123 }.ToJsonString();
        Assert.Equal(1, (await Import(client, json)).ImportedCount);
        var stored = Assert.Single(await Catalog(client));
        Assert.Equal("🧪 Вопрос о Café?", stored.Text);
        Assert.False(stored.IsEnabled);
        Assert.Equal(0, stored.Priority);
    }

    [Theory]
    [InlineData(484, true)]
    [InlineData(485, false)]
    public async Task TwitchLimit_CountsUnicodeCharactersInsteadOfUtf16Units(int count, bool accepted)
    {
        using var client = CreateAdminClient();
        var row = ValidRow("emoji-limit");
        row["text"] = string.Concat(Enumerable.Repeat("🧪", count));
        var result = await Import(client, new JsonObject { ["questions"] = new JsonArray(row) }.ToJsonString());
        Assert.Equal(accepted ? 1 : 0, result.ImportedCount);
        Assert.Equal(accepted ? 0 : 1, result.SkippedQuestions.Count);
    }

    [Fact]
    public async Task ExcessiveNestingAndInvalidUtf8_AreRejectedWithoutWrites()
    {
        using var client = CreateAdminClient();
        var nested = "{\"questions\":[],\"unknown\":" + new string('[', 70) + "0" + new string(']', 70) + "}";
        using var body = Form(nested);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/game/questions/import", body)).StatusCode);
        using var bytesBody = new MultipartFormDataContent();
        var invalidBytes = Encoding.UTF8.GetBytes("{\"questions\":[{\"text\":\"")
            .Concat(new byte[] { 0xc3, 0x28 }).Concat(Encoding.UTF8.GetBytes("\"}]} ")).ToArray();
        bytesBody.Add(new ByteArrayContent(invalidBytes), "file", "invalid.json");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/game/questions/import", bytesBody)).StatusCode);
        Assert.Empty(await Catalog(client));
    }

    [Fact]
    public async Task InvalidFirstOccurrence_DoesNotReserveCodeForLaterValidRow()
    {
        using var client = CreateAdminClient();
        var invalid = ValidRow("repaired");
        invalid["reward"] = -1;
        var rows = new JsonArray(invalid, ValidRow("repaired"));
        var result = await Import(client, new JsonObject { ["questions"] = rows }.ToJsonString());
        Assert.Equal(1, result.ImportedCount);
        Assert.Equal(1, Assert.Single(result.SkippedQuestions).RowNumber);
        Assert.Equal("repaired", Assert.Single(await Catalog(client)).QuestionCode);
    }

    [Fact]
    public async Task MixedTenRows_ImportSixAndReportFourInOriginalOrderThenRetryOnlyCorrections()
    {
        using var client = CreateAdminClient();
        var rows = new JsonArray(Enumerable.Range(1, 10).Select(i => (JsonNode)ValidRow($"mixed-{i}")).ToArray());
        rows[6]!["text"] = " "; rows[7]!["reward"] = -1;
        rows[8]!["options"]![1]!["isCorrect"] = true;
        rows[9]!["options"]![1]!["text"] = " ДА ";
        var result = await Import(client, new JsonObject { ["questions"] = rows }.ToJsonString());
        Assert.Equal(6, result.ImportedCount);
        Assert.Equal([7, 8, 9, 10], result.SkippedQuestions.Select(x => x.RowNumber).ToArray());
        var corrected = new JsonArray(result.SkippedQuestions.Select(x => (JsonNode)ValidRow(x.SourceQuestion!.ExternalCode!)).ToArray());
        var retry = await Import(client, new JsonObject { ["questions"] = corrected }.ToJsonString());
        Assert.Equal(4, retry.ImportedCount);
        Assert.Empty(retry.SkippedQuestions);
        var repeat = await Import(client, new JsonObject { ["questions"] = rows.DeepClone() }.ToJsonString());
        Assert.Equal(0, repeat.ImportedCount);
        Assert.Equal(10, repeat.SkippedQuestions.Count);
        Assert.Equal(10, (await Catalog(client)).Length);
    }

    [Fact]
    public async Task DuplicateCodes_KeepOriginalAndReportFileAndExistingDuplicates()
    {
        using var client = CreateAdminClient();
        await Import(client, "{\"questions\":[" + ValidRow("existing").ToJsonString() + "]}");
        var rows = new JsonArray(ValidRow("new"), ValidRow("  new  "), ValidRow("existing"), ValidRow(""), ValidRow(""));
        var result = await Import(client, new JsonObject { ["questions"] = rows }.ToJsonString());
        Assert.Equal(3, result.ImportedCount);
        Assert.Equal([2, 3], result.SkippedQuestions.Select(x => x.RowNumber).ToArray());
        Assert.Equal(AppMessages.ErrorCodes.GameQuestionImportDuplicateCodeInFile, result.SkippedQuestions[0].ReasonCode);
        Assert.Equal(AppMessages.ErrorCodes.GameQuestionImportDuplicateCodeExisting, result.SkippedQuestions[1].ReasonCode);
        var catalog = await Catalog(client);
        Assert.Equal(4, catalog.Length);
        Assert.Equal(4, catalog.Select(x => x.QuestionCode).Distinct().Count());
        Assert.Equal("Вопрос existing?", catalog.Single(x => x.QuestionCode == "existing").Text);
    }

    [Fact]
    public async Task EmptyArray_IsSuccessfulNoOpAndJsoncAcceptsBomCommentsAndTrailingCommas()
    {
        using var client = CreateAdminClient();
        Assert.Equal(0, (await Import(client, "{\"questions\":[]}")).ImportedCount);
        Assert.Empty(await Catalog(client));
        var result = await Import(client, "\uFEFF{/* comment */\"questions\":[" + ValidRow("bom").ToJsonString() + ",],}");
        Assert.Equal(1, result.ImportedCount);
    }

    [Fact]
    public async Task TooManyRows_AreRejectedBeforeAnyQuestionIsCreated()
    {
        using var client = CreateAdminClient();
        using var body = Form("{\"questions\":[" + string.Join(',', Enumerable.Repeat("null", GameQuestionImportLimits.MaxQuestionCount + 1)) + "]}");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/game/questions/import", body)).StatusCode);
        Assert.Empty(await Catalog(client));
    }

    [Fact]
    public async Task ExactUploadAndQuestionCountLimits_AreAccepted()
    {
        using var client = CreateAdminClient();
        var emptyDocument = "{\"questions\":[]}";
        var maximumSize = emptyDocument + new string(' ', (int)GameQuestionImportLimits.MaxUploadBytes - emptyDocument.Length);
        Assert.Equal(0, (await Import(client, maximumSize)).ImportedCount);
        var maximumRows = "{\"questions\":[" + string.Join(',', Enumerable.Repeat("null", GameQuestionImportLimits.MaxQuestionCount)) + "]}";
        var result = await Import(client, maximumRows);
        Assert.Equal(0, result.ImportedCount);
        Assert.Equal(GameQuestionImportLimits.MaxQuestionCount, result.SkippedQuestions.Count);
        Assert.Empty(await Catalog(client));
    }

    [Fact]
    public async Task RealHttpUploadLimit_AllowsMaximumFilePlusMultipartEnvelope()
    {
        await using var root = new TestWebApplicationFactory();
        await using var server = TestAuthClientFactory.CreateFactory(root, [AuthRoleCodes.Admin]);
        server.UseKestrel(0);
        using var client = server.CreateClient();
        client.DefaultRequestHeaders.ExpectContinue = true;
        client.DefaultRequestHeaders.Add("X-Dead-Mans-Api-Client", "1");
        var document = "{\"questions\":[]}";
        var maximumFile = document + new string(' ', (int)GameQuestionImportLimits.MaxUploadBytes - document.Length);
        using var maximum = Form(maximumFile);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync("/api/game/questions/import", maximum)).StatusCode);
        using var oversized = Form(maximumFile + " ");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/game/questions/import", oversized)).StatusCode);
        Assert.Empty(await Catalog(client));
    }

    [Fact]
    public async Task MissingExternalCode_GeneratesUniqueCodesAcrossRepeatedImports()
    {
        using var client = CreateAdminClient();
        var row = ValidRow("unused");
        row.Remove("externalCode");
        var payload = "{\"questions\":[" + row.ToJsonString() + "]}";
        Assert.Equal(1, (await Import(client, payload)).ImportedCount);
        Assert.Equal(1, (await Import(client, payload)).ImportedCount);
        var catalog = await Catalog(client);
        Assert.Equal(2, catalog.Length);
        Assert.Equal(2, catalog.Select(x => x.QuestionCode).Distinct().Count());
    }

    [Theory]
    [InlineData(AuthRoleCodes.Viewer)]
    [InlineData(AuthRoleCodes.Moderator)]
    public async Task ImportAndTemplate_AreForbiddenWithoutAdminRole(string role)
    {
        factory.ResetDatabase();
        using var client = TestAuthClientFactory.CreateClient(factory, [role]);
        client.DefaultRequestHeaders.Add("X-Dead-Mans-Api-Client", "1");
        using var body = Form("{\"questions\":[]}");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsync("/api/game/questions/import", body)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/game/questions/import-template")).StatusCode);
    }

    internal static JsonObject ValidRow(string code) => new()
    {
        ["externalCode"] = code,
        ["text"] = $"Вопрос {code}?",
        ["reward"] = 5,
        ["options"] = new JsonArray(new JsonObject { ["text"] = "Да", ["isCorrect"] = true },
            new JsonObject { ["text"] = "Нет", ["isCorrect"] = false })
    };

    internal static MultipartFormDataContent Form(string json)
    {
        var body = new MultipartFormDataContent();
        body.Add(new StringContent(json, Encoding.UTF8, "application/json"), "file", "questions.jsonc");
        return body;
    }

    private HttpClient CreateAdminClient()
    {
        factory.ResetDatabase();
        var client = TestAuthClientFactory.CreateClient(factory, [AuthRoleCodes.Admin]);
        client.DefaultRequestHeaders.Add("X-Dead-Mans-Api-Client", "1");
        return client;
    }

    private static async Task<GameQuestionCategoryItemDto> CreateCategory(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync("/api/game/questions/categories", new { name });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<GameQuestionCategoryItemDto>())!;
    }

    private static async Task<ImportGameQuestionsResultDto> Import(HttpClient client, string json)
    {
        using var body = Form(json);
        var response = await client.PostAsync("/api/game/questions/import", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ImportGameQuestionsResultDto>())!;
    }

    private static async Task<GameQuestionCatalogItemDto[]> Catalog(HttpClient client) =>
        (await client.GetFromJsonAsync<GameQuestionCatalogItemDto[]>("/api/game/questions/catalog"))!;
}
