import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'

export function getTeamFreePlaces(team: RegistrationTeam, capacity: number) {
  return Math.max(0, capacity - team.members.length - (team.pendingInvitations?.length ?? 0))
}

export function isTeamJoinable(team: RegistrationTeam, capacity: number) {
  return team.status === 'forming' && team.recruitmentOpen && getTeamFreePlaces(team, capacity) > 0
}
