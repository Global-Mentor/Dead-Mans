import type { components } from '../../src/shared/api/contracts/generated'
import { screenshotQuestion } from './screenshot-fixture.ts'

export const profileGames: components['schemas']['UserProfileGameDto'][] = Array.from(
  { length: 21 },
  (_, index) => ({
    gameId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    title: index === 0 ? 'Night in the bayou' : `Hunt ${index + 1}`,
    status: index === 1 ? 'active' : 'finished',
    startedAtUtc: '2026-11-01T12:00:00Z',
    finishedAtUtc: index === 1 ? null : '2026-11-01T14:00:00Z',
    completedRoundCount: index === 0 ? 2 : index === 20 ? 5 : 0,
    answerCount: index === 0 ? 1 : 0,
    correctAnswerCount: index === 0 ? 1 : 0,
  }),
)

export const profileQuizGames: components['schemas']['UserProfileGameDto'][] = [
  profileGames[0]!,
  {
    ...profileGames[1]!,
    gameId: '00000000-0000-4000-8000-000000000090',
    title: 'Quiz from the audience',
    completedRoundCount: 0,
    answerCount: 1,
  },
]

export const emptyProfileStatistics: components['schemas']['UserProfileStatisticsDto'] = {
  finishedPlayerGameCount: 0,
  completedRoundCount: 0,
  awardedQuizPoints: 0,
  games: {
    playedGameCount: 0,
    rankedGameCount: 0,
    winCount: 0,
    podiumCount: 0,
    bestPlacement: null,
    teamCount: 0,
    teammateCount: 0,
    totalRoundScore: 0,
    averageRoundScore: 0,
    bestRoundScore: null,
    teamKills: 0,
    teamBounties: 0,
  },
  quiz: {
    answerCount: 0,
    correctAnswerCount: 0,
    incorrectAnswerCount: 0,
    averageAnswerPoints: 0,
    text: { answerCount: 0, correctAnswerCount: 0, points: 0 },
    screenshot: { answerCount: 0, correctAnswerCount: 0, points: 0 },
    longestCorrectStreak: 0,
    maxCorrectAnswersPerGame: 0,
    maxPointsPerGame: 0,
    categories: [],
  },
  points: {
    manualAwarded: 0,
    manualDeducted: 0,
    spent: 0,
    refunded: 0,
    netSpent: 0,
    averagePaidOrderCost: 0,
  },
  modifiers: {
    orderedCount: 0,
    paidCount: 0,
    freeCount: 0,
    appliedCount: 0,
    cancelledCount: 0,
    pendingCount: 0,
    uniqueCount: 0,
    gameCount: 0,
    roundCount: 0,
    mostUsed: null,
    categories: [],
    outcomes: [],
  },
  activity: {
    firstActivityAtUtc: null,
    lastActivityAtUtc: null,
    activeDayCount: 0,
    months: Array.from({ length: 12 }, (_, index) => ({
      month: new Date(Date.UTC(2025, 11 + index, 1)).toISOString().slice(0, 7),
      gameCount: 0,
      roundCount: 0,
      answerCount: 0,
      modifierCount: 0,
    })),
  },
}

export const profileFixture: components['schemas']['UserProfileDto'] = {
  userId: 'c541269c-cb41-4e6c-9004-73d3f0b2ab93',
  login: 'bayou_hunter',
  displayName: 'Bayou Hunter',
  profileImageUrl: 'https://static-cdn.jtvnw.net/profile-test.png',
  playerGameCount: 21,
  quizGameCount: 2,
  answerCount: 2,
  correctAnswerCount: 1,
  statistics: {
    finishedPlayerGameCount: 20,
    completedRoundCount: 7,
    awardedQuizPoints: 7,
    games: {
      playedGameCount: 2,
      rankedGameCount: 2,
      winCount: 1,
      podiumCount: 2,
      bestPlacement: 1,
      teamCount: 2,
      teammateCount: 4,
      totalRoundScore: 71,
      averageRoundScore: 71 / 7,
      bestRoundScore: 19,
      teamKills: 23,
      teamBounties: 9,
    },
    quiz: {
      answerCount: 2,
      correctAnswerCount: 1,
      incorrectAnswerCount: 1,
      averageAnswerPoints: 3.5,
      text: { answerCount: 1, correctAnswerCount: 0, points: 0 },
      screenshot: { answerCount: 1, correctAnswerCount: 1, points: 7 },
      longestCorrectStreak: 1,
      maxCorrectAnswersPerGame: 1,
      maxPointsPerGame: 7,
      categories: [
        { name: 'Locations', answerCount: 1, correctAnswerCount: 1, points: 7 },
        { name: 'World', answerCount: 1, correctAnswerCount: 0, points: 0 },
      ],
    },
    points: {
      manualAwarded: 12,
      manualDeducted: 3,
      spent: 10,
      refunded: 4,
      netSpent: 6,
      averagePaidOrderCost: 2.5,
    },
    modifiers: {
      orderedCount: 5,
      paidCount: 4,
      freeCount: 1,
      appliedCount: 3,
      cancelledCount: 1,
      pendingCount: 1,
      uniqueCount: 3,
      gameCount: 2,
      roundCount: 3,
      mostUsed: { name: 'Sticky bomb', count: 2 },
      categories: [
        { name: 'Offensive', count: 3 },
        { name: 'Support', count: 2 },
      ],
      outcomes: [
        { outcome: 'completed', count: 2 },
        { outcome: 'violated', count: 1 },
      ],
    },
    activity: {
      firstActivityAtUtc: '2026-11-01T12:00:00Z',
      lastActivityAtUtc: '2026-11-05T18:00:00Z',
      activeDayCount: 3,
      months: emptyProfileStatistics.activity.months.map((month) =>
        month.month === '2026-11'
          ? { ...month, gameCount: 21, roundCount: 7, answerCount: 2, modifierCount: 5 }
          : month,
      ),
    },
  },
}

