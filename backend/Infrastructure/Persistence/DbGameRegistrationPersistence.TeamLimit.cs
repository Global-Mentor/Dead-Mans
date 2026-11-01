using backend.Application.Contracts;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameRegistrationPersistence
{
    public async Task<GameRegistrationResult<bool>> PersistUpdateTeamLimitAsync(
        Guid gameId, int? teamLimit, CancellationToken cancellationToken = default)
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await BeginRosterChangeAsync(gameId, cancellationToken)
            : null;
        var game = await _dbContext.Games.SingleOrDefaultAsync(game => game.Id == gameId, cancellationToken);
        if (game is null || game.IsDeleted || game.Status is not (GameStatusValue.Ready or GameStatusValue.Active))
            return Fail<bool>(GameRegistrationErrorCode.GameNotInReady);

        game.TeamLimit = teamLimit;
        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
            await transaction.CommitAsync(cancellationToken);
        return new(true, true, GameRegistrationErrorCode.None);
    }

    private async Task<bool> HasTeamCapacityAsync(Guid gameId, CancellationToken cancellationToken)
    {
        var limit = await _dbContext.Games.AsNoTracking().Where(game => game.Id == gameId)
            .Select(game => game.TeamLimit).SingleAsync(cancellationToken);
        return limit is null || (await _reads.GetBlockedTeamSlotIdsAsync(gameId, cancellationToken)).Count < limit;
    }
}
