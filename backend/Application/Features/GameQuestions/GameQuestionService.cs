using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Abstractions.Realtime;
using backend.Application.Contracts;
using backend.Application.Realtime;
using backend.Messaging;

namespace backend.Application.Features.GameQuestions;

public sealed class GameQuestionService : IGameQuestionService
{
    private readonly IGameQuestionRepository _repository;
    private readonly IGameSetupEventsPublisher _setupEventsPublisher;
    private readonly ILogger<GameQuestionService> _logger;

    public GameQuestionService(
        IGameQuestionRepository repository,
        IGameSetupEventsPublisher setupEventsPublisher,
        ILogger<GameQuestionService> logger)
    {
        _repository = repository;
        _setupEventsPublisher = setupEventsPublisher;
        _logger = logger;
    }

    public Task<IReadOnlyList<GameQuestionCatalogItem>> GetCatalogAsync(
        Guid? categoryId,
        string? search,
        bool includeDisabled,
        CancellationToken cancellationToken = default
    )
    {
        return _repository.GetCatalogAsync(categoryId, search, includeDisabled, cancellationToken);
    }

    public Task<IReadOnlyList<GameQuestionCategoryItem>> GetCategoriesAsync(
        CancellationToken cancellationToken = default
    )
    {
        return _repository.GetCategoriesAsync(cancellationToken);
    }

    public Task<GameQuestionCategoryItem> EnsureFallbackCategoryAsync(
        CancellationToken cancellationToken = default
    )
    {
        return _repository.EnsureFallbackCategoryAsync(cancellationToken);
    }

    public async Task<CreateGameQuestionCategoryResult> CreateCategoryAsync(
        string categoryName,
        CancellationToken cancellationToken = default
    )
    {
        var normalizedName = (categoryName ?? string.Empty).Trim();
        if (normalizedName.Length is 0 or > GameQuestionValidator.MaxCategoryLength)
        {
            return new CreateGameQuestionCategoryResult(CreateGameQuestionCategoryOutcome.InvalidRequest);
        }

        var existing = await _repository.GetCategoryAsync(normalizedName, cancellationToken);
        if (existing is not null)
        {
            return new CreateGameQuestionCategoryResult(CreateGameQuestionCategoryOutcome.Existing, existing);
        }

        var created = await _repository.CreateCategoryAsync(normalizedName, cancellationToken);
        return new CreateGameQuestionCategoryResult(CreateGameQuestionCategoryOutcome.Created, created);
    }

    public async Task<DeleteGameQuestionCategoryResult> DeleteCategoryAsync(
        Guid categoryId,
        CancellationToken cancellationToken = default
    )
    {
        var outcome = await _repository.DeleteCategoryAsync(categoryId, cancellationToken);
        return new DeleteGameQuestionCategoryResult(outcome);
    }

    public async Task<UpdateGameQuestionCategoryResult> UpdateCategoryAsync(
        Guid categoryId,
        string categoryName,
        CancellationToken cancellationToken = default
    )
    {
        var normalizedName = (categoryName ?? string.Empty).Trim();
        if (normalizedName.Length is 0 or > GameQuestionValidator.MaxCategoryLength)
        {
            return new UpdateGameQuestionCategoryResult(UpdateGameQuestionCategoryOutcome.InvalidRequest);
        }

        var existingCategory = await _repository.GetCategoryAsync(categoryId, cancellationToken);
        if (existingCategory is null)
        {
            return new UpdateGameQuestionCategoryResult(UpdateGameQuestionCategoryOutcome.NotFound);
        }

        if (existingCategory.IsProtected)
        {
            return new UpdateGameQuestionCategoryResult(UpdateGameQuestionCategoryOutcome.Protected);
        }

        var updated = await _repository.UpdateCategoryAsync(
            categoryId,
            normalizedName,
            cancellationToken
        );
        if (updated is null)
        {
            return new UpdateGameQuestionCategoryResult(UpdateGameQuestionCategoryOutcome.NotFound);
        }

        await PublishSetupChangedBestEffortAsync();
        return new UpdateGameQuestionCategoryResult(UpdateGameQuestionCategoryOutcome.Updated, updated);
    }

    public async Task<CreateGameQuestionResult> CreateQuestionAsync(
        CreateGameQuestionInput input,
        CancellationToken cancellationToken = default
    )
    {
        if (!GameQuestionValidator.TryNormalizeCreate(input, out var normalized))
        {
            return new CreateGameQuestionResult(CreateGameQuestionOutcome.InvalidRequest);
        }

        if (!await _repository.CategoryExistsAsync(normalized.CategoryId, cancellationToken))
        {
            return new CreateGameQuestionResult(CreateGameQuestionOutcome.CategoryNotFound);
        }

        var created = await _repository.CreateQuestionAsync(normalized, cancellationToken);
        if (created is not null)
        {
            await PublishSetupChangedBestEffortAsync();
        }
        return created is null
            ? new CreateGameQuestionResult(CreateGameQuestionOutcome.DuplicateCode)
            : new CreateGameQuestionResult(CreateGameQuestionOutcome.Created, created);
    }

