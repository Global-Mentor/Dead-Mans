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
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> SoftDeleteQuestionAsync(
        Guid questionId,
        CancellationToken cancellationToken = default
    )
    {
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
        await _dbContext.SaveChangesAsync(cancellationToken);
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
        var acceptedAnswers = BuildAcceptedAnswers(entity.Id, input.Answers, now);
        foreach (var acceptedAnswer in acceptedAnswers)
        {
            entity.AcceptedAnswers.Add(acceptedAnswer);
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
        var entity = await _dbContext.QuestionDefinitions
            .Include(question => question.AcceptedAnswers)
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

        await using var transaction = _dbContext.Database.IsRelational()
            ? await _dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;

        var existingAnswers = entity.AcceptedAnswers
            .OrderByDescending(answer => answer.IsPrimary)
            .ThenBy(answer => answer.SortOrder)
            .ToList();
        var nextAnswers = BuildAcceptedAnswers(entity.Id, input.Answers, now);

        if (transaction is not null && existingAnswers.Count > 0)
        {
            VacateAcceptedAnswerUniqueness(existingAnswers);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        ApplyAcceptedAnswerReplacements(entity, existingAnswers, nextAnswers);
        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return await LoadCatalogItemAsync(entity.Id, cancellationToken);
    }

    private static void VacateAcceptedAnswerUniqueness(List<QuestionAcceptedAnswer> existingAnswers)
    {
        for (var index = 0; index < existingAnswers.Count; index++)
        {
            existingAnswers[index].IsPrimary = false;
            existingAnswers[index].SortOrder = index + 1000;
            existingAnswers[index].NormalizedAnswer = $"~{Guid.NewGuid():N}";
        }
    }

    private static void ApplyAcceptedAnswerReplacements(
        QuestionDefinition entity,
        List<QuestionAcceptedAnswer> existingAnswers,
        List<QuestionAcceptedAnswer> nextAnswers
    )
    {
        var sharedCount = Math.Min(existingAnswers.Count, nextAnswers.Count);
        for (var index = 0; index < sharedCount; index++)
        {
            existingAnswers[index].AnswerText = nextAnswers[index].AnswerText;
            existingAnswers[index].NormalizedAnswer = nextAnswers[index].NormalizedAnswer;
            existingAnswers[index].IsPrimary = nextAnswers[index].IsPrimary;
            existingAnswers[index].SortOrder = nextAnswers[index].SortOrder;
        }

        for (var index = existingAnswers.Count - 1; index >= sharedCount; index--)
        {
            entity.AcceptedAnswers.Remove(existingAnswers[index]);
        }

        for (var index = sharedCount; index < nextAnswers.Count; index++)
        {
            entity.AcceptedAnswers.Add(nextAnswers[index]);
        }
    }

    private static List<QuestionAcceptedAnswer> BuildAcceptedAnswers(
        Guid questionId,
        IReadOnlyList<string> answers,
        DateTime createdAt
    )
    {
        return answers
            .Select((answer, index) => new QuestionAcceptedAnswer
            {
                Id = Guid.NewGuid(),
                QuestionId = questionId,
                AnswerText = answer,
                NormalizedAnswer = QuestionAnswerNormalizer.Normalize(answer),
                IsPrimary = index == 0,
                SortOrder = index,
                CreatedAtUtc = createdAt
            })
            .ToList();
    }
}
