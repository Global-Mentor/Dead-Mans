namespace backend.Application.Abstractions.Realtime;

public interface IGameSetupEventsPublisher
{
    Task PublishDraftChangedAsync(CancellationToken cancellationToken = default);
}
