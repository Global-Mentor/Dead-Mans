import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'

export function canRejectAdminTeam(team: RegistrationTeam, maxPlayers: number) {
  return (
    team.status === 'forming' &&
    Boolean(team.name?.trim()) &&
    !team.pendingInvitations?.length &&
    !team.isActiveInGame &&
    !team.isPlayed &&
    !team.hasOpenedCard &&
    team.members.length === maxPlayers &&
    team.members.every((member) => Boolean(member.readyAtUtc))
  )
}

export function canConfirmAdminTeam(
  team: RegistrationTeam,
  minPlayers: number,
  maxPlayers: number,
) {
  return (
    team.status === 'forming' &&
    Boolean(team.name?.trim()) &&
    !team.pendingInvitations?.length &&
    team.members.length >= minPlayers &&
    team.members.length <= maxPlayers
  )
}
