using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameRegistrationPersistence : IGameRegistrationPersistence
{
    public async Task<GameRegistrationResult<RegistrationTeamDto>> PersistAssignPlayerAsync(
        Guid gameId,
        Guid adminUserId,
        Guid teamId,
        Guid userId,
        short maxPlayersPerTeam,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            if (_dbContext.Database.IsRelational())
            {
                await using var transaction = await BeginRosterChangeAsync(gameId, cancellationToken);
                await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"""SELECT 1 FROM game_teams WHERE id = {teamId} FOR UPDATE""",
                    cancellationToken
                );
                var sourceTeamId = await (
                    from member in _dbContext.GameTeamMembers
                    join team in _dbContext.GameTeams on member.TeamId equals team.Id
                    where member.GameId == gameId
                        && member.UserId == userId
                        && member.LeftAtUtc == null
                        && (team.Status == TeamStatusValue.Forming || team.Status == TeamStatusValue.Confirmed)
                    select (Guid?)team.Id
                ).FirstOrDefaultAsync(cancellationToken);
                if (sourceTeamId.HasValue)
                {
                    await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                        $"""SELECT 1 FROM game_teams WHERE id = {sourceTeamId.Value} FOR UPDATE""",
                        cancellationToken
                    );
                }

                var result = await AssignPlayerCoreAsync(
                    gameId,
                    adminUserId,
                    teamId,
                    userId,
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

            return await AssignPlayerCoreAsync(
                gameId,
                adminUserId,
                teamId,
                userId,
                maxPlayersPerTeam,
                cancellationToken
            );
        }
        catch (DbUpdateException ex) when (PostgresUniqueViolation.TryGetConstraintName(ex, out _))
        {
            _logger.LogWarning(ex, "Assign player failed due to unique constraint for game {GameId}.", gameId);
            return Fail<RegistrationTeamDto>(GameRegistrationUniqueViolationMapper.Map(ex));
        }
    }

    public async Task<GameRegistrationResult<RegistrationTeamDto>> PersistMoveTeamToSlotAsync(
        Guid gameId,
        Guid adminUserId,
        Guid teamId,
        Guid targetTeamSlotId,
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
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"""SELECT 1 FROM game_team_slots WHERE game_id = {gameId} FOR UPDATE""",
                cancellationToken
            );

            var targetOccupyingTeamId = await _dbContext.GameTeams
                .Where(
                    candidate => candidate.GameId == gameId
                        && candidate.SlotId == targetTeamSlotId
                        && (candidate.Status == TeamStatusValue.Forming || candidate.Status == TeamStatusValue.Confirmed)
                )
                .Select(candidate => (Guid?)candidate.Id)
                .FirstOrDefaultAsync(cancellationToken);
            if (targetOccupyingTeamId.HasValue)
            {
                await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"""SELECT 1 FROM game_teams WHERE id = {targetOccupyingTeamId.Value} FOR UPDATE""",
                    cancellationToken
                );
            }

            var result = await MoveTeamToSlotCoreAsync(
                gameId,
                adminUserId,
                teamId,
                targetTeamSlotId,
                cancellationToken
            );
            if (!result.Success)
            {
                return result;
            }

            await transaction.CommitAsync(cancellationToken);
            return result;
        }

        return await MoveTeamToSlotCoreAsync(
            gameId,
            adminUserId,
            teamId,
            targetTeamSlotId,
            cancellationToken
        );
    }

    public async Task<GameRegistrationResult<bool>> PersistRemovePlayerFromTeamAsync(
        Guid gameId,
        Guid adminUserId,
        Guid teamId,
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await BeginRosterChangeAsync(gameId, cancellationToken)
            : null;
        if (transaction is not null)
        {
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM game_teams WHERE id = {teamId} FOR UPDATE",
                cancellationToken
            );
        }

        var membership = await _dbContext.GameTeamMembers
            .Include(member => member.Team)
            .FirstOrDefaultAsync(
                member =>
                    member.GameId == gameId
                    && member.TeamId == teamId
                    && member.UserId == userId
                    && member.LeftAtUtc == null,
                cancellationToken
            );
        if (membership?.Team is null)
        {
            return Fail<bool>(GameRegistrationErrorCode.NotTeamMember);
        }

        var team = membership.Team;
        if (team.Status != TeamStatusValue.Forming)
        {
            return Fail<bool>(team.Status == TeamStatusValue.Confirmed ? GameRegistrationErrorCode.TeamRosterLocked : GameRegistrationErrorCode.TeamNotJoinable);
        }

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        await CloseMembershipAsync(membership, team, adminUserId, utcNow, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Admin {AdminUserId} removed player {UserId} from team {TeamId} in game {GameId}.",
            adminUserId,
            userId,
            teamId,
            gameId
        );

        return new GameRegistrationResult<bool>(true, true, GameRegistrationErrorCode.None);
    }

    public async Task<GameRegistrationResult<bool>> PersistCancelTeamInvitationAsync(
        Guid gameId,
        Guid adminUserId,
        Guid teamId,
        Guid invitationId,
        CancellationToken cancellationToken = default
    )
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await BeginRosterChangeAsync(gameId, cancellationToken)
            : null;

        var invitation = await _dbContext.GameTeamInvitations.FirstOrDefaultAsync(
            candidate =>
                candidate.Id == invitationId
                && candidate.GameId == gameId
                && candidate.TeamId == teamId,
            cancellationToken
        );
        if (invitation is null)
        {
            return Fail<bool>(GameRegistrationErrorCode.InvitationNotFound);
        }

        if (invitation.Status != TeamInvitationStatusValue.Pending)
        {
            return Fail<bool>(GameRegistrationErrorCode.InvitationNotPending);
        }

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        invitation.Status = TeamInvitationStatusValue.Cancelled;
        invitation.RespondedAtUtc = utcNow;

        var team = await _dbContext.GameTeams.FirstOrDefaultAsync(
            candidate => candidate.Id == teamId && candidate.GameId == gameId,
            cancellationToken
        );
        if (team is not null)
        {
            team.UpdatedAtUtc = utcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Admin {AdminUserId} cancelled invitation {InvitationId} for team {TeamId} in game {GameId}.",
            adminUserId,
            invitationId,
            teamId,
            gameId
        );

        return new GameRegistrationResult<bool>(true, true, GameRegistrationErrorCode.None);
    }

    public async Task<GameRegistrationResult<bool>> PersistRejectTeamAsync(
        Guid gameId,
        Guid adminUserId,
        Guid teamId,
        CancellationToken cancellationToken = default
    )
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await BeginRosterChangeAsync(gameId, cancellationToken)
            : null;
        if (transaction is not null)
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM game_teams WHERE id = {teamId} FOR UPDATE", cancellationToken);

        var game = await _dbContext.Games.AsNoTracking().FirstOrDefaultAsync(
            candidate => candidate.Id == gameId && !candidate.IsDeleted, cancellationToken);
        if (game is null || (game.Status != GameStatusValue.Ready && game.Status != GameStatusValue.Active))
            return Fail<bool>(GameRegistrationErrorCode.GameNotInReady);
        var team = await _dbContext.GameTeams.FirstOrDefaultAsync(
            candidate => candidate.Id == teamId && candidate.GameId == gameId, cancellationToken);
        if (team is null)
            return Fail<bool>(GameRegistrationErrorCode.TeamNotFound);
        if (transaction is not null)
            await _dbContext.Entry(team).ReloadAsync(cancellationToken);
        if (team.Status != TeamStatusValue.Forming)
            return Fail<bool>(GameRegistrationErrorCode.TeamNotJoinable);

        if (game.ActiveTeamId == teamId || await _dbContext.GameRounds.AnyAsync(
                round => round.GameId == gameId && round.TeamId == teamId
                    && round.Status != GameRoundStatusValue.Completed && round.Status != GameRoundStatusValue.Cancelled,
                cancellationToken))
            return Fail<bool>(GameRegistrationErrorCode.TeamActiveInGame);
        if (team.IsPlayed || await _dbContext.GameRounds.AnyAsync(
                round => round.GameId == gameId && round.TeamId == teamId, cancellationToken))
            return Fail<bool>(GameRegistrationErrorCode.TeamAlreadyPlayed);

        var members = await _dbContext.GameTeamMembers
            .Where(member => member.TeamId == team.Id && member.LeftAtUtc == null)
            .ToListAsync(cancellationToken);
        if (transaction is not null)
            foreach (var member in members)
                await _dbContext.Entry(member).ReloadAsync(cancellationToken);
        if (TeamNameValue.Normalize(team.Name) is null || members.Count != game.MaxPlayersPerTeam
            || members.Any(member => member.LeftAtUtc.HasValue || !member.ReadyAtUtc.HasValue)
            || await _dbContext.GameTeamInvitations.AnyAsync(
                invite => invite.TeamId == teamId && invite.Status == TeamInvitationStatusValue.Pending, cancellationToken))
            return Fail<bool>(GameRegistrationErrorCode.TeamNotReady);

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        foreach (var member in members)
        {
            _dbContext.GameUserNotifications.Add(new backend.Data.Entities.GameUserNotification
            {
                Id = Guid.NewGuid(),
                UserId = member.UserId,
                GameId = gameId,
                Type = GameNotificationTypes.TeamRejected,
                SchemaVersion = 1,
                PayloadJson = System.Text.Json.JsonSerializer.Serialize(new { teamName = team.Name }),
                DeduplicationKey = $"team_rejected:{teamId:N}",
                CreatedAtUtc = utcNow
            });
            member.ReadyAtUtc = null;
            member.LeftAtUtc = utcNow;
        }
        team.Status = TeamStatusValue.Rejected;
        team.RecruitmentOpen = false;
        team.RejectedAtUtc = utcNow;
        team.RejectedByUserId = adminUserId;
        team.UpdatedAtUtc = utcNow;
        await CancelPendingTeamInvitationsAsync(team.Id, utcNow, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
            await transaction.CommitAsync(cancellationToken);
        _logger.LogInformation("Team {TeamId} rejected by admin {AdminUserId}.", teamId, adminUserId);
        return new GameRegistrationResult<bool>(true, true, GameRegistrationErrorCode.None);
    }
}
