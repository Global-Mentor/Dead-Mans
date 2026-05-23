using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Abstractions.Realtime;
using backend.Application.Contracts;
using backend.Application.Realtime;
using backend.Domain.Persistence;
using backend.Messaging;

namespace backend.Application.Features.GameBoard;

public sealed class GameBoardService : IGameBoardService
{
    private readonly IGameBoardRepository _repository;
    private readonly IGameBoardEventsPublisher _eventsPublisher;
    private readonly ILogger<GameBoardService> _logger;

    public GameBoardService(
        IGameBoardRepository repository,
        IGameBoardEventsPublisher eventsPublisher,
        ILogger<GameBoardService> logger
    )
    {
        _repository = repository;
        _eventsPublisher = eventsPublisher;
        _logger = logger;
    }

    public async Task<GameBoardSnapshot?> GetCurrentBoardAsync(CancellationToken cancellationToken = default)
    {
        var activeBoard = await _repository.GetLatestBoardByStatusAsync(
            GameStatusValue.Active,
            cancellationToken
        );
        if (activeBoard is not null)
        {
            return activeBoard;
        }

        var readyBoard = await _repository.GetLatestBoardByStatusAsync(
            GameStatusValue.Ready,
            cancellationToken
        );
        if (readyBoard is not null)
        {
            return readyBoard;
        }

        return await _repository.GetLatestBoardByStatusAsync(
            GameStatusValue.Finished,
            cancellationToken
        );
    }

    public async Task<OpenGameCellResult?> TryOpenCellAsync(
        Guid cellId,
        CancellationToken cancellationToken = default
    )
    {
        var result = await _repository.TryOpenCellAsync(cellId, cancellationToken);
        if (result is null || !result.StateChanged)
        {
            return result;
        }

        await RealtimePublishGuard.TryPublishAsync(
            () => _eventsPublisher.PublishCellOpenedAsync(
                new GameCellOpenedEvent(result.GameId, result.Version, result.Cell),
                cancellationToken
            ),
            _logger,
            AppMessages.Logs.RealtimeGameCellOpenedPublishFailed,
            cellId
        );

        return result;
    }
}
