using backend.Application.Contracts;
using backend.Data.Entities;
using backend.Domain.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace backend.Infrastructure.Persistence;

public sealed partial class DbGameRegistrationPersistence
{
    private Task<bool> IsRegistrationOpenAsync(Guid gameId, CancellationToken cancellationToken) =>
        _dbContext.Games.AsNoTracking().AnyAsync(
            game => game.Id == gameId && game.Status == GameStatusValue.Ready && !game.IsDeleted,
            cancellationToken
        );

    private async Task<IDbContextTransaction> BeginRosterChangeAsync(
        Guid gameId,
        CancellationToken cancellationToken
    )
    {
        var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // Always lock the game before teams, slots or invitations. This also serializes
            // registration changes with game start, round creation and team selection.
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM games WHERE id = {gameId} FOR UPDATE",
                cancellationToken
            );
            return transaction;
        }
        catch
        {
            await transaction.DisposeAsync();
            throw;
        }
    }

    private static void MarkTeamDisbanded(GameTeam team, Guid actorUserId, DateTime utcNow)
    {
        team.Status = TeamStatusValue.Disbanded;
        team.RecruitmentOpen = false;
        team.DisbandedAtUtc = utcNow;
        team.DisbandedByUserId = actorUserId;
        team.DisbandRequestedAtUtc = null;
        team.DisbandRequestedByUserId = null;
        team.UpdatedAtUtc = utcNow;
    }

    private async Task CloseMembershipAsync(
        GameTeamMember membership,
        GameTeam team,
        Guid actorUserId,
        DateTime utcNow,
        CancellationToken cancellationToken
    )
    {
        membership.LeftAtUtc = utcNow;
        team.UpdatedAtUtc = utcNow;

        var hasRemainingMembers = await _dbContext.GameTeamMembers.AnyAsync(
            member => member.TeamId == team.Id && member.LeftAtUtc == null && member.Id != membership.Id,
            cancellationToken
        );
        if (!hasRemainingMembers)
        {
            MarkTeamDisbanded(team, actorUserId, utcNow);
            await CancelPendingTeamInvitationsAsync(team.Id, utcNow, cancellationToken);
        }
    }

    private async Task CancelPendingTeamInvitationsAsync(
        Guid teamId,
        DateTime utcNow,
        CancellationToken cancellationToken
    )
    {
        var invitations = await _dbContext.GameTeamInvitations
            .Where(invitation => invitation.TeamId == teamId && invitation.Status == TeamInvitationStatusValue.Pending)
            .ToListAsync(cancellationToken);
        foreach (var invitation in invitations)
        {
            invitation.Status = TeamInvitationStatusValue.Cancelled;
            invitation.RespondedAtUtc = utcNow;
        }
    }

    public async Task<GameRegistrationResult<bool>> PersistDisbandTeamAsync(
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
        {
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM game_teams WHERE id = {teamId} FOR UPDATE",
                cancellationToken
            );
        }

        var game = await _dbContext.Games.AsNoTracking().FirstOrDefaultAsync(
            candidate => candidate.Id == gameId && !candidate.IsDeleted,
            cancellationToken
        );
        if (game is null || (game.Status != GameStatusValue.Ready && game.Status != GameStatusValue.Active))
        {
            return Fail<bool>(GameRegistrationErrorCode.GameNotInReady);
        }

        var team = await _dbContext.GameTeams
            .FirstOrDefaultAsync(candidate => candidate.Id == teamId && candidate.GameId == gameId, cancellationToken);
        if (team is null)
        {
            return Fail<bool>(GameRegistrationErrorCode.TeamNotFound);
        }

        if (transaction is not null)
        {
            await _dbContext.Entry(team).ReloadAsync(cancellationToken);
        }

        if (game.ActiveTeamId == teamId || await _dbContext.GameRounds.AnyAsync(
                round => round.GameId == gameId && round.TeamId == teamId
                    && round.Status != GameRoundStatusValue.Completed
                    && round.Status != GameRoundStatusValue.Cancelled,
                cancellationToken
            ))
        {
            return Fail<bool>(GameRegistrationErrorCode.TeamActiveInGame);
        }

        if (team.IsPlayed || await _dbContext.GameRounds.AnyAsync(
                round => round.GameId == gameId && round.TeamId == teamId,
                cancellationToken
            ))
        {
            return Fail<bool>(GameRegistrationErrorCode.TeamAlreadyPlayed);
        }

        if (team.Status != TeamStatusValue.Forming && team.Status != TeamStatusValue.Confirmed)
        {
            return Fail<bool>(GameRegistrationErrorCode.TeamNotJoinable);
        }

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        MarkTeamDisbanded(team, adminUserId, utcNow);

        if (transaction is not null)
        {
            // Membership closure is allowed only after its team is disbanded.
            // The deferred roster constraints validate the complete transaction.
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var members = await _dbContext.GameTeamMembers
            .Where(member => member.TeamId == team.Id && member.LeftAtUtc == null)
            .ToListAsync(cancellationToken);
        foreach (var member in members)
        {
            member.LeftAtUtc = utcNow;
        }

        await CancelPendingTeamInvitationsAsync(team.Id, utcNow, cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);

        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Team {TeamId} disbanded by admin {AdminUserId}.",
            teamId,
            adminUserId
        );

        return new GameRegistrationResult<bool>(true, true, GameRegistrationErrorCode.None);
    }

}
