using System.ComponentModel.DataAnnotations;
using backend.Application.Configuration;

namespace backend.Api.Configuration;

public sealed class CanonicalUrlOptions
{
    public const string SectionName = "CanonicalUrl";

    [Required]
    public string Origin { get; set; } = string.Empty;

    public string[] RedirectHosts { get; set; } = [];

    public static bool IsValidHttpsOrigin(string? origin)
    {
        return HttpOriginValidator.IsValid(origin) && HttpOriginValidator.IsHttps(origin);
    }

    public static bool HasValidRedirectHosts(IEnumerable<string>? hosts)
    {
        return hosts is not null && hosts.All(host =>
        {
            var normalizedHost = host.Trim();
            return normalizedHost.Length > 0
                && Uri.CheckHostName(normalizedHost) is UriHostNameType.Dns
                or UriHostNameType.IPv4
                or UriHostNameType.IPv6;
        });
    }

    public static bool DoesNotRedirectCanonicalHost(CanonicalUrlOptions options)
    {
        return Uri.TryCreate(options.Origin, UriKind.Absolute, out var canonicalOrigin)
            && !options.RedirectHosts.Contains(
                canonicalOrigin.Host,
                StringComparer.OrdinalIgnoreCase
            );
    }
}
