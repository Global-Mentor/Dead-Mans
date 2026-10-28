using backend.Api.Auth;
using backend.Api.Contracts;
using backend.Api.Http;
using backend.Messaging;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace backend.Api.DependencyInjection;

public static class AuthenticationServiceCollectionExtensions
{
    public static IServiceCollection AddDeadMansAuthentication(
        this IServiceCollection services,
        IHostEnvironment environment
    )
    {
        services
            .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddScheme<AuthenticationSchemeOptions, GameOverlayAuthenticationHandler>(
                GameOverlayAuthenticationHandler.SchemeName, _ => { })
            .AddCookie(options =>
            {
                options.Cookie.Name = AuthCookieNames.Authentication;
                options.Cookie.HttpOnly = true;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.SecurePolicy = environment.IsDevelopment()
                    ? CookieSecurePolicy.SameAsRequest
                    : CookieSecurePolicy.Always;
                options.ExpireTimeSpan = TimeSpan.FromDays(7);
                options.SlidingExpiration = true;
                options.Events = new CookieAuthenticationEvents
                {
                    OnRedirectToLogin = context =>
                        HandleRedirectAsync(
                            context,
                            StatusCodes.Status401Unauthorized,
                            AppMessages.Client.AuthenticationRequired
                        ),
                    OnRedirectToAccessDenied = context =>
                        HandleRedirectAsync(
                            context,
                            StatusCodes.Status403Forbidden,
                            AppMessages.Client.AccessDenied
                        )
                };
            });
        services.AddAuthorization();

        return services;
    }

    private static Task HandleRedirectAsync(
        RedirectContext<CookieAuthenticationOptions> context,
        int statusCode,
        string message
    )
    {
        if (context.Request.Path.StartsWithSegments("/panel", StringComparison.OrdinalIgnoreCase))
        {
            var returnTo = context.Request.PathBase.Add(context.Request.Path).ToUriComponent()
                + context.Request.QueryString.ToUriComponent();
            context.Response.Redirect($"/?returnTo={Uri.EscapeDataString(returnTo)}");
            return Task.CompletedTask;
        }

        if (!IsApplicationEndpoint(context.Request.Path))
        {
            context.Response.Redirect(context.RedirectUri);
            return Task.CompletedTask;
        }

        ApiErrorMetrics.Record(statusCode, null, "auth");
        return ErrorResponseFactory.WriteAsync(context.Response, statusCode, message);
    }

    private static bool IsApplicationEndpoint(PathString path)
    {
        return path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase)
            || path.StartsWithSegments("/auth", StringComparison.OrdinalIgnoreCase)
            || path.StartsWithSegments("/hubs", StringComparison.OrdinalIgnoreCase)
            || path.StartsWithSegments("/openapi", StringComparison.OrdinalIgnoreCase);
    }
}
