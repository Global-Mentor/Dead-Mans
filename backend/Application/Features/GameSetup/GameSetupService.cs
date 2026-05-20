using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;

namespace backend.Application.Features.GameSetup;

public sealed class GameSetupService : IGameSetupService
{
    private const int MaxTitleLength = 200;

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
        var normalizedTitle = title.Trim();
        if (string.IsNullOrWhiteSpace(normalizedTitle) || normalizedTitle.Length > MaxTitleLength)
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
}
