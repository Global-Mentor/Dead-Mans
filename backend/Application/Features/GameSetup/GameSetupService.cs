using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Configuration;
using backend.Application.Contracts;
using Microsoft.Extensions.Options;

namespace backend.Application.Features.GameSetup;

public sealed class GameSetupService : IGameSetupService
{
    private readonly IGameSetupRepository _repository;
    private readonly IObjectStorage _objectStorage;
    private readonly MediaStorageSettings _storageSettings;
    private readonly ILogger<GameSetupService> _logger;

    public GameSetupService(
        IGameSetupRepository repository,
        IObjectStorage objectStorage,
        IOptions<MediaStorageSettings> storageSettings,
        ILogger<GameSetupService> logger
    )
    {
        _repository = repository;
        _objectStorage = objectStorage;
        _storageSettings = storageSettings.Value;
        _logger = logger;
    }

    public Task<GameBoardSnapshot?> GetDraftSetupAsync(CancellationToken cancellationToken = default)
    {
        return _repository.GetLatestDraftSetupSnapshotAsync(cancellationToken);
    }

    public async Task<CreateDraftGameSetupResult> CreateDraftSetupAsync(
        string title,
        CancellationToken cancellationToken = default
    )
    {
        if (!GameSetupDraftValidator.TryNormalizeTitle(title, out var normalizedTitle))
        {
            return new CreateDraftGameSetupResult(CreateDraftGameSetupOutcome.InvalidTitle);
        }

        if (await _repository.DraftGameExistsAsync(cancellationToken))
        {
            return new CreateDraftGameSetupResult(CreateDraftGameSetupOutcome.DraftAlreadyExists);
        }

        var snapshot = await _repository.CreateDraftSetupAsync(normalizedTitle, cancellationToken);
        if (snapshot is null)
        {
            return new CreateDraftGameSetupResult(CreateDraftGameSetupOutcome.DraftAlreadyExists);
        }

        return new CreateDraftGameSetupResult(CreateDraftGameSetupOutcome.Created, snapshot);
    }

    public async Task<UpdateDraftGameSetupResult> UpdateDraftSetupAsync(
        GameSetupDraftUpdate update,
        CancellationToken cancellationToken = default
    )
    {
        if (!GameSetupDraftValidator.TryNormalizeTitle(update.Title, out var normalizedTitle))
        {
            return new UpdateDraftGameSetupResult(UpdateDraftGameSetupOutcome.InvalidTitle);
        }

        if (!GameSetupDraftValidator.TryNormalizeRowLabels(update.RowLabels, out var normalizedRowLabels))
        {
            return new UpdateDraftGameSetupResult(UpdateDraftGameSetupOutcome.InvalidRowLabels);
        }

        if (!GameSetupDraftValidator.TryNormalizeColumnLabels(update.ColLabels, out var normalizedColumnLabels))
        {
            return new UpdateDraftGameSetupResult(UpdateDraftGameSetupOutcome.InvalidColumnLabels);
        }

        if (!GameSetupDraftValidator.TryNormalizeCellUpdates(
                normalizedRowLabels.Length,
                normalizedColumnLabels.Length,
                update.Cells,
                out var normalizedCells
            ))
        {
            return new UpdateDraftGameSetupResult(UpdateDraftGameSetupOutcome.InvalidCells);
        }

        var normalizedUpdate = new GameSetupDraftUpdate(
            normalizedTitle,
            normalizedRowLabels,
            normalizedColumnLabels,
            normalizedCells
        );

        var savedSnapshot = await _repository.UpdateDraftSetupAsync(normalizedUpdate, cancellationToken);
        if (savedSnapshot is null)
        {
            return new UpdateDraftGameSetupResult(UpdateDraftGameSetupOutcome.NoDraftFound);
        }

        return new UpdateDraftGameSetupResult(UpdateDraftGameSetupOutcome.Updated, savedSnapshot);
    }

    public async Task<DeleteDraftGameSetupResult> DeleteDraftSetupAsync(
        CancellationToken cancellationToken = default
    )
    {
        var deletedGameId = await _repository.DeleteDraftSetupAsync(cancellationToken);
        if (deletedGameId is null)
        {
            return new DeleteDraftGameSetupResult(DeleteDraftGameSetupOutcome.NoDraftFound);
        }

        await GameSetupMediaStorageDeletion.TryDeleteGameMediaPrefixAsync(
            _objectStorage,
            _storageSettings,
            _logger,
            deletedGameId.Value,
            cancellationToken
        );

        return new DeleteDraftGameSetupResult(DeleteDraftGameSetupOutcome.Deleted);
    }
}
