using backend.Api.Contracts;
using backend.Application.Abstractions.Realtime;
using Microsoft.AspNetCore.SignalR;

namespace backend.Api.Realtime;

public sealed class SignalRGameRegistrationEventsPublisher(IHubContext<GameBoardHub> hubContext)
    : IGameRegistrationEventsPublisher
{
    public Task PublishRegistrationChangedAsync(CancellationToken cancellationToken = default) =>
        hubContext.Clients.Group(RealtimeGroupNames.GameBoardAudience)
            .SendAsync(RealtimeHubContracts.GameBoard.RegistrationChangedEvent, cancellationToken: cancellationToken);
}
