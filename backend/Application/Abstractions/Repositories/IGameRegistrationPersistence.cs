using backend.Application.Contracts;

namespace backend.Application.Abstractions.Repositories;

public interface IGameRegistrationPersistence
{
    Task<GameRegistrationResult<RegistrationTeamDto>> PersistCreateTeamAsync(
        Guid gameId,
        Guid userId,
        Guid slotId,
        bool recruitmentOpen,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<RegistrationTeamDto>> PersistJoinTeamAsync(
        Guid gameId,
        Guid userId,
        Guid teamId,
        short maxPlayersPerTeam,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<bool>> PersistLeaveTeamAsync(
        Guid gameId,
        Guid userId,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<RegistrationTeamDto>> PersistConfirmTeamAsync(
        Guid gameId,
        Guid adminUserId,
        Guid teamId,
        short minPlayersPerTeam,
        short maxPlayersPerTeam,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<bool>> PersistRejectTeamAsync(
        Guid gameId,
        Guid adminUserId,
        Guid teamId,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<RegistrationInvitationDto>> PersistCreateAdminInvitationAsync(
        Guid gameId,
        Guid adminUserId,
        Guid slotId,
        int slotIndex,
        Guid invitedUserId,
        Guid? teamId,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<RegistrationTeamDto>> PersistAcceptInvitationAsync(
        AcceptInvitationCommand command,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<bool>> PersistDeclineInvitationAsync(
        Guid userId,
        Guid invitationId,
        CancellationToken cancellationToken = default
    );
}
