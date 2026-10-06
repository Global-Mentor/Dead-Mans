import { describe, expect, it } from 'vitest'
import type { components } from '../../../shared/api/contracts/generated'
import { buildLeaderboardResults } from './leaderboard-results.ts'
type Summary = components['schemas']['GameFinishSummaryDto']
const summary: Summary = {
  gameId: 'game',
  gameTitle: 'Archive',
  gameStatus: 'finished',
  boardVersion: 1,
  calculationVersion: 1,
  completedRoundCount: 0,
  cancelledRoundCount: 0,
  totalKills: 0,
  totalBounties: 0,
  quizTotalPoints: 0,
  pendingQuizQuestionCount: 0,
  skippedQuizQuestionCount: 0,
  teams: [
    {
      teamId: 'unplayed',
      teamName: 'No rounds',
      teamSlotIndex: 1,
      participantNames: ['Player'],
      roundsPlayed: 0,
      finalScore: null,
      bestScore: null,
      penaltyTotal: 0,
      totalScore: 0,
      totalBonusDelta: 0,
      totalKills: 0,
      totalBounties: 0,
      placement: null,
    },
    {
      teamId: 'winner',
      teamName: 'Winner',
      teamSlotIndex: 2,
      participantNames: ['Captain'],
      roundsPlayed: 2,
      finalScore: -10,
      bestScore: 20,
      penaltyTotal: 30,
      totalScore: 15,
      totalBonusDelta: 0,
      totalKills: 7,
      totalBounties: 3,
      placement: 1,
    },
  ],
}
describe('saved leaderboard results', () => {
  it('uses saved places and scores, retaining teams without any played rounds', () => {
    const results = buildLeaderboardResults([], summary)
    expect(results.map((team) => team.teamId)).toEqual(['winner', 'unplayed'])
    expect(results[0]).toMatchObject({
      rank: 1,
      finalScore: -10,
      bestScore: 20,
      penaltyTotal: 30,
      totalKills: 7,
      totalBounties: 3,
      participantNames: ['Captain'],
    })
    expect(results[1]).toMatchObject({ rank: null, finalScore: null, bestScore: null, rounds: [] })
  })
  it('retains an empty saved result instead of rebuilding a leaderboard', () => {
    expect(buildLeaderboardResults([], { ...summary, teams: [] })).toEqual([])
  })
})
