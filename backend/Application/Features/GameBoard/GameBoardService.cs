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

    public Task<GameTeamQueueResult> GetCurrentTeamQueueAsync(
        CancellationToken cancellationToken = default
    )
    {
        return _repository.GetCurrentTeamQueueAsync(cancellationToken);
    }

    public async Task<SetActiveGameTeamOutcome> SetActiveTeamAsync(
        Guid? teamId,
        CancellationToken cancellationToken = default
    )
    {
        var outcome = await _repository.SetActiveTeamAsync(teamId, cancellationToken);
        if (outcome == SetActiveGameTeamOutcome.Updated)
        {
            await PublishTeamStateChangedBestEffortAsync(teamId);
        }

        return outcome;
    }

    public async Task<SetGameTeamPlayedStateOutcome> SetGameTeamPlayedStateAsync(
        Guid teamId,
        bool isPlayed,
        CancellationToken cancellationToken = default
    )
    {
        var outcome = await _repository.SetGameTeamPlayedStateAsync(teamId, isPlayed, cancellationToken);
        if (outcome == SetGameTeamPlayedStateOutcome.Updated)
        {
            await PublishTeamStateChangedBestEffortAsync(teamId);
        }

        return outcome;
    }

    private Task PublishTeamStateChangedBestEffortAsync(Guid? teamId) =>
        RealtimePublishGuard.TryPublishAsync(
            publishToken => _eventsPublisher.PublishTeamStateChangedAsync(publishToken),
            _logger,
            AppMessages.Logs.RealtimeGameTeamStateChangedPublishFailed,
            teamId
        );

    public async Task<OpenGameCellErrorCode> TryOpenCellAsync(
        Guid cellId,
        CancellationToken cancellationToken = default
    )
    {
        if (!await _repository.IsCurrentActiveGameCellAsync(cellId, cancellationToken))
        {
            return await ClassifyUnavailableCellAsync(cancellationToken);
        }

        if (!await _repository.CurrentActiveGameHasActiveTeamAsync(cancellationToken))
        {
            return OpenGameCellErrorCode.ActiveTeamRequired;
        }

        if (await _repository.CurrentActiveGameHasActiveRoundAsync(cancellationToken))
        {
            return OpenGameCellErrorCode.RoundInProgress;
        }

        var result = await _repository.TryOpenCellAsync(cellId, cancellationToken);
        if (result is null)
        {
            return await ClassifyUnavailableCellAsync(cancellationToken, checkRuntime: true);
        }

        if (!result.StateChanged) return OpenGameCellErrorCode.None;

        await RealtimePublishGuard.TryPublishAsync(
            publishToken => _eventsPublisher.PublishCellOpenedAsync(
                new GameCellOpenedEvent(result.GameId, result.Version, result.Cell),
                publishToken
            ),
            _logger,
            AppMessages.Logs.RealtimeGameCellOpenedPublishFailed,
            cellId
        );

        return OpenGameCellErrorCode.None;
    }

    private async Task<OpenGameCellErrorCode> ClassifyUnavailableCellAsync(
        CancellationToken cancellationToken,
        bool checkRuntime = false)
    {
        var board = await GetCurrentBoardAsync(cancellationToken);
        if (board?.Status != GameStatusValue.Active) return OpenGameCellErrorCode.GameNotActive;
        if (checkRuntime && !await _repository.CurrentActiveGameHasActiveTeamAsync(cancellationToken))
            return OpenGameCellErrorCode.ActiveTeamRequired;
        if (checkRuntime && await _repository.CurrentActiveGameHasActiveRoundAsync(cancellationToken))
            return OpenGameCellErrorCode.RoundInProgress;
        return OpenGameCellErrorCode.CellNotFound;
    }
}
