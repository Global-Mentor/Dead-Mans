using backend.Api.Auth;
using backend.Api.Configuration;
using backend.Api.Contracts;
using backend.Api.DependencyInjection;
using backend.Api.Http;
using backend.Api.Realtime;
using backend.Application.Abstractions.Auth;
using backend.Application.DependencyInjection;
using backend.Data;
using backend.Messaging;
using backend.Infrastructure.DependencyInjection;
using backend.Infrastructure.Health;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Serilog;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using System.Runtime.InteropServices;

Serilog.Core.Logger? startupLogger = null;
Serilog.Debugging.SelfLog.Enable(Console.Error);

try
{
    var builder = WebApplication.CreateBuilder(args);
    var isDevelopment = builder.Environment.IsDevelopment();
    var isTesting = builder.Environment.IsEnvironment("Testing");
    if (isDevelopment)
    {
        builder.Configuration.AddJsonFile(
            "appsettings.Local.json",
            optional: true,
            reloadOnChange: true
        );
    }

    builder.Configuration.AddEnvironmentVariables();
    var releaseShaPath = Path.Combine(builder.Environment.ContentRootPath, "release-sha");
    var releaseSha = File.Exists(releaseShaPath) ? File.ReadAllText(releaseShaPath).Trim() : null;
    startupLogger = new LoggerConfiguration()
        .ReadFrom.Configuration(builder.Configuration)
        .Enrich.WithProperty("ReleaseSha", releaseSha ?? "local")
        .Enrich.WithProperty("ProcessId", Environment.ProcessId)
        .Enrich.WithProperty("InstanceId", Environment.MachineName)
        .CreateLogger();
    startupLogger.Information(
        AppMessages.Logs.ApplicationStarting,
        RuntimeInformation.FrameworkDescription,
        RuntimeInformation.OSDescription
    );

    builder.WebHost.ConfigureKestrel(options =>
    {
        options.AddServerHeader = false;
        options.Limits.MaxRequestBodySize = 6 * 1024 * 1024;
    });
    builder.Services.AddHsts(options =>
    {
        options.MaxAge = TimeSpan.FromDays(180);
    });
    builder.Host.UseSerilog(
        (context, services, loggerConfiguration) =>
        {
            loggerConfiguration
                .ReadFrom.Configuration(context.Configuration)
                .ReadFrom.Services(services)
                .Enrich.WithProperty("ReleaseSha", releaseSha ?? "local")
                .Enrich.WithProperty("ProcessId", Environment.ProcessId)
                .Enrich.WithProperty("InstanceId", Environment.MachineName)
                .Enrich.FromLogContext();
        }
    );
    builder.Services.AddDeadMansHostSecurity(builder.Configuration, builder.Environment);
    builder.Services
        .AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.Converters.Add(
                new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)
            );
        });
    builder.Services.AddDeadMansAuthentication(builder.Environment);
    builder.Services.AddDeadMansApplication();
    builder.Services.AddDeadMansInfrastructure(builder.Configuration, builder.Environment);
    builder.Services.AddDeadMansRealtime();
    var healthChecks = builder.Services
        .AddHealthChecks()
        .AddDbContextCheck<ApplicationDbContext>(
            name: HealthCheckContracts.Names.Database,
            tags: [HealthCheckContracts.Tags.Ready]
        );
    if (!isTesting)
    {
        healthChecks.AddCheck<ObjectStorageHealthCheck>(
            name: HealthCheckContracts.Names.ObjectStorage,
            tags: [HealthCheckContracts.Tags.Ready]
        );
    }
    builder.Services.AddDeadMansRateLimiting(builder.Configuration, builder.Environment);
    builder.Services.AddDeadMansCors(builder.Configuration, builder.Environment);
    builder.Services.AddDeadMansForwardedHeaders(builder.Configuration, builder.Environment);

    var app = builder.Build();
    startupLogger.Dispose();
    startupLogger = null;

    app.UseForwardedHeaders();
    app.Use(async (context, next) =>
    {
        if (context.Request.Path.StartsWithSegments(HealthCheckContracts.PathPrefix))
        {
            context.Response.Headers.CacheControl = "no-store";
            if (!string.IsNullOrEmpty(releaseSha))
            {
                context.Response.Headers["X-Release-Sha"] = releaseSha;
            }
        }

        await next(context);
    });
    app.UseSerilogRequestLogging();
    app.UseMiddleware<ApiExceptionHandlingMiddleware>();
    if (!app.Environment.IsDevelopment())
    {
        app.UseHsts();
        app.UseWhen(
            context => !context.Request.Path.StartsWithSegments(HealthCheckContracts.PathPrefix),
            branch => branch.UseHttpsRedirection()
        );
    }
    app.UseMiddleware<SecurityHeadersMiddleware>();
    if (app.Environment.IsProduction())
    {
        app.UseMiddleware<CanonicalHostRedirectMiddleware>();
    }
    if (!isDevelopment && !isTesting)
    {
        app.UseDefaultFiles();
        app.UseStaticFiles();
    }
    if (app.Environment.IsDevelopment())
    {
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/openapi/deadmans.v1.yaml", "Dead-Mans API v1");
            c.RoutePrefix = "swagger";
        });
    }

    app.UseCors(CorsPolicyNames.Default);
    app.UseAuthentication();
    app.UseMiddleware<ActiveUserMiddleware>();
    app.UseMiddleware<ApiClientRequestValidationMiddleware>();
    app.UseAuthorization();
    app.UseRateLimiter();

    var openApiEndpoint = app.MapGet(
        "/openapi/deadmans.v1.yaml",
        () => Results.File(
            Path.Combine(app.Environment.ContentRootPath, "openapi", "deadmans.v1.yaml"),
            "application/yaml"
        )
    );
    if (app.Environment.IsProduction())
    {
        openApiEndpoint.RequireAuthorization(policy => policy.RequireRole(AuthRoleCodes.Admin));
    }
    app.MapHealthChecks(
        HealthCheckContracts.LivenessPath,
        new HealthCheckOptions { Predicate = _ => false }
    );
    app.MapHealthChecks(
        HealthCheckContracts.ReadinessPath,
        new HealthCheckOptions
        {
            Predicate = registration => registration.Tags.Contains(HealthCheckContracts.Tags.Ready)
        }
    );
    app.MapHub<GameBoardHub>(RealtimeHubContracts.GameBoard.HubPath);
    app.MapHub<GameSetupHub>(RealtimeHubContracts.GameSetup.HubPath);
    app.MapControllers();
    if (!isDevelopment && !isTesting)
    {
        app.MapFallbackToFile("/auth/callback", "index.html");
        app.MapFallbackToFile("/panel/{*path:nonfile}", "index.html")
            .RequireAuthorization();
    }

    app.Run();
}
catch (Microsoft.Extensions.Hosting.HostAbortedException)
{
    throw;
}
catch (Exception ex)
{
    var logger = startupLogger ?? Log.Logger;
    if (logger.IsEnabled(Serilog.Events.LogEventLevel.Fatal))
    {
        logger.Fatal(ex, AppMessages.Logs.ApplicationTerminatedUnexpectedly);
    }
    else
    {
        Console.Error.WriteLine(ex);
    }

    throw;
}
finally
{
    startupLogger?.Dispose();
    Log.CloseAndFlush();
}

public partial class Program;
