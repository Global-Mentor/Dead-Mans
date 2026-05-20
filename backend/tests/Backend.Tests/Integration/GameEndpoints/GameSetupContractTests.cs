using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Data;
using backend.Domain.Persistence;
using backend.Messaging;
using Backend.Tests.Support;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Backend.Tests.Integration.GameEndpoints;

public sealed class GameSetupContractTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public GameSetupContractTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetSetup_WhenAnonymous_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/game/setup");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetSetup_WhenAdminAndNoDraft_ReturnsNotFound()
    {
        await ClearGamesAsync();
        using var adminClient = CreateAuthenticatedClient([AuthRoleCodes.Admin]);

        var response = await adminClient.GetAsync("/api/game/setup");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(payload);
        Assert.Equal(AppMessages.Client.NoDraftGameForSetup, payload.Error);
    }

    [Fact]
    public async Task CreateSetup_WhenAdmin_CreatesDraftSnapshot()
    {
        await ClearGamesAsync();
        using var adminClient = CreateAuthenticatedClient([AuthRoleCodes.Admin]);

        var response = await adminClient.PostAsJsonAsync(
            "/api/game/setup",
            new CreateGameSetupRequestDto("Stream setup")
        );

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<GameSetupSnapshotDto>();
        Assert.NotNull(payload);
        Assert.Equal("Stream setup", payload.Title);
        Assert.Equal(GameStatusValue.Draft, payload.Status);
        Assert.Equal(30, payload.Cells.Count);
    }

    [Fact]
    public async Task GetSetup_WhenDraftExists_ReturnsDraftSnapshot()
    {
        await ClearGamesAsync();
        using var adminClient = CreateAuthenticatedClient([AuthRoleCodes.Admin]);

        var createResponse = await adminClient.PostAsJsonAsync(
            "/api/game/setup",
            new CreateGameSetupRequestDto("Existing draft")
        );
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var getResponse = await adminClient.GetAsync("/api/game/setup");

        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var payload = await getResponse.Content.ReadFromJsonAsync<GameSetupSnapshotDto>();
        Assert.NotNull(payload);
        Assert.Equal("Existing draft", payload.Title);
        Assert.Equal(GameStatusValue.Draft, payload.Status);
    }

    [Fact]
    public async Task CreateSetup_WhenDraftAlreadyExists_ReturnsConflict()
    {
        await ClearGamesAsync();
        using var adminClient = CreateAuthenticatedClient([AuthRoleCodes.Admin]);

        var firstResponse = await adminClient.PostAsJsonAsync(
            "/api/game/setup",
            new CreateGameSetupRequestDto("First draft")
        );
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        var secondResponse = await adminClient.PostAsJsonAsync(
            "/api/game/setup",
            new CreateGameSetupRequestDto("Second draft")
        );

        Assert.Equal(HttpStatusCode.Conflict, secondResponse.StatusCode);
        var payload = await secondResponse.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(payload);
        Assert.Equal(AppMessages.Client.DraftGameAlreadyExists, payload.Error);
    }

    [Fact]
    public async Task CreateSetup_WhenTitleIsEmpty_ReturnsBadRequest()
    {
        await ClearGamesAsync();
        using var adminClient = CreateAuthenticatedClient([AuthRoleCodes.Admin]);

        var response = await adminClient.PostAsJsonAsync(
            "/api/game/setup",
            new CreateGameSetupRequestDto(" ")
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(payload);
        Assert.Equal(AppMessages.Client.InvalidGameSetupTitle, payload.Error);
    }

    [Fact]
    public async Task GetSetup_WhenViewer_ReturnsForbidden()
    {
        using var viewerClient = CreateAuthenticatedClient([AuthRoleCodes.Viewer]);

        var response = await viewerClient.GetAsync("/api/game/setup");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private async Task ClearGamesAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        dbContext.BoardCellMedia.RemoveRange(dbContext.BoardCellMedia);
        dbContext.BoardCells.RemoveRange(dbContext.BoardCells);
        dbContext.GameBoards.RemoveRange(dbContext.GameBoards);
        dbContext.Games.RemoveRange(dbContext.Games);
        await dbContext.SaveChangesAsync();
    }

    private HttpClient CreateAuthenticatedClient(string[] roles)
    {
        var authenticatedFactory = _factory.WithWebHostBuilder(
            builder =>
                builder.ConfigureServices(
                    services =>
                    {
                        services.RemoveAll<IClaimsTransformation>();
                        services.AddSingleton<IClaimsTransformation, PassthroughClaimsTransformation>();
                        services
                            .AddAuthentication(options =>
                            {
                                options.DefaultAuthenticateScheme = TestAuthenticationHandler.SchemeName;
                                options.DefaultChallengeScheme = TestAuthenticationHandler.SchemeName;
                                options.DefaultScheme = TestAuthenticationHandler.SchemeName;
                            })
                            .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>(
                                TestAuthenticationHandler.SchemeName,
                                options => options.ClaimsIssuer = string.Join(',', roles)
                            );
                    }
                )
        );

        return authenticatedFactory.CreateClient();
    }

    private sealed class TestAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string SchemeName = "TestAuth";

        public TestAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder
        )
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var roles = (Options.ClaimsIssuer ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) };
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

            var identity = new ClaimsIdentity(claims, SchemeName);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, SchemeName);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

    private sealed class PassthroughClaimsTransformation : IClaimsTransformation
    {
        public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
        {
            return Task.FromResult(principal);
        }
    }
}
