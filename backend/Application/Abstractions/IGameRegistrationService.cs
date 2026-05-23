using backend.Application.Contracts;

namespace backend.Application.Abstractions;

public interface IGameRegistrationService
{
    Task<GameRegistrationSnapshot?> GetRegistrationSnapshotAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<RegistrationTeamDto>> CreateTeamAsync(
        Guid userId,
        bool recruitmentOpen,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<RegistrationTeamDto>> JoinTeamAsync(
        Guid userId,
        Guid teamId,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<bool>> LeaveTeamAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<RegistrationTeamDto>?> ListTeamsAsync(
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<RegistrationTeamDto>> ConfirmTeamAsync(
        Guid adminUserId,
        Guid teamId,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<bool>> RejectTeamAsync(
        Guid adminUserId,
        Guid teamId,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<RegistrationInvitationDto>> CreateAdminInvitationAsync(
        Guid adminUserId,
        Guid slotId,
        Guid invitedUserId,
        Guid? teamId,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<RegistrationTeamDto>> AcceptInvitationAsync(
        Guid userId,
        Guid invitationId,
        CancellationToken cancellationToken = default
    );

    Task<GameRegistrationResult<bool>> DeclineInvitationAsync(
        Guid userId,
        Guid invitationId,
        CancellationToken cancellationToken = default
    );
}
