namespace backend.Application.Realtime;

/// <summary>
/// Best-effort SignalR publish after persistence: DB remains authoritative; clients can refetch on HTTP.
/// </summary>
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
