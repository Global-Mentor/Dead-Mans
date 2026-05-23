namespace backend.Api.Contracts;

public sealed record RegistrationPlayerDto(Guid UserId, string Login, string DisplayName);

public sealed record RegistrationTeamMemberDto(RegistrationPlayerDto Player, DateTime JoinedAtUtc);

public sealed record RegistrationTeamDto(
    Guid TeamId,
    int SlotIndex,
    string SlotAvailability,
    string? ReservedLabel,
    bool RecruitmentOpen,
    string Status,
    IReadOnlyList<RegistrationTeamMemberDto> Members
);

public sealed record RegistrationSlotDto(
    Guid SlotId,
    int SlotIndex,
    string Availability,
    string? ReservedLabel,
    bool IsAvailableForNewTeam,
    Guid? TeamId,
    string? TeamStatus
);

public sealed record RegistrationInvitationDto(
    Guid InvitationId,
    Guid SlotId,
    int SlotIndex,
    Guid? TeamId,
    string Status,
    DateTime CreatedAtUtc
);

public sealed record GameRegistrationSnapshotDto(
    Guid GameId,
    string GameStatus,
    int MinPlayersPerTeam,
    int MaxPlayersPerTeam,
    IReadOnlyList<RegistrationSlotDto> Slots,
    IReadOnlyList<RegistrationTeamDto> Teams,
    RegistrationTeamDto? MyTeam,
    IReadOnlyList<RegistrationInvitationDto> MyPendingInvitations
);

public sealed record CreateRegistrationTeamRequestDto(bool RecruitmentOpen);

public sealed record CreateAdminInvitationRequestDto(
    Guid SlotId,
    Guid InvitedUserId,
    Guid? TeamId
);

public sealed record GameLifecycleStateDto(Guid GameId, string Status);
