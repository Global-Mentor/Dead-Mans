using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Data;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameRegistrationPersistence : IGameRegistrationPersistence
{
    public async Task<GameRegistrationResult<RegistrationTeamDto>> PersistCreateTeamAsync(
        Guid gameId,
        Guid userId,
        Guid teamSlotId,
        bool recruitmentOpen,
        string? name = null,
        CancellationToken cancellationToken = default
    )
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await BeginRosterChangeAsync(gameId, cancellationToken)
            : null;

        if (!await IsRegistrationOpenAsync(gameId, cancellationToken))
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.GameNotInReady);
        }

        if (await TeamNameTakenAsync(gameId, null, name, cancellationToken))
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNameTaken);
        }

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        var team = new GameTeam
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            SlotId = teamSlotId,
            Name = TeamNameValue.Normalize(name),
            RecruitmentOpen = recruitmentOpen,
            Status = TeamStatusValue.Forming,
            CreatedByUserId = userId,
            CreatedAtUtc = utcNow,
            UpdatedAtUtc = utcNow
        };

        var member = new GameTeamMember
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            TeamId = team.Id,
            UserId = userId,
            JoinedAtUtc = utcNow
        };

        try
        {
            _dbContext.GameTeams.Add(team);
            _dbContext.GameTeamMembers.Add(member);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (PostgresUniqueViolation.TryGetConstraintName(ex, out _))
        {
            _logger.LogWarning(ex, "Create team failed due to unique constraint for game {GameId}.", gameId);
            return Fail<RegistrationTeamDto>(GameRegistrationUniqueViolationMapper.Map(ex));
        }

        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return await LoadTeamResultAsync(team.Id, cancellationToken);
    }

    public async Task<GameRegistrationResult<RegistrationTeamDto>> PersistCreateEmptyTeamAsync(
        Guid gameId,
        Guid adminUserId,
        Guid teamSlotId,
        bool recruitmentOpen,
        string? name = null,
        CancellationToken cancellationToken = default
    )
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await BeginRosterChangeAsync(gameId, cancellationToken)
            : null;

        if (!await _dbContext.Games.AsNoTracking().AnyAsync(
                game => game.Id == gameId && !game.IsDeleted
                    && (game.Status == GameStatusValue.Ready || game.Status == GameStatusValue.Active),
                cancellationToken))
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.GameNotInReady);
        }

        if (await TeamNameTakenAsync(gameId, null, name, cancellationToken))
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNameTaken);
        }

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        var team = new GameTeam
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            SlotId = teamSlotId,
            Name = TeamNameValue.Normalize(name),
            RecruitmentOpen = recruitmentOpen,
            Status = TeamStatusValue.Forming,
            CreatedByUserId = adminUserId,
            CreatedAtUtc = utcNow,
            UpdatedAtUtc = utcNow
        };

        try
        {
            _dbContext.GameTeams.Add(team);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (PostgresUniqueViolation.TryGetConstraintName(ex, out _))
        {
            _logger.LogWarning(
                ex,
                "Create empty team failed due to unique constraint for game {GameId}.",
                gameId
            );
            return Fail<RegistrationTeamDto>(GameRegistrationUniqueViolationMapper.Map(ex));
        }

        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return await LoadTeamResultAsync(team.Id, cancellationToken);
    }

    public async Task<GameRegistrationResult<RegistrationTeamDto>> PersistUpdateTeamNameAsync(
        Guid gameId,
        Guid teamId,
        string? name,
        Guid? actingPlayerId,
        CancellationToken cancellationToken = default
    )
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await BeginRosterChangeAsync(gameId, cancellationToken)
            : null;

        var canRenameInGame = await _dbContext.Games.AsNoTracking().AnyAsync(
            game => game.Id == gameId && !game.IsDeleted
                && (game.Status == GameStatusValue.Ready
                    || (!actingPlayerId.HasValue && game.Status == GameStatusValue.Active)),
            cancellationToken);
        if (!canRenameInGame)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.GameNotInReady);
        }

        // The player may have left or been removed after the service's initial read.
        if (actingPlayerId.HasValue && !await _dbContext.GameTeamMembers.AnyAsync(
                member => member.GameId == gameId && member.TeamId == teamId
                    && member.UserId == actingPlayerId.Value && member.LeftAtUtc == null,
                cancellationToken))
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.NotTeamMember);
        }

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

        if (await TeamNameTakenAsync(gameId, teamId, name, cancellationToken))
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNameTaken);
        }

        team.Name = TeamNameValue.Normalize(name);
        if (team.Name is null)
        {
            var members = await _dbContext.GameTeamMembers
                .Where(member => member.TeamId == team.Id && member.LeftAtUtc == null)
                .ToListAsync(cancellationToken);
            foreach (var member in members)
            {
                member.ReadyAtUtc = null;
            }
        }
        team.UpdatedAtUtc = _timeProvider.GetUtcNow().UtcDateTime;
        await _dbContext.SaveChangesAsync(cancellationToken);

        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return await LoadTeamResultAsync(team.Id, cancellationToken);
    }

    public async Task<GameRegistrationResult<RegistrationTeamDto>> PersistJoinTeamAsync(
        Guid gameId,
        Guid userId,
        Guid teamId,
        short maxPlayersPerTeam,
        CancellationToken cancellationToken = default
    )
    {
        var team = await _dbContext.GameTeams
            .FirstOrDefaultAsync(candidate => candidate.Id == teamId && candidate.GameId == gameId, cancellationToken);
        if (team is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotFound);
        }

        try
        {
            if (_dbContext.Database.IsRelational())
            {
                await using var transaction = await BeginRosterChangeAsync(gameId, cancellationToken);
                await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"""SELECT 1 FROM game_teams WHERE id = {team.Id} FOR UPDATE""",
                    cancellationToken
                );
                await _dbContext.Entry(team).ReloadAsync(cancellationToken);

                var joinResult = await AddJoiningMemberAsync(gameId, userId, team, maxPlayersPerTeam, cancellationToken);
                if (!joinResult.Success)
                {
                    return joinResult;
                }

                await transaction.CommitAsync(cancellationToken);
            }
            else
            {
                var joinResult = await AddJoiningMemberAsync(gameId, userId, team, maxPlayersPerTeam, cancellationToken);
                if (!joinResult.Success)
                {
                    return joinResult;
                }
            }
        }
        catch (DbUpdateException ex) when (PostgresUniqueViolation.TryGetConstraintName(ex, out _))
        {
            _logger.LogWarning(ex, "Join team failed due to unique constraint for game {GameId}.", gameId);
            return Fail<RegistrationTeamDto>(GameRegistrationUniqueViolationMapper.Map(ex));
        }

        return await LoadTeamResultAsync(team.Id, cancellationToken);
    }

    public async Task<GameRegistrationResult<bool>> PersistLeaveTeamAsync(
        Guid gameId,
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await BeginRosterChangeAsync(gameId, cancellationToken)
            : null;

        var membership = await _dbContext.GameTeamMembers
            .Include(member => member.Team)
            .FirstOrDefaultAsync(
                member => member.GameId == gameId && member.UserId == userId && member.LeftAtUtc == null,
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

        // Recheck under the same lock as invitation creation and team confirmation.
        if (await _reads.TeamHasPendingInvitationAsync(gameId, team.Id, cancellationToken))
        {
            return Fail<bool>(GameRegistrationErrorCode.PendingOutgoingInvitation);
        }

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        await CloseMembershipAsync(membership, team, userId, utcNow, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return new GameRegistrationResult<bool>(true, true, GameRegistrationErrorCode.None);
    }

    public async Task<GameRegistrationResult<RegistrationTeamDto>> PersistRequestTeamDisbandAsync(
        Guid gameId,
        Guid userId,
        Guid teamId,
        CancellationToken cancellationToken = default
    )
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await BeginRosterChangeAsync(gameId, cancellationToken)
            : null;

        if (!await IsRegistrationOpenAsync(gameId, cancellationToken))
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.GameNotInReady);
        }

        var team = await _dbContext.GameTeams
            .FirstOrDefaultAsync(candidate => candidate.Id == teamId && candidate.GameId == gameId, cancellationToken);
        if (team is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotFound);
        }

        if (team.Status != TeamStatusValue.Confirmed)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotJoinable);
        }

        var isActiveMember = await _dbContext.GameTeamMembers.AnyAsync(
            member =>
                member.GameId == gameId
                && member.TeamId == teamId
                && member.UserId == userId
                && member.LeftAtUtc == null,
            cancellationToken
        );
        if (!isActiveMember)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.NotTeamMember);
        }

        if (team.DisbandRequestedAtUtc is null)
        {
            var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
            team.DisbandRequestedAtUtc = utcNow;
            team.DisbandRequestedByUserId = userId;
            team.UpdatedAtUtc = utcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return await LoadTeamResultAsync(team.Id, cancellationToken);
    }

}
