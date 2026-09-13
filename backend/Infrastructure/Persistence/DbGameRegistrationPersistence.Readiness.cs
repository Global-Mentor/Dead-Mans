using backend.Application.Contracts;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameRegistrationPersistence
{
    public async Task<GameRegistrationResult<RegistrationTeamDto>> PersistSetMemberReadinessAsync(
        Guid gameId,
        Guid userId,
        bool isReady,
        CancellationToken cancellationToken = default
    )
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await BeginRosterChangeAsync(gameId, cancellationToken)
            : null;

        // Read the lifecycle and capacity after acquiring the roster lock. The service's
        // snapshot may predate a concurrent lifecycle change.
        var game = await _dbContext.Games.AsNoTracking()
            .Where(candidate => candidate.Id == gameId && !candidate.IsDeleted
                && candidate.Status == GameStatusValue.Ready)
            .Select(candidate => new { candidate.MaxPlayersPerTeam })
            .SingleOrDefaultAsync(cancellationToken);
        if (game is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.GameNotInReady);
        }

        var membership = await _dbContext.GameTeamMembers
            .Include(member => member.Team)
            .FirstOrDefaultAsync(
                member => member.GameId == gameId
                    && member.UserId == userId
                    && member.LeftAtUtc == null,
                cancellationToken
            );
        if (membership?.Team is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.NotTeamMember);
        }

        if (transaction is not null)
        {
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM game_teams WHERE id = {membership.TeamId} FOR UPDATE",
                cancellationToken
            );
            await _dbContext.Entry(membership.Team).ReloadAsync(cancellationToken);
            await _dbContext.Entry(membership).ReloadAsync(cancellationToken);
        }

        var team = membership.Team;
        if (team.Status != TeamStatusValue.Forming)
        {
            return Fail<RegistrationTeamDto>(
                team.Status == TeamStatusValue.Confirmed
                    ? GameRegistrationErrorCode.TeamRosterLocked
                    : GameRegistrationErrorCode.TeamNotJoinable
            );
        }

        if (isReady)
        {
            if (TeamNameValue.Normalize(team.Name) is null)
            {
                return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNameRequired);
            }

            var memberCount = await _dbContext.GameTeamMembers.CountAsync(
                member => member.TeamId == team.Id && member.LeftAtUtc == null,
                cancellationToken
            );
            if (memberCount != game.MaxPlayersPerTeam)
            {
                return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotFull);
            }
        }

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        membership.ReadyAtUtc = isReady ? membership.ReadyAtUtc ?? utcNow : null;
        team.UpdatedAtUtc = utcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return await LoadTeamResultAsync(team.Id, cancellationToken);
    }
}
