using backend.Application.Abstractions.Realtime;
using backend.Application.Contracts;

namespace Backend.Tests.Support;

public sealed class OverlayTestEventsPublisher : IGameBoardEventsPublisher
{
    public int Frames { get; private set; }
    public bool Fail { get; set; }
    public Task PublishOverlayFrameChangedAsync(CancellationToken cancellationToken = default)
    {
        Frames++;
        return Fail ? Task.FromException(new InvalidOperationException("Publisher unavailable")) : Task.CompletedTask;
    }
    public Task PublishCellOpenedAsync(GameCellOpenedEvent payload, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task PublishModifierActivatedAsync(GameModifierActivatedEvent payload, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task PublishModifierActivationCancelledAsync(GameModifierActivationCancelledEvent payload, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task PublishModifierAvailabilityChangedAsync(GameModifierAvailabilityChangedEvent payload, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task PublishRoundStateChangedAsync(GameRoundStateChangedEvent payload, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task PublishQuizStateChangedAsync(GameQuizStateChangedEvent payload, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task PublishUserNotificationCreatedAsync(GameUserNotificationCreatedEvent payload, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task PublishGameLifecycleChangedAsync(GameLifecycleChangedEvent payload, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task PublishTeamStateChangedAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
