using backend.Api.Configuration;
using Microsoft.Extensions.Options;

namespace backend.Api.Http;

public sealed class CanonicalHostRedirectMiddleware
{
    private readonly RequestDelegate _next;
    private readonly Uri _canonicalOrigin;
    private readonly HashSet<string> _redirectHosts;

    public CanonicalHostRedirectMiddleware(
        RequestDelegate next,
        IOptions<CanonicalUrlOptions> options
    )
    {
        _next = next;
        _canonicalOrigin = new Uri(options.Value.Origin, UriKind.Absolute);
        _redirectHosts = options.Value.RedirectHosts
            .Select(host => host.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public Task InvokeAsync(HttpContext context)
    {
        if (!_redirectHosts.Contains(context.Request.Host.Host))
        {
            return _next(context);
        }

        var location = new UriBuilder(_canonicalOrigin)
        {
            Path = context.Request.PathBase.Add(context.Request.Path).Value,
            Query = context.Request.QueryString.HasValue
                ? context.Request.QueryString.Value![1..]
                : string.Empty
        }.Uri.AbsoluteUri;

        context.Response.Redirect(location, permanent: true, preserveMethod: true);
        return Task.CompletedTask;
    }
}
