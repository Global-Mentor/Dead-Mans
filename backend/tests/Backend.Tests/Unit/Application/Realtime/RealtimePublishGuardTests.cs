using backend.Application.Realtime;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests.Unit.Application.Realtime;

public sealed class RealtimePublishGuardTests
{
    [Fact]
    public async Task TryPublishAsync_WhenPublishSucceeds_DoesNotThrow()
    {
        var called = false;

        await RealtimePublishGuard.TryPublishAsync(
            () =>
            {
                called = true;
                return Task.CompletedTask;
            },
            NullLogger.Instance,
            "test"
        );

        Assert.True(called);
    }

    [Fact]
    public async Task TryPublishAsync_WhenPublishFails_DoesNotThrow()
    {
        await RealtimePublishGuard.TryPublishAsync(
            () => throw new InvalidOperationException("hub down"),
            NullLogger.Instance,
            "test"
        );
    }
}
