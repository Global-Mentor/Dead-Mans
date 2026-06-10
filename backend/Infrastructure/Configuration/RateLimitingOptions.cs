namespace backend.Infrastructure.Configuration;

public sealed class RateLimitingOptions
{
    public const string SectionName = "RateLimiting";

    public bool Enabled { get; set; } = true;

    public RateLimitRule Auth { get; set; } = new() { PermitLimit = 20, WindowSeconds = 60 };

    public RateLimitRule Mutations { get; set; } = new() { PermitLimit = 60, WindowSeconds = 60 };
}

public sealed class RateLimitRule
{
    public int PermitLimit { get; set; }

    public int WindowSeconds { get; set; }
}
