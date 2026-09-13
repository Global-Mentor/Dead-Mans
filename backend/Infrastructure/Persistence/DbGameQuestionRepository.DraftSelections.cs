using System.Linq.Expressions;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameQuestionRepository
{
    // The caller holds the shared catalog lock until its transaction commits.
    // Published games keep their frozen selections and question snapshots.
    private async Task RemoveDraftQuestionSelectionsAsync(
        Expression<Func<QuestionDefinition, bool>> affectedQuestions,
        CancellationToken cancellationToken)
    {
        var questionIds = _dbContext.QuestionDefinitions.Where(affectedQuestions).Select(question => question.Id);
        var selections = await _dbContext.GameEnabledQuestions
            .Include(selection => selection.Game)
            .ThenInclude(game => game.Board)
            .Where(selection => questionIds.Contains(selection.QuestionId)
                && selection.Game.Status == GameStatusValue.Draft && !selection.Game.IsDeleted)
            .ToArrayAsync(cancellationToken);

        _dbContext.GameEnabledQuestions.RemoveRange(selections);
        foreach (var game in selections.Select(selection => selection.Game).DistinctBy(game => game.Id))
        {
            if (game.Board is { } board)
            {
                board.Version++;
            }
        }
    }
}
