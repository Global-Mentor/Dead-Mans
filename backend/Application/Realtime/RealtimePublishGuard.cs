namespace backend.Application.Realtime;
public static class RealtimePublishGuard
{
    public static async Task TryPublishAsync(
        Func<Task> publish,
        ILogger logger,
        string logTemplate,
        params object?[] logArgs
    )
    {
        try
        {
            await publish();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, logTemplate, logArgs);
        }
    }
}
