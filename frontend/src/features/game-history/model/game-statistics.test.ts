import { describe, expect, it } from 'vitest'
import type { components } from '../../../shared/api/contracts/generated'
import { buildGameStatistics } from './game-statistics.ts'

type Game = components['schemas']['GameHistoryGameDetailsDto']
type Round = components['schemas']['GameHistoryRoundItemDto']

function round(status: Round['status'], score: number, penalty = 0): Round {
  return {
    roundId: `${status}-${score}`,
    teamId: 'team',
    teamSlotIndex: 1,
    status,
    roundVersion: 1,
    startedAtUtc: '2026-10-01T10:00:00Z',
    finishedAtUtc: '2026-10-01T10:10:00Z',
    baseScore: 999,
    finalScore: 999,
    emptyCardPenaltyApplied: false,
    scoreDetails: {
      scoreUnit: 100,
      killsScore: 100,
      bountyScore: 50,
      modifierKillDelta: 1,
      modifierKillScore: 25,
      modifierScoreDelta: -10,
      emptyCardPenaltyApplied: false,
      emptyCardPenaltyScore: 0,
      penaltyTotal: penalty,
      bonusDelta: 15,
      totalKillCount: 2,
      finalScore: score,
      calculationLines: [],
    },
    killsCount: 1,
    bountyCount: 1,
    cellId: 'cell',
    cellRowIndex: 0,
    cellColIndex: 0,
    cellType: 'regular',
    cellCost: 100,
    purchasesRefunded: false,
    cellMedia: [],
    modifiers: [],
    participants: [
      { userId: 'player', displayName: 'Player', createdAtUtc: '2026-10-01T10:00:00Z' },
    ],
  }
}

function game(rounds: Round[] = []): Game {
  return {
    gameId: 'game',
    gameTitle: 'Game',
    gameStatus: 'active',
    createdAtUtc: '2026-10-01T10:00:00Z',
    mainGame: { rounds, teamStats: [], playerStats: [], modifierActivations: [] },
    quiz: { totalPoints: 0, playerStats: [], questionSessions: [], manualAwards: [] },
    modifierSnapshotStatus: 'complete',
    modifierSnapshots: [],
  }
}

describe('game statistics', () => {
  it('uses completed recorded outcomes and actual kills without modifier bonuses', () => {
    const data = game([
      round('completed', 50, 25),
      round('completed', -100, 100),
      round('completed', 0),
      round('cancelled', 9000),
      round('in_progress', 8000),
    ])
    const stats = buildGameStatistics(data)
    expect(stats.overview).toEqual({
      teams: 1,
      participants: 1,
      rounds: 3,
      cancelled: 1,
      kills: 3,
      bounties: 3,
    })
    expect(stats.results).toEqual({ positive: 1, negative: 1, points: -50, penalties: 125 })
    expect(stats.records.score?.value).toBe(50)
    expect(stats.records.kills?.value).toBe(1)
  })

  it('keeps accuracy and records unavailable when there are no completed results', () => {
    const stats = buildGameStatistics(game([round('in_progress', 50)]))
    expect(stats.quiz.accuracy).toBeNull()
    expect(stats.records).toEqual({ score: null, kills: null, bounties: null })
    expect(stats.overview.rounds).toBe(0)
  })

  it('does not assign a kill or bounty record to a team with zero actual results', () => {
    const stats = buildGameStatistics(
      game([{ ...round('completed', -100), killsCount: 0, bountyCount: 0 }]),
    )
    expect(stats.records.score?.value).toBe(-100)
    expect(stats.records.kills).toBeNull()
    expect(stats.records.bounties).toBeNull()
  })

  it('counts all asked quiz questions and uses recorded earnings including adjustments', () => {
    const data = game()
    const player = {
      userId: 'one',
      displayName: 'One',
      points: 20,
      spentPoints: 5,
      availablePoints: 15,
      attempts: 4,
      correctAnswers: 3,
    }
    data.quiz.playerStats = [player, { ...player, userId: 'two', displayName: 'Two' }]
    data.quiz.totalPoints = 40
    const question = {
      questionSessionId: 'closed',
      questionId: 'question',
      questionCode: 'Q',
      questionText: 'Question',
      categoryName: 'Category',
      reward: 10,
      askedAtUtc: '2026-10-01T10:00:00Z',
      options: [],
      submissions: [],
      status: 'closed' as const,
    }
    data.quiz.questionSessions = [
      question,
      { ...question, questionSessionId: 'skipped', status: 'skipped' },
    ]
    data.quiz.manualAwards = [
      {
        awardId: 'deduction',
        awardedToUserId: 'one',
        awardedToDisplayName: 'One',
        awardedByUserId: 'admin',
        awardedByDisplayName: 'Admin',
        awardedPoints: 5,
        operationType: 'deduct',
        awardedAtUtc: '2026-10-01T10:00:00Z',
      },
    ]
    expect(buildGameStatistics(data).quiz).toEqual({
      players: 2,
      questions: 2,
      correct: 6,
      incorrect: 2,
      accuracy: 75,
      earned: 40,
    })
    expect(buildGameStatistics(data, 'current').quiz.questions).toBe(3)
    expect(buildGameStatistics(data, 'closed').quiz.questions).toBe(2)
  })
})

it('separates gross modifier bonuses and penalties and counts completed rounds with any modifier once', () => {
  const modifier = (scoreDelta: number, killDelta: number): Round['modifiers'][number] => ({
    modifierResultId: 'result',
    modifierId: 'modifier',
    modifierName: 'Modifier',
    modifierDescription: '',
    modifierCategory: 'round',
    outcomeStatus: 'completed',
    scoreDelta,
    killDelta,
  })
  const effects = [modifier(15, -1), modifier(-5, 2)]
  const data = game([
    { ...round('completed', 50), modifiers: effects },
    { ...round('completed', 100), modifiers: [modifier(10, 0)] },
    round('completed', 0),
    { ...round('in_progress', 9000), modifiers: effects },
    { ...round('cancelled', 8000), modifiers: effects },
  ])
  const activation = {
    activationId: 'one',
    modifierId: 'modifier',
    modifierName: 'Modifier',
    activatedByUserId: 'one',
    activatedByDisplayName: 'One',
    activatedAtUtc: '2026-10-01T10:00:00Z',
    refundAmount: 0,
    status: 'consumed' as const,
  }
  data.mainGame.modifierActivations = [
    activation,
    { ...activation, activationId: 'two', status: 'cancelled', refundAmount: 5 },
  ]
  expect(buildGameStatistics(data).modifiers).toEqual({
    activations: 1,
    cancelled: 1,
    rounds: 2,
    unmodifiedRounds: 1,
    bonus: 225,
    penalty: -105,
  })
})
