using backend.Application.Contracts;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameRegistrationPersistence
{
    public async Task<GameRegistrationResult<RegistrationTeamDto>> PersistConfirmTeamAsync(
        Guid gameId,
        Guid adminUserId,
        Guid teamId,
        short minPlayersPerTeam,
        short maxPlayersPerTeam,
        CancellationToken cancellationToken = default
    )
    {
        if (_dbContext.Database.IsRelational())
        {
            await using var transaction = await BeginRosterChangeAsync(gameId, cancellationToken);
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"""SELECT 1 FROM game_teams WHERE id = {teamId} FOR UPDATE""",
                cancellationToken
            );

            var result = await ConfirmTeamCoreAsync(
                gameId,
                adminUserId,
                teamId,
                minPlayersPerTeam,
                maxPlayersPerTeam,
                cancellationToken
            );
            if (!result.Success)
            {
                return result;
            }

            await transaction.CommitAsync(cancellationToken);
            return result;
        }

        return await ConfirmTeamCoreAsync(
            gameId,
            adminUserId,
            teamId,
            minPlayersPerTeam,
            maxPlayersPerTeam,
            cancellationToken
        );
    }

    private async Task<GameRegistrationResult<RegistrationTeamDto>> ConfirmTeamCoreAsync(
        Guid gameId,
        Guid adminUserId,
        Guid teamId,
        short minPlayersPerTeam,
        short maxPlayersPerTeam,
        CancellationToken cancellationToken
    )
    {
        var team = await _dbContext.GameTeams
            .FirstOrDefaultAsync(candidate => candidate.Id == teamId && candidate.GameId == gameId, cancellationToken);
        if (team is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotFound);
        }

        if (team.Status != TeamStatusValue.Forming)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotJoinable);
        }

        if (TeamNameValue.Normalize(team.Name) is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNameRequired);
        }

        var memberCount = await _dbContext.GameTeamMembers.CountAsync(
            member => member.TeamId == team.Id && member.LeftAtUtc == null,
            cancellationToken
        );
        if (memberCount < minPlayersPerTeam || memberCount > maxPlayersPerTeam)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotJoinable);
        }

        var hasPendingInvitation = await _dbContext.GameTeamInvitations.AnyAsync(
            invitation =>
                invitation.TeamId == team.Id
                && invitation.Status == TeamInvitationStatusValue.Pending,
            cancellationToken
        );
        if (hasPendingInvitation)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.PendingOutgoingInvitation);
        }

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        team.Status = TeamStatusValue.Confirmed;
        team.ConfirmedAtUtc = utcNow;
        team.ConfirmedByUserId = adminUserId;
        team.UpdatedAtUtc = utcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await LoadTeamResultAsync(team.Id, cancellationToken);
    }

    public async Task<GameRegistrationResult<RegistrationTeamDto>> PersistUnconfirmTeamAsync(
        Guid gameId, Guid adminUserId, Guid teamId, CancellationToken cancellationToken = default)
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await BeginRosterChangeAsync(gameId, cancellationToken) : null;
        if (transaction is not null)
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM game_teams WHERE id = {teamId} FOR UPDATE", cancellationToken);

        var game = await _dbContext.Games.AsNoTracking().FirstOrDefaultAsync(
            candidate => candidate.Id == gameId && !candidate.IsDeleted, cancellationToken);
        if (game is null || (game.Status != GameStatusValue.Ready && game.Status != GameStatusValue.Active))
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.GameNotInReady);

        var team = await _dbContext.GameTeams.FirstOrDefaultAsync(
            candidate => candidate.Id == teamId && candidate.GameId == gameId, cancellationToken);
        if (team is null)
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotFound);
        if (transaction is not null)
            await _dbContext.Entry(team).ReloadAsync(cancellationToken);

        if (game.ActiveTeamId == teamId || await _dbContext.GameRounds.AnyAsync(
                round => round.GameId == gameId && round.TeamId == teamId
                    && round.Status != GameRoundStatusValue.Completed && round.Status != GameRoundStatusValue.Cancelled,
                cancellationToken))
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamActiveInGame);
        if (team.IsPlayed || await _dbContext.GameRounds.AnyAsync(
                round => round.GameId == gameId && round.TeamId == teamId, cancellationToken))
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamAlreadyPlayed);
        if (team.Status != TeamStatusValue.Confirmed)
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotJoinable);

        team.Status = TeamStatusValue.Forming;
        team.ConfirmedAtUtc = null;
        team.ConfirmedByUserId = null;
        team.UpdatedAtUtc = _timeProvider.GetUtcNow().UtcDateTime;
        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
            await transaction.CommitAsync(cancellationToken);

        _logger.LogInformation("Team {TeamId} confirmation cancelled by admin {AdminUserId}.", teamId, adminUserId);
        return await LoadTeamResultAsync(teamId, cancellationToken);
    }
}
