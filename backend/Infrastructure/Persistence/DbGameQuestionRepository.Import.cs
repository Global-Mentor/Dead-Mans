using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using backend.Messaging;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameQuestionRepository
{
    public async Task<ImportGameQuestionsResult> ImportQuestionsAsync(
        IReadOnlyList<ImportGameQuestionCandidate> inputs,
        CancellationToken cancellationToken = default
    )
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await _dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;
        await ModifierCatalogTransactionLock.AcquireAsync(_dbContext, cancellationToken);
        await EnsureFallbackCategoryAsync(cancellationToken);

        var categoryIds = inputs.Select(input => input.Question.CategoryId).Distinct().ToArray();
        var existingCategoryIds = await _dbContext.QuestionCategories
            .AsNoTracking()
            .Where(category => categoryIds.Contains(category.Id))
            .Select(category => category.Id)
            .ToArrayAsync(cancellationToken);
        var validInputs = inputs
            .Where(input => existingCategoryIds.Contains(input.Question.CategoryId))
            .ToArray();
        var skipped = inputs
            .Where(input => !existingCategoryIds.Contains(input.Question.CategoryId))
            .Select(
                input =>
                    new ImportGameQuestionSkippedItem(
                        input.RowNumber,
                        input.QuestionText,
                        AppMessages.ErrorCodes.GameQuestionImportCategoryUnresolved,
                        "The selected category could not be resolved.",
                        input.SourceQuestion
                    )
            )
            .ToList();

        var requestedExternalCodes = validInputs
            .Where(input => !string.IsNullOrWhiteSpace(input.Question.ExternalCode))
            .Select(input => input.Question.ExternalCode!)
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        // CITEXT follows PostgreSQL's locale, including Unicode case mappings that
        // differ from .NET OrdinalIgnoreCase. Resolve file and stored identities alike.
        var identities = _dbContext.Database.IsRelational() && requestedExternalCodes.Length > 0
            ? await _dbContext.Database.SqlQuery<ImportCodeIdentity>($"""
                SELECT code AS "Code", lower(code)::text AS "Key",
                    EXISTS (SELECT 1 FROM question_definitions WHERE external_code = code::citext) AS "Exists"
                FROM unnest({requestedExternalCodes}) AS codes(code)
                """).ToArrayAsync(cancellationToken)
            : requestedExternalCodes.Select(code => new ImportCodeIdentity
            {
                Code = code,
                Key = code.ToUpperInvariant(),
                Exists = false
            }).ToArray();
        if (!_dbContext.Database.IsRelational())
        {
            var storedCodes = await _dbContext.QuestionDefinitions.AsNoTracking()
                .Select(question => question.ExternalCode).ToArrayAsync(cancellationToken);
            var existing = storedCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var identity in identities) identity.Exists = existing.Contains(identity.Code);
        }
        var identitiesByCode = identities.ToDictionary(identity => identity.Code, StringComparer.Ordinal);
        var seenCodeKeys = new HashSet<string>(StringComparer.Ordinal);
        var allKnownCodes = new HashSet<string>(requestedExternalCodes, StringComparer.OrdinalIgnoreCase);
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var entities = new List<QuestionDefinition>(validInputs.Length);

        foreach (var input in validInputs)
        {
            if (!string.IsNullOrWhiteSpace(input.Question.ExternalCode))
            {
                var identity = identitiesByCode[input.Question.ExternalCode];
                var duplicateInFile = !seenCodeKeys.Add(identity.Key);
                if (duplicateInFile || identity.Exists)
                {
                    skipped.Add(new ImportGameQuestionSkippedItem(
                        input.RowNumber,
                        input.QuestionText,
                        duplicateInFile
                            ? AppMessages.ErrorCodes.GameQuestionImportDuplicateCodeInFile
                            : AppMessages.ErrorCodes.GameQuestionImportDuplicateCodeExisting,
                        duplicateInFile
                            ? $"External code '{input.Question.ExternalCode}' is duplicated inside the import file."
                            : $"External code '{input.Question.ExternalCode}' already exists.",
                        input.SourceQuestion));
                    continue;
                }
            }

            var externalCode = input.Question.ExternalCode;
            if (string.IsNullOrWhiteSpace(externalCode))
            {
                do
                {
                    externalCode = GenerateExternalCode();
                } while (!allKnownCodes.Add(externalCode));
            }
            else
            {
                allKnownCodes.Add(externalCode);
            }

            var questionId = Guid.NewGuid();
            entities.Add(
                new QuestionDefinition
                {
                    Id = questionId,
                    ExternalCode = externalCode,
                    CategoryId = input.Question.CategoryId,
                    Text = input.Question.Text,
                    Reward = input.Question.Reward,
                    Revision = 1,
                    IsEnabled = input.Question.IsEnabled,
                    IsDeleted = false,
                    DeletedAtUtc = null,
                    Priority = input.Question.Priority,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now,
                    Options = [.. BuildOptions(questionId, input.Question.Options, now)]
                }
            );
        }

        _dbContext.QuestionDefinitions.AddRange(entities);
        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return new ImportGameQuestionsResult(entities.Count, skipped.OrderBy(item => item.RowNumber).ToArray());
    }

    private sealed class ImportCodeIdentity
    {
        public string Code { get; init; } = string.Empty;
        public string Key { get; init; } = string.Empty;
        public bool Exists { get; set; }
    }
}
