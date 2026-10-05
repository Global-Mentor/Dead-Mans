import type { components } from '../../../shared/api/contracts/generated'
import {
  getTeamBestScore,
  getTeamFinalScore,
  getTeamPenaltyTotal,
  getTeamTotalKills,
  getTeamTotalBounties,
  type GameHistoryTeamLeaderboardEntry,
} from './game-history-team-leaderboard.ts'

type FinishSummary = components['schemas']['GameFinishSummaryDto']
export type LeaderboardResult = Pick<
  GameHistoryTeamLeaderboardEntry,
  'teamId' | 'teamName' | 'teamSlotIndex' | 'participantNames' | 'roundsPlayed' | 'rounds'
> & {
  rank: number | null
  finalScore: number | null
  bestScore: number | null
  penaltyTotal: number
  totalKills: number
  totalBounties: number
  averageScore: number | null
  bestRoundId: string | null
}

export function buildLeaderboardResults(
  entries: readonly GameHistoryTeamLeaderboardEntry[],
  summary?: FinishSummary | null,
): LeaderboardResult[] {
  if (summary)
    return summary.teams
      .map((team) => {
        const history = entries.find((entry) => entry.teamId === team.teamId)
        return {
          ...team,
          rank: team.placement ?? null,
          finalScore: team.finalScore ?? null,
          bestScore: team.bestScore ?? null,
          rounds: history?.rounds ?? [],
          averageScore: history?.averageScore ?? null,
          bestRoundId: history?.bestRound.roundId ?? null,
        }
      })
      .sort(
        (left, right) =>
          (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER),
      )
  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    finalScore: getTeamFinalScore(entry),
    bestScore: getTeamBestScore(entry),
    penaltyTotal: getTeamPenaltyTotal(entry),
    totalKills: getTeamTotalKills(entry),
    totalBounties: getTeamTotalBounties(entry),
    bestRoundId: entry.bestRound.roundId,
  }))
}
