using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Data;
using backend.Data.Entities;
using backend.Infrastructure.Auth;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Backend.Tests.Support;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Integration.Auth;

public sealed class RoleAdministrationContractTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public RoleAdministrationContractTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _factory.ResetDatabase();
    }

    [Fact]
    public async Task UsersEndpoint_EnforcesSuperAdminBoundary()
    {
        using var anonymousClient = _factory.CreateClient();
        using var adminClient = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.Admin]
        );
        using var superAdminClient = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.SuperAdmin]
        );

        var anonymousResponse = await anonymousClient.GetAsync("/api/admin/users");
        var adminResponse = await adminClient.GetAsync("/api/admin/users");
        var superAdminResponse = await superAdminClient.GetAsync("/api/admin/users");

        Assert.Equal(HttpStatusCode.Unauthorized, anonymousResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, adminResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, superAdminResponse.StatusCode);
    }

    [Theory]
    [InlineData("page=0")]
    [InlineData("pageSize=101")]
    [InlineData("registeredWithinDays=0")]
    [InlineData("role=unknown")]
    [InlineData("sort=unknown")]
    [InlineData("hasLoggedIn=unknown")]
    public async Task UsersEndpoint_RejectsInvalidFilters(string query)
    {
        using var client = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.SuperAdmin]);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/admin/users?" + query)).StatusCode);
    }

    [Theory]
    [InlineData("roleAsc")]
    [InlineData("roleDesc")]
    public async Task UsersEndpoint_AcceptsRoleSorting(string sort)
    {
        using var client = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.SuperAdmin]);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/admin/users?sort=" + sort)).StatusCode);
    }

    [Fact]
    public async Task UpdateAccess_RequiresSuperAdminAndApiClientHeader()
    {
        var url = $"/api/admin/users/{Guid.NewGuid()}/access";
        using var anonymous = _factory.CreateClient();
        using var admin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.Admin]);
        using var superAdmin = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.SuperAdmin]);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PutAsJsonAsync(url, new { isActive = false })).StatusCode);
        admin.DefaultRequestHeaders.Add("X-Dead-Mans-Api-Client", "1");
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.PutAsJsonAsync(url, new { isActive = false })).StatusCode);
        superAdmin.DefaultRequestHeaders.Add("Cookie", "dm_auth=test-cookie");
        Assert.Equal(HttpStatusCode.Forbidden, (await superAdmin.PutAsJsonAsync(url, new { isActive = false })).StatusCode);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"isActive\":null}")]
    [InlineData("{\"isActive\":\"false\"}")]
    public async Task UpdateAccess_RequiresExplicitBoolean(string payload)
    {
        using var client = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.SuperAdmin]);
        client.DefaultRequestHeaders.Add("X-Dead-Mans-Api-Client", "1");
        using var content = new StringContent(payload, System.Text.Encoding.UTF8, "application/json");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsync($"/api/admin/users/{Guid.NewGuid()}/access", content)).StatusCode);
    }

    [Fact]
    public async Task UpdateAccess_ChangesStateAndProtectsOwnerAndSelf()
    {
        var actorId = Guid.NewGuid();
        var targetId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            foreach (var (id, twitchId) in new[] { (actorId, "access-actor"), (targetId, "access-target"), (ownerId, "123456") })
                db.Users.Add(new User { Id = id, TwitchUserId = twitchId, Login = twitchId, DisplayName = twitchId, IsActive = true, CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow });
            await db.SaveChangesAsync();
        }
        using var client = TestAuthClientFactory.CreateClient(_factory, [AuthRoleCodes.SuperAdmin], actorId);
        client.DefaultRequestHeaders.Add("X-Dead-Mans-Api-Client", "1");
        using var targetClient = TestAuthClientFactory.CreateClient(
            _factory, [AuthRoleCodes.Viewer], targetId,
            configureServices: services =>
            {
                services.RemoveAll<IAuthUserReader>();
                services.AddScoped<IAuthUserReader, DbAuthUserReader>();
            }
        );
        Assert.Equal(HttpStatusCode.OK, (await targetClient.GetAsync("/auth/me")).StatusCode);
        foreach (var isActive in new[] { false, false, true })
        {
            var response = await client.PutAsJsonAsync($"/api/admin/users/{targetId}/access", new { isActive });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal(isActive, json.RootElement.GetProperty("isActive").GetBoolean());
            Assert.Equal(isActive ? HttpStatusCode.OK : HttpStatusCode.Unauthorized, (await targetClient.GetAsync("/auth/me")).StatusCode);
        }
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/admin/users/{Guid.NewGuid()}/access", new { isActive = false })).StatusCode);
        foreach (var (id, code) in new[] { (ownerId, "role_administration.permanent_superadmin_protected"), (actorId, "role_administration.self_block_protected") })
        {
            var response = await client.PutAsJsonAsync($"/api/admin/users/{id}/access", new { isActive = false });
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal(code, (await response.Content.ReadFromJsonAsync<ErrorResponse>())?.Code);
        }
    }

    [Fact]
    public async Task UpdateRoles_AsSuperAdmin_GrantsAllInheritedRolesWithSuperAdmin()
    {
        var actorId = Guid.NewGuid();
        var targetId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var timestamp = DateTime.UtcNow;
            dbContext.Users.AddRange(
                new User
                {
                    Id = actorId,
                    TwitchUserId = "333333",
                    Login = "actor",
                    DisplayName = "Actor",
                    IsActive = true,
                    CreatedAtUtc = timestamp,
                    UpdatedAtUtc = timestamp
                },
                new User
                {
                    Id = targetId,
                    TwitchUserId = "444444",
                    Login = "target",
                    DisplayName = "Target",
                    IsActive = true,
                    CreatedAtUtc = timestamp,
                    UpdatedAtUtc = timestamp
                }
            );
            await dbContext.SaveChangesAsync();
        }

        using var client = TestAuthClientFactory.CreateClient(
            _factory,
            [AuthRoleCodes.SuperAdmin],
            actorId
        );
        using var request = new HttpRequestMessage(
            HttpMethod.Put,
            $"/api/admin/users/{targetId}/roles"
        )
        {
            Content = JsonContent.Create(
                new UpdateUserRolesRequestDto([AuthRole.SuperAdmin])
            )
        };
        request.Headers.Add("X-Dead-Mans-Api-Client", "1");

        var response = await client.SendAsync(request);
        var payload = await response.Content.ReadAsStringAsync();
        var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        jsonOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        var user = JsonSerializer.Deserialize<RoleAdministrationUserDto>(payload, jsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("\"superadmin\"", payload, StringComparison.Ordinal);
        Assert.DoesNotContain("\"superAdmin\"", payload, StringComparison.Ordinal);
        Assert.NotNull(user);
        Assert.Equal([AuthRole.Viewer, AuthRole.Moderator, AuthRole.Admin, AuthRole.SuperAdmin], user.Roles);
    }
}
