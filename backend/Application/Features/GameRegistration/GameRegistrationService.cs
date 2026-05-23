using backend.Application.Abstractions;
using backend.Application.Abstractions.Repositories;
using backend.Application.Contracts;
using backend.Domain.Persistence;

namespace backend.Application.Features.GameRegistration;

public sealed class GameRegistrationService : IGameRegistrationService
{
    private readonly IGameRegistrationReadStore _reads;
    private readonly IGameRegistrationPersistence _persistence;

    public GameRegistrationService(
        IGameRegistrationReadStore reads,
        IGameRegistrationPersistence persistence
    )
    {
        _reads = reads;
        _persistence = persistence;
    }

    public async Task<GameRegistrationSnapshot?> GetRegistrationSnapshotAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        var game = await _reads.GetReadyGameAsync(cancellationToken);
        if (game is null)
        {
            return null;
        }

        return await _reads.BuildSnapshotAsync(game.GameId, userId, cancellationToken);
    }

    public async Task<GameRegistrationResult<RegistrationTeamDto>> CreateTeamAsync(
        Guid userId,
        bool recruitmentOpen,
        CancellationToken cancellationToken = default
    )
    {
        var game = await _reads.GetReadyGameAsync(cancellationToken);
        if (game is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.GameNotInReady);
        }

        if (await _reads.UserHasTeamMembershipAsync(game.GameId, userId, cancellationToken))
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.UserAlreadyOnTeam);
        }

        var slot = await _reads.FindAvailablePublicSlotAsync(game.GameId, cancellationToken);
        if (slot is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.NoAvailableSlot);
        }

        return await _persistence.PersistCreateTeamAsync(
            game.GameId,
            userId,
            slot.SlotId,
            recruitmentOpen,
            cancellationToken
        );
    }

    public async Task<GameRegistrationResult<RegistrationTeamDto>> JoinTeamAsync(
        Guid userId,
        Guid teamId,
        CancellationToken cancellationToken = default
    )
    {
        var game = await _reads.GetReadyGameAsync(cancellationToken);
        if (game is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.GameNotInReady);
        }

        if (await _reads.UserHasTeamMembershipAsync(game.GameId, userId, cancellationToken))
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.UserAlreadyOnTeam);
        }

        var team = await _reads.GetJoinableTeamAsync(game.GameId, teamId, cancellationToken);
        if (team is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotFound);
        }

        if (team.Status != TeamStatusValue.Forming || !team.RecruitmentOpen)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotJoinable);
        }

        return await _persistence.PersistJoinTeamAsync(
            game.GameId,
            userId,
            teamId,
            game.MaxPlayersPerTeam,
            cancellationToken
        );
    }

    public async Task<GameRegistrationResult<bool>> LeaveTeamAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        var game = await _reads.GetReadyGameAsync(cancellationToken);
        if (game is null)
        {
            return Fail<bool>(GameRegistrationErrorCode.GameNotInReady);
        }

        return await _persistence.PersistLeaveTeamAsync(game.GameId, userId, cancellationToken);
    }

    public async Task<IReadOnlyList<RegistrationTeamDto>?> ListTeamsAsync(
        CancellationToken cancellationToken = default
    )
    {
        var game = await _reads.GetReadyGameAsync(cancellationToken);
        if (game is null)
        {
            return null;
        }

        return await _reads.LoadTeamsForGameAsync(game.GameId, cancellationToken);
    }

    public async Task<GameRegistrationResult<RegistrationTeamDto>> ConfirmTeamAsync(
        Guid adminUserId,
        Guid teamId,
        CancellationToken cancellationToken = default
    )
    {
        var game = await _reads.GetReadyGameAsync(cancellationToken);
        if (game is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.GameNotInReady);
        }

        var team = await _reads.GetTeamAdminActionSnapshotAsync(game.GameId, teamId, cancellationToken);
        if (team is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotFound);
        }

        if (team.Status != TeamStatusValue.Forming)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotJoinable);
        }

        if (team.MemberCount < game.MinPlayersPerTeam || team.MemberCount > game.MaxPlayersPerTeam)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotJoinable);
        }

        return await _persistence.PersistConfirmTeamAsync(
            game.GameId,
            adminUserId,
            teamId,
            game.MinPlayersPerTeam,
            game.MaxPlayersPerTeam,
            cancellationToken
        );
    }

    public async Task<GameRegistrationResult<bool>> RejectTeamAsync(
        Guid adminUserId,
        Guid teamId,
        CancellationToken cancellationToken = default
    )
    {
        var game = await _reads.GetReadyGameAsync(cancellationToken);
        if (game is null)
        {
            return Fail<bool>(GameRegistrationErrorCode.GameNotInReady);
        }

        var team = await _reads.GetTeamAdminActionSnapshotAsync(game.GameId, teamId, cancellationToken);
        if (team is null)
        {
            return Fail<bool>(GameRegistrationErrorCode.TeamNotFound);
        }

        if (team.Status != TeamStatusValue.Forming)
        {
            return Fail<bool>(GameRegistrationErrorCode.TeamNotJoinable);
        }

        return await _persistence.PersistRejectTeamAsync(game.GameId, adminUserId, teamId, cancellationToken);
    }

    public async Task<GameRegistrationResult<RegistrationInvitationDto>> CreateAdminInvitationAsync(
        Guid adminUserId,
        Guid slotId,
        Guid invitedUserId,
        Guid? teamId,
        CancellationToken cancellationToken = default
    )
    {
        var game = await _reads.GetReadyGameAsync(cancellationToken);
        if (game is null)
        {
            return Fail<RegistrationInvitationDto>(GameRegistrationErrorCode.GameNotInReady);
        }

        var slot = await _reads.GetParticipationSlotAsync(game.GameId, slotId, cancellationToken);
        if (slot is null)
        {
            return Fail<RegistrationInvitationDto>(GameRegistrationErrorCode.SlotNotFound);
        }

        if (!await _reads.ActiveUserExistsAsync(invitedUserId, cancellationToken))
        {
            return Fail<RegistrationInvitationDto>(GameRegistrationErrorCode.UserNotFound);
        }

        if (await _reads.UserHasTeamMembershipAsync(game.GameId, invitedUserId, cancellationToken))
        {
            return Fail<RegistrationInvitationDto>(GameRegistrationErrorCode.UserAlreadyOnTeam);
        }

        if (await _reads.HasPendingInvitationAsync(game.GameId, invitedUserId, cancellationToken))
        {
            return Fail<RegistrationInvitationDto>(GameRegistrationErrorCode.PendingInvitationExists);
        }

        var blockedSlotIds = await _reads.GetBlockedSlotIdsAsync(game.GameId, cancellationToken);
        Guid? inviteTeamId = null;
        if (teamId.HasValue)
        {
            var team = await _reads.GetTeamInviteTargetSnapshotAsync(
                game.GameId,
                teamId.Value,
                cancellationToken
            );
            if (team is null)
            {
                return Fail<RegistrationInvitationDto>(GameRegistrationErrorCode.TeamNotFound);
            }

            if (team.SlotId != slot.SlotId || team.Status != TeamStatusValue.Forming)
            {
                return Fail<RegistrationInvitationDto>(GameRegistrationErrorCode.TeamNotJoinable);
            }

            if (team.MemberCount >= game.MaxPlayersPerTeam)
            {
                return Fail<RegistrationInvitationDto>(GameRegistrationErrorCode.TeamFull);
            }

            inviteTeamId = team.TeamId;
        }
        else if (IGameRegistrationReadStore.IsSlotBlocked(slot.SlotId, blockedSlotIds))
        {
            return Fail<RegistrationInvitationDto>(GameRegistrationErrorCode.SlotNotAvailable);
        }

        return await _persistence.PersistCreateAdminInvitationAsync(
            game.GameId,
            adminUserId,
            slot.SlotId,
            slot.SlotIndex,
            invitedUserId,
            inviteTeamId,
            cancellationToken
        );
    }

    public async Task<GameRegistrationResult<RegistrationTeamDto>> AcceptInvitationAsync(
        Guid userId,
        Guid invitationId,
        CancellationToken cancellationToken = default
    )
    {
        var invitation = await _reads.GetPendingInvitationAsync(userId, invitationId, cancellationToken);
        if (invitation is null)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.InvitationNotFound);
        }

        var game = await _reads.GetReadyGameAsync(cancellationToken);
        if (game is null || game.GameId != invitation.GameId)
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.GameNotInReady);
        }

        if (await _reads.UserHasTeamMembershipAsync(game.GameId, userId, cancellationToken))
        {
            return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.UserAlreadyOnTeam);
        }

        if (invitation.TeamId.HasValue)
        {
            var team = await _reads.GetTeamInviteTargetSnapshotAsync(
                game.GameId,
                invitation.TeamId.Value,
                cancellationToken
            );
            if (team is null)
            {
                return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotFound);
            }

            if (team.SlotId != invitation.SlotId || team.Status != TeamStatusValue.Forming)
            {
                return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamNotJoinable);
            }

            if (team.MemberCount >= game.MaxPlayersPerTeam)
            {
                return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.TeamFull);
            }
        }
        else
        {
            var blockedSlotIds = await _reads.GetBlockedSlotIdsAsync(game.GameId, cancellationToken);
            if (IGameRegistrationReadStore.IsSlotBlocked(invitation.SlotId, blockedSlotIds))
            {
                return Fail<RegistrationTeamDto>(GameRegistrationErrorCode.SlotNotAvailable);
            }
        }

        return await _persistence.PersistAcceptInvitationAsync(
            new AcceptInvitationCommand(
                invitation.InvitationId,
                userId,
                game.GameId,
                invitation.SlotId,
                invitation.TeamId,
                game.MaxPlayersPerTeam
            ),
            cancellationToken
        );
    }

    public async Task<GameRegistrationResult<bool>> DeclineInvitationAsync(
        Guid userId,
        Guid invitationId,
        CancellationToken cancellationToken = default
    )
    {
        var invitation = await _reads.GetPendingInvitationAsync(userId, invitationId, cancellationToken);
        if (invitation is null)
        {
            return Fail<bool>(GameRegistrationErrorCode.InvitationNotFound);
        }

        var game = await _reads.GetReadyGameAsync(cancellationToken);
        if (game is null || game.GameId != invitation.GameId)
        {
            return Fail<bool>(GameRegistrationErrorCode.GameNotInReady);
        }

        return await _persistence.PersistDeclineInvitationAsync(userId, invitationId, cancellationToken);
    }

    private static GameRegistrationResult<T> Fail<T>(GameRegistrationErrorCode error) =>
        new(false, default, error);
}