export const profileChartFixture: components['schemas']['UserProfileDto'] = {
  ...profileFixture,
  quizGameCount: 8,
  answerCount: 156000,
  correctAnswerCount: 97000,
  statistics: {
    ...profileFixture.statistics,
    completedRoundCount: 84000,
    awardedQuizPoints: 679000,
    games: {
      ...profileFixture.statistics.games,
      playedGameCount: 14,
      rankedGameCount: 14,
      winCount: 6,
      podiumCount: 9,
      teamCount: 14,
      teammateCount: 32,
      totalRoundScore: 8400000,
      bestRoundScore: 999,
      averageRoundScore: 100,
      teamKills: 100000,
      teamBounties: 10000,
    },
    quiz: {
      answerCount: 156000,
      correctAnswerCount: 97000,
      incorrectAnswerCount: 59000,
      averageAnswerPoints: 679000 / 156000,
      text: { answerCount: 100000, correctAnswerCount: 60000, points: 420000 },
      screenshot: { answerCount: 56000, correctAnswerCount: 37000, points: 259000 },
      longestCorrectStreak: 2000,
      maxCorrectAnswersPerGame: 20000,
      maxPointsPerGame: 140000,
      categories: [
        {
          name: 'A very long location category name for chart wrapping',
          answerCount: 100000,
          correctAnswerCount: 60000,
          points: 420000,
        },
        {
          name: 'Creatures and world events with exceptionally long labels',
          answerCount: 56000,
          correctAnswerCount: 37000,
          points: 259000,
        },
      ],
    },
    points: {
      manualAwarded: 120000,
      manualDeducted: 30000,
      spent: 650000,
      refunded: 40000,
      netSpent: 610000,
      averagePaidOrderCost: 12.5,
    },
    modifiers: {
      orderedCount: 65000,
      paidCount: 52000,
      freeCount: 13000,
      appliedCount: 52000,
      cancelledCount: 6500,
      pendingCount: 6500,
      uniqueCount: 321,
      gameCount: 8,
      roundCount: 12000,
      mostUsed: { name: 'A modifier with a very long name for chart wrapping', count: 13000 },
      categories: [
        { name: 'Offensive', count: 39000 },
        { name: 'Support', count: 26000 },
      ],
      outcomes: [
        { outcome: 'completed', count: 39000 },
        { outcome: 'violated', count: 13000 },
      ],
    },
    activity: {
      firstActivityAtUtc: '2026-01-15T12:00:00Z',
      lastActivityAtUtc: '2026-11-05T18:00:00Z',
      activeDayCount: 120,
      months: emptyProfileStatistics.activity.months.map((month, index) => ({
        ...month,
        gameCount: [0, 1, 1, 1, 2, 1, 2, 2, 2, 3, 3, 4][index]!,
        roundCount: [0, 2, 3, 1, 4, 2, 8, 6, 9, 7, 18, 24][index]! * 1000,
        answerCount: [0, 4, 8, 3, 12, 7, 25, 10, 18, 9, 32, 28][index]! * 1000,
        modifierCount: [0, 1, 4, 0, 2, 5, 7, 3, 6, 8, 12, 17][index]! * 1000,
      })),
    },
  },
}

export const profileAnswers: components['schemas']['UserProfileAnswerDto'][] = [
  {
    questionSessionId: '00000000-0000-4000-8000-000000000101',
    questionId: '00000000-0000-4000-8000-000000000201',
    gameId: profileGames[0]!.gameId,
    gameTitle: profileGames[0]!.title,
    questionText: 'Which location is shown?',
    categoryName: 'Locations',
    selectedOptionId: 'location-0',
    selectedOptionText: 'Винный завод',
    isCorrect: true,
    awardedPoints: 7,
    submittedAtUtc: '2026-11-01T12:01:00Z',
    image: screenshotQuestion.image!,
  },
  {
    questionSessionId: '00000000-0000-4000-8000-000000000102',
    questionId: '00000000-0000-4000-8000-000000000202',
    gameId: profileQuizGames[1]!.gameId,
    gameTitle: profileQuizGames[1]!.title,
    questionText: 'Which creature leaves these traces?',
    categoryName: 'World',
    selectedOptionId: '00000000-0000-4000-8000-000000000302',
    selectedOptionText: 'Spider',
    isCorrect: false,
    awardedPoints: 0,
    submittedAtUtc: '2026-11-01T12:02:00Z',
    image: null,
  },
]

export function profilePage<T>(items: T[], requestUrl: string) {
  const url = new URL(requestUrl)
  const pageSize = Number(url.searchParams.get('pageSize') ?? 20)
  const page = Math.max(
    1,
    Math.min(Number(url.searchParams.get('page') ?? 1), Math.ceil(items.length / pageSize) || 1),
  )
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    totalCount: items.length,
    page,
    pageSize,
  }
}
