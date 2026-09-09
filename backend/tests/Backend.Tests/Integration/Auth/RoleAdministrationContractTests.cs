using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Data;
using backend.Data.Entities;
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

    [Fact]
    public async Task UpdateRoles_AsSuperAdmin_GrantsAdminWithSuperAdmin()
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
        Assert.Equal([AuthRole.Viewer, AuthRole.Admin, AuthRole.SuperAdmin], user.Roles);
    }
}
