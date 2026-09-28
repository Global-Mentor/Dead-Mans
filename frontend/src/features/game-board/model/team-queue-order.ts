import type { GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'

interface OrderedTeamQueueItem {
  team: GameTeamQueueItem
  originalIndex: number
  playedOrder?: number
}

export function groupTeamQueueTeams(teams: readonly GameTeamQueueItem[]) {
  const indexedTeams = teams.map((team, originalIndex) => ({ team, originalIndex }))
  const remainingTeams = indexedTeams.filter(({ team }) => !team.isPlayed)
  const playedTeams = indexedTeams
    .filter(({ team }) => team.isPlayed)
    .sort(comparePlayedTeams)
    .map((item, index) => ({ ...item, playedOrder: index + 1 }))

  return { remainingTeams, playedTeams }
}

export function sortPlayedTeamsByScore(
  teams: ReturnType<typeof groupTeamQueueTeams>['playedTeams'],
) {
  return [...teams].sort((left, right) => {
    const leftScore = left.team.finalScore
    const rightScore = right.team.finalScore

    if (leftScore === null) return rightScore === null ? left.playedOrder - right.playedOrder : 1
    if (rightScore === null) return -1
    return rightScore - leftScore || left.playedOrder - right.playedOrder
  })
}

function comparePlayedTeams(left: OrderedTeamQueueItem, right: OrderedTeamQueueItem) {
  const leftPlayedAt = parseOptionalTime(left.team.playedAtUtc)
  const rightPlayedAt = parseOptionalTime(right.team.playedAtUtc)

  if (leftPlayedAt !== null && rightPlayedAt !== null && leftPlayedAt !== rightPlayedAt) {
    return leftPlayedAt - rightPlayedAt
  }
  if (leftPlayedAt !== null && rightPlayedAt === null) return -1
  if (leftPlayedAt === null && rightPlayedAt !== null) return 1
  return left.originalIndex - right.originalIndex
}

function parseOptionalTime(value: string | null | undefined) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}
