import type { components } from '../../../shared/api/contracts/generated'

type Round = components['schemas']['GameHistoryRoundItemDto']

export function resolveHistoryTeamSelection({
  teamIds,
  rounds,
  teamMembers,
  requestedTeamId,
  userId,
  focusOwnTeam,
}: {
  teamIds: readonly string[]
  rounds: readonly Pick<Round, 'roundId' | 'teamId' | 'participants' | 'startedAtUtc'>[]
  teamMembers: readonly components['schemas']['GameHistoryTeamMemberDto'][]
  requestedTeamId: string | null
  userId: string | undefined
  focusOwnTeam: boolean
}): string | null {
  if (requestedTeamId && teamIds.includes(requestedTeamId)) return requestedTeamId
  if (focusOwnTeam && userId) {
    const membership = teamMembers.find(
      (member) => member.userId === userId && teamIds.includes(member.teamId),
    )
    if (membership) return membership.teamId
    const latestRound = rounds
      .filter(
        (round) =>
          teamIds.includes(round.teamId) &&
          round.participants.some((participant) => participant.userId === userId),
      )
      .sort(
        (left, right) =>
          Date.parse(right.startedAtUtc) - Date.parse(left.startedAtUtc) ||
          right.roundId.localeCompare(left.roundId),
      )[0]
    if (latestRound) return latestRound.teamId
  }
  return teamIds[0] ?? null
}
