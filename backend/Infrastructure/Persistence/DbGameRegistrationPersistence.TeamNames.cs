using backend.Application.Contracts;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameRegistrationPersistence
{
    // Call while holding the game's roster lock. All create/rename paths use the
    // same lock, so even simultaneous requests cannot claim an equivalent name.
    private async Task<bool> TeamNameTakenAsync(Guid gameId, Guid? exceptTeamId, string? name, CancellationToken cancellationToken)
    {
        var key = TeamNameValue.UniquenessKey(name);
        if (key is null) return false;
        var names = await _dbContext.GameTeams.AsNoTracking()
            .Where(team => team.GameId == gameId && team.Id != exceptTeamId
                && (team.Status == TeamStatusValue.Forming || team.Status == TeamStatusValue.Confirmed))
            .Select(team => team.Name).ToArrayAsync(cancellationToken);
        return names.Any(existing => TeamNameValue.UniquenessKey(existing) == key);
    }
}
