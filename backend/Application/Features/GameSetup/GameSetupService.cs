using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;

namespace backend.Application.Features.GameSetup;

public sealed class GameSetupService : IGameSetupService
{
    private readonly IGameSetupRepository _repository;

    public GameSetupService(IGameSetupRepository repository)
    {
        _repository = repository;
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
        var deleted = await _repository.DeleteDraftSetupAsync(cancellationToken);
        return deleted
            ? new DeleteDraftGameSetupResult(DeleteDraftGameSetupOutcome.Deleted)
            : new DeleteDraftGameSetupResult(DeleteDraftGameSetupOutcome.NoDraftFound);
    }
}
