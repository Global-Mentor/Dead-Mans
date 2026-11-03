using backend.Infrastructure.Twitch;

namespace Backend.Tests.Unit.Infrastructure;

public sealed class TwitchEventSubHealthTests
{
    [Fact]
    public void RecoveryBackoffGrowsAndHonorsTwitchDelay()
    {
        var health = new TwitchEventSubHealth();
        var now = new DateTime(2026, 11, 2, 12, 0, 0, DateTimeKind.Utc);
        health.SetFailure("unavailable", now);
        Assert.Equal(now.AddSeconds(30), health.Snapshot.RetryAtUtc);
        health.SetFailure("unavailable", now);
        Assert.Equal(now.AddSeconds(60), health.Snapshot.RetryAtUtc);
        health.SetFailure("rate_limited", now, TimeSpan.FromMinutes(10));
        Assert.Equal(now.AddMinutes(10), health.Snapshot.RetryAtUtc);
        Assert.False(health.IsConnected);
        health.SetResult(true, now);
        Assert.True(health.IsConnected);
        Assert.Null(health.Snapshot.ErrorCode);
        Assert.Equal(now.AddMinutes(5), health.Snapshot.RetryAtUtc);
        health.SetConnected(false);
        Assert.Null(health.Snapshot.RetryAtUtc);
    }

    [Fact]
    public void SubscriptionLimitWaitsAndPendingConnectionRechecksSoon()
    {
        var health = new TwitchEventSubHealth();
        var now = new DateTime(2026, 11, 2, 12, 0, 0, DateTimeKind.Utc);
        health.SetFailure("subscription_limit", now);
        Assert.Equal(now.AddMinutes(5), health.Snapshot.RetryAtUtc);
        health.SetResult(false, now);
        Assert.Equal(now.AddSeconds(5), health.Snapshot.RetryAtUtc);
    }
}
