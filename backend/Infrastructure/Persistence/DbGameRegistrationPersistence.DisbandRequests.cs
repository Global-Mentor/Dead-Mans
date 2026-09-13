using backend.Application.Contracts;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameRegistrationPersistence
{
    public async Task<GameRegistrationResult<RegistrationTeamDto>> PersistCancelTeamDisbandRequestAsync(
        Guid gameId, Guid userId, Guid teamId, CancellationToken cancellationToken = default)
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await BeginRosterChangeAsync(gameId, cancellationToken) : null;
        if (!await IsRegistrationOpenAsync(gameId, cancellationToken))
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.GameNotInReady);
        var team = await _dbContext.GameTeams.SingleOrDefaultAsync(
            item => item.Id == teamId && item.GameId == gameId, cancellationToken);
        if (team is null) return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotFound);
        if (team.Status != TeamStatusValue.Confirmed)
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotJoinable);
        if (!await _dbContext.GameTeamMembers.AnyAsync(member => member.TeamId == teamId
            && member.UserId == userId && member.LeftAtUtc == null, cancellationToken))
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.NotTeamMember);
        if (team.DisbandRequestedAtUtc is not null && team.DisbandRequestedByUserId != userId)
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.DisbandRequestNotOwned);
        team.DisbandRequestedAtUtc = null;
        team.DisbandRequestedByUserId = null;
        team.UpdatedAtUtc = _timeProvider.GetUtcNow().UtcDateTime;
        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return await LoadTeamResultAsync(teamId, cancellationToken);
    }
}
