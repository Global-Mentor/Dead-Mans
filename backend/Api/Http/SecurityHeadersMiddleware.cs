namespace backend.Api.Http;

public sealed class SecurityHeadersMiddleware
{
    private const string ApiContentSecurityPolicy =
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
    private const string FrontendContentSecurityPolicy =
        "default-src 'none'; base-uri 'self'; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; img-src 'self' https: data: blob:; manifest-src 'self'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; form-action 'self'";

    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "no-referrer";
        headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=()";
        headers["Cross-Origin-Opener-Policy"] = "same-origin";
        headers["X-Permitted-Cross-Domain-Policies"] = "none";

        if (IsSensitiveApplicationRequest(context.Request.Path))
        {
            headers.CacheControl = "no-store";
            headers.Pragma = "no-cache";
        }

        if (!IsSwaggerRequest(context.Request.Path))
        {
            headers["Content-Security-Policy"] = IsSensitiveApplicationRequest(context.Request.Path)
                && !IsFrontendAuthCallback(context.Request.Path)
                ? ApiContentSecurityPolicy
                : FrontendContentSecurityPolicy;
        }

        return _next(context);
    }

    private static bool IsSwaggerRequest(PathString path)
    {
        return path.StartsWithSegments("/swagger", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsFrontendAuthCallback(PathString path)
    {
        return string.Equals(path.Value?.TrimEnd('/'), "/auth/callback", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsSensitiveApplicationRequest(PathString path)
    {
        return path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase)
            || path.StartsWithSegments("/auth", StringComparison.OrdinalIgnoreCase)
            || path.StartsWithSegments("/hubs", StringComparison.OrdinalIgnoreCase);
    }
}
