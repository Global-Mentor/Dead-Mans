namespace backend.Infrastructure.Configuration;

public sealed class DatabaseDeploymentOptions
{
    public const string SectionName = "Database";

    public bool ApplyMigrationsOnStartup { get; set; }
}
