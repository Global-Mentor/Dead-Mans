namespace backend.Api.Configuration;

internal sealed class ProductionHostConfigurationStartupValidator : IHostedService
{
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;

    public ProductionHostConfigurationStartupValidator(
        IConfiguration configuration,
        IHostEnvironment environment
    )
    {
        _configuration = configuration;
        _environment = environment;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        AllowedHostsValidator.Validate(_configuration, _environment);
        ValidateCanonicalHosts();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    private void ValidateCanonicalHosts()
    {
        if (!_environment.IsProduction())
        {
            return;
        }

        var allowedHosts = (_configuration["AllowedHosts"] ?? string.Empty)
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var canonicalOrigin = _configuration[$"{CanonicalUrlOptions.SectionName}:Origin"];
        if (!Uri.TryCreate(canonicalOrigin, UriKind.Absolute, out var canonicalUri))
        {
            return;
        }

        var configuredHosts = _configuration
            .GetSection($"{CanonicalUrlOptions.SectionName}:RedirectHosts")
            .Get<string[]>() ?? [];
        var missingHosts = configuredHosts
            .Append(canonicalUri.Host)
            .Where(host => !allowedHosts.Contains(host))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (missingHosts.Length > 0)
        {
            throw new InvalidOperationException(
                "AllowedHosts must contain CanonicalUrl:Origin and every CanonicalUrl:RedirectHosts entry."
            );
        }
    }
}
