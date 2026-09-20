using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameQuestionRepository
{
    public async Task<bool> SetQuestionEnabledAsync(
        Guid questionId,
        bool isEnabled,
        CancellationToken cancellationToken = default
    )
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await _dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;
        await ModifierCatalogTransactionLock.AcquireAsync(_dbContext, cancellationToken);
        var question = await _dbContext.QuestionDefinitions.FirstOrDefaultAsync(
            x => x.Id == questionId && !x.IsDeleted,
            cancellationToken
        );
        if (question is null)
        {
            return false;
        }

        question.IsEnabled = isEnabled;
        question.UpdatedAtUtc = _timeProvider.GetUtcNow().UtcDateTime;
        if (!isEnabled)
        {
            await RemoveDraftQuestionSelectionsAsync(item => item.Id == questionId, cancellationToken);
        }
        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }
        return true;
    }

    public async Task<bool> SoftDeleteQuestionAsync(
        Guid questionId,
        CancellationToken cancellationToken = default
    )
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await _dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;
        await ModifierCatalogTransactionLock.AcquireAsync(_dbContext, cancellationToken);
        var question = await _dbContext.QuestionDefinitions.FirstOrDefaultAsync(
            x => x.Id == questionId && !x.IsDeleted,
            cancellationToken
        );
        if (question is null)
        {
            return false;
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        question.IsDeleted = true;
        question.DeletedAtUtc = now;
        question.IsEnabled = false;
        question.UpdatedAtUtc = now;
        await RemoveDraftQuestionSelectionsAsync(item => item.Id == questionId, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }
        return true;
    }

    public async Task<GameQuestionCatalogItem?> CreateQuestionAsync(
        CreateGameQuestionInput input,
        CancellationToken cancellationToken = default
    )
    {
        var externalCode = string.IsNullOrWhiteSpace(input.ExternalCode)
            ? GenerateExternalCode()
            : input.ExternalCode.Trim();

        var codeTaken = await _dbContext.QuestionDefinitions
            .AsNoTracking()
            .AnyAsync(x => x.ExternalCode == externalCode, cancellationToken);
        if (codeTaken)
        {
            return null;
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var entity = new QuestionDefinition
        {
            Id = Guid.NewGuid(),
            ExternalCode = externalCode,
            CategoryId = input.CategoryId,
            Text = input.Text,
            Reward = input.Reward,
            Revision = 1,
            IsEnabled = input.IsEnabled,
            IsDeleted = false,
            DeletedAtUtc = null,
            Priority = input.Priority,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        var options = BuildOptions(entity.Id, input.Options, now);
        foreach (var option in options)
        {
            entity.Options.Add(option);
        }

        _dbContext.QuestionDefinitions.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return await LoadCatalogItemAsync(entity.Id, cancellationToken);
    }

    public async Task<GameQuestionCatalogItem?> UpdateQuestionAsync(
        Guid questionId,
        UpdateGameQuestionInput input,
        CancellationToken cancellationToken = default
    )
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await _dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;
        await ModifierCatalogTransactionLock.AcquireAsync(_dbContext, cancellationToken);
        if (transaction is not null)
        {
            // Lock the aggregate before loading its replaceable children. This also
            // follows the question-before-answers lock order used by publication.
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM question_definitions WHERE id = {questionId} FOR UPDATE",
                cancellationToken
            );
        }

        var entity = await _dbContext.QuestionDefinitions
            .Include(question => question.Options)
            .FirstOrDefaultAsync(
            x => x.Id == questionId && !x.IsDeleted,
            cancellationToken
        );
        if (entity is null)
        {
            return null;
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        entity.CategoryId = input.CategoryId;
        entity.Text = input.Text;
        entity.Reward = input.Reward;
        entity.IsEnabled = input.IsEnabled;
        entity.Priority = input.Priority;
        entity.Revision += 1;
        entity.UpdatedAtUtc = now;

        var existingOptions = entity.Options.ToList();
        var nextOptions = BuildOptions(entity.Id, input.Options, now);
        _dbContext.QuestionOptions.RemoveRange(existingOptions);
        foreach (var option in nextOptions)
        {
            entity.Options.Add(option);
        }

        if (!entity.IsEnabled)
        {
            await RemoveDraftQuestionSelectionsAsync(item => item.Id == questionId, cancellationToken);
        }
        await _dbContext.SaveChangesAsync(cancellationToken);

        var result = await LoadCatalogItemAsync(entity.Id, cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }
        return result;
    }

    private static List<QuestionOption> BuildOptions(
        Guid questionId,
        IReadOnlyList<GameQuestionOptionInput> options,
        DateTime createdAt
    )
    {
        return options
            .Select((option, index) => new QuestionOption
            {
                Id = Guid.NewGuid(),
                QuestionId = questionId,
                Text = option.Text,
                NormalizedText = QuestionAnswerNormalizer.Normalize(option.Text),
                IsCorrect = option.IsCorrect,
                SortOrder = index,
                CreatedAtUtc = createdAt
            })
            .ToList();
    }
}
