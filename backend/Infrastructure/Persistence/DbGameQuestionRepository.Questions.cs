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
        await using var transaction = _dbContext.Database.IsRelational()
            ? await _dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;
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

        var existingAnswers = entity.AcceptedAnswers.ToList();
        var nextAnswers = BuildAcceptedAnswers(entity.Id, input.Answers, now);
        _dbContext.QuestionAcceptedAnswers.RemoveRange(existingAnswers);
        foreach (var answer in nextAnswers)
        {
            entity.AcceptedAnswers.Add(answer);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var result = await LoadCatalogItemAsync(entity.Id, cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }
        return result;
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