    public async Task<UpdateGameQuestionResult> UpdateQuestionAsync(
        Guid questionId,
        UpdateGameQuestionInput input,
        CancellationToken cancellationToken = default
    )
    {
        if (!GameQuestionValidator.TryNormalizeUpdate(input, out var normalized))
        {
            return new UpdateGameQuestionResult(UpdateGameQuestionOutcome.InvalidRequest);
        }

        if (!await _repository.CategoryExistsAsync(normalized.CategoryId, cancellationToken))
        {
            return new UpdateGameQuestionResult(UpdateGameQuestionOutcome.CategoryNotFound);
        }

        var updated = await _repository.UpdateQuestionAsync(questionId, normalized, cancellationToken);
        if (updated is not null)
        {
            await PublishSetupChangedBestEffortAsync();
        }
        return updated is null
            ? new UpdateGameQuestionResult(UpdateGameQuestionOutcome.NotFound)
            : new UpdateGameQuestionResult(UpdateGameQuestionOutcome.Updated, updated);
    }

    public async Task<ImportGameQuestionsResult> ImportQuestionsAsync(
        IReadOnlyList<ImportGameQuestionInput> inputs,
        CancellationToken cancellationToken = default
    )
    {
        if (inputs.Count == 0)
        {
            return new ImportGameQuestionsResult(0, Array.Empty<ImportGameQuestionSkippedItem>());
        }

        var skipped = new List<ImportGameQuestionSkippedItem>();
        var normalizedInputs = new List<ImportGameQuestionCandidate>(inputs.Count);
        var seenExternalCodes = new HashSet<string>(StringComparer.Ordinal);

        for (var index = 0; index < inputs.Count; index++)
        {
            var input = inputs[index];
            var candidate = new CreateGameQuestionInput(
                input.ExternalCode,
                input.CategoryId,
                input.Text ?? string.Empty,
                input.Options,
                input.Reward ?? -1,
                input.IsEnabled ?? false,
                input.Priority ?? 0
            );

            if (!GameQuestionValidator.TryNormalizeCreate(candidate, out var normalized))
            {
                skipped.Add(
                    new ImportGameQuestionSkippedItem(
                        input.RowNumber,
                        input.Text?.Trim(),
                        AppMessages.ErrorCodes.GameQuestionImportInvalidFields,
                        "Missing or invalid fields. Include text, a non-negative reward, 2-10 unique options, and exactly one correct option.",
                        input.SourceQuestion
                    )
                );
                continue;
            }

            if (!string.IsNullOrWhiteSpace(normalized.ExternalCode)
                && !seenExternalCodes.Add(normalized.ExternalCode))
            {
                skipped.Add(
                    new ImportGameQuestionSkippedItem(
                        input.RowNumber,
                        normalized.Text,
                        AppMessages.ErrorCodes.GameQuestionImportDuplicateCodeInFile,
                        $"External code '{normalized.ExternalCode}' is duplicated inside the import file.",
                        input.SourceQuestion
                    )
                );
                continue;
            }

            normalizedInputs.Add(
                new ImportGameQuestionCandidate(
                    input.RowNumber,
                    normalized.Text,
                    normalized,
                    input.SourceQuestion
                )
            );
        }

        var repositoryResult = await _repository.ImportQuestionsAsync(normalizedInputs, cancellationToken);
        if (repositoryResult.ImportedCount > 0)
        {
            await PublishSetupChangedBestEffortAsync();
        }
        var mergedSkipped = skipped
            .Concat(repositoryResult.SkippedQuestions ?? Array.Empty<ImportGameQuestionSkippedItem>())
            .OrderBy(item => item.RowNumber)
            .ToArray();

        return new ImportGameQuestionsResult(
            repositoryResult.ImportedCount,
            mergedSkipped
        );
    }

    public async Task<bool> SetQuestionEnabledAsync(
        Guid questionId,
        bool isEnabled,
        CancellationToken cancellationToken = default
    )
    {
        var updated = await _repository.SetQuestionEnabledAsync(questionId, isEnabled, cancellationToken);
        if (updated)
        {
            await PublishSetupChangedBestEffortAsync();
        }
        return updated;
    }

    public async Task<bool> SoftDeleteQuestionAsync(
        Guid questionId,
        CancellationToken cancellationToken = default
    )
    {
        var deleted = await _repository.SoftDeleteQuestionAsync(questionId, cancellationToken);
        if (deleted)
        {
            await PublishSetupChangedBestEffortAsync();
        }
        return deleted;
    }

    public async Task<bool> SetCategoryEnabledAsync(
        Guid categoryId,
        bool isEnabled,
        CancellationToken cancellationToken = default
    )
    {
        var updated = await _repository.SetCategoryEnabledAsync(categoryId, isEnabled, cancellationToken);
        if (updated)
        {
            await PublishSetupChangedBestEffortAsync();
        }
        return updated;
    }

    private Task PublishSetupChangedBestEffortAsync() => RealtimePublishGuard.TryPublishAsync(
        token => _setupEventsPublisher.PublishDraftChangedAsync(token),
        _logger,
        AppMessages.Logs.RealtimeGameSetupDraftChangedPublishFailed);
}
