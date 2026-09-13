namespace backend.Application.Abstractions.Realtime;

public interface IGameRegistrationEventsPublisher
{
    Task PublishRegistrationChangedAsync(CancellationToken cancellationToken = default);
}
