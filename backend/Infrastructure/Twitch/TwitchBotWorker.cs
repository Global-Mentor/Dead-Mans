using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace backend.Infrastructure.Twitch;

internal sealed class TwitchBotWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TwitchBotWorker> _logger;
    public TwitchBotWorker(IServiceScopeFactory scopeFactory, ILogger<TwitchBotWorker> logger)
    { _scopeFactory = scopeFactory; _logger = logger; }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var subscriptionTick = 299;
        var cleanupTick = 299;
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var service = (TwitchBotService)scope.ServiceProvider.GetRequiredService<backend.Application.Abstractions.ITwitchBotService>();
                if (!service.IsEnabled) continue;
                if (++subscriptionTick >= (service.IsEventSubConnected ? 300 : 5))
                {
                    subscriptionTick = 0;
                    await service.EnsureSubscriptionAsync(stoppingToken);
                }
                await service.ProcessNextAsync(stoppingToken);
                if (++cleanupTick >= 300)
                {
                    cleanupTick = 0;
                    await service.CleanupReceiptsAsync(stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception exception) { _logger.LogError(exception, "Twitch bot background processing failed."); }
        }
    }
}
