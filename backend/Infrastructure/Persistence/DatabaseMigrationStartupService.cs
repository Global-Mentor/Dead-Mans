using backend.Data;
using backend.Infrastructure.Configuration;
using backend.Messaging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Infrastructure.Persistence;

internal sealed class DatabaseMigrationStartupService : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IOptions<DatabaseDeploymentOptions> _options;
    private readonly ILogger<DatabaseMigrationStartupService> _logger;

    public DatabaseMigrationStartupService(
        IServiceProvider serviceProvider,
        IOptions<DatabaseDeploymentOptions> options,
        ILogger<DatabaseMigrationStartupService> logger
    )
    {
        _serviceProvider = serviceProvider;
        _options = options;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_options.Value.ApplyMigrationsOnStartup)
        {
            return;
        }

        _logger.LogInformation(AppMessages.Logs.DatabaseMigrationStarting);
        await using var scope = _serviceProvider.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await dbContext.Database.MigrateAsync(cancellationToken);
        _logger.LogInformation(AppMessages.Logs.DatabaseMigrationCompleted);
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
