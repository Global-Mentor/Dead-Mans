import { queryOptions } from '@tanstack/react-query'
import {
  fetchAvailableGameQuizQuestions,
  fetchCurrentGameQuizState,
  fetchTwitchBotStatus,
} from './game-quiz-api.ts'

export const gameQuizQueryKeys = {
  all: ['gameQuiz'] as const,
  current: (gameId: string) => [...gameQuizQueryKeys.all, 'current', gameId] as const,
  availableQuestions: (gameId: string) =>
    [...gameQuizQueryKeys.all, 'availableQuestions', gameId] as const,
  twitchIntegration: () => [...gameQuizQueryKeys.all, 'twitchIntegration'] as const,
}

export const currentGameQuizQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: gameQuizQueryKeys.current(gameId),
    refetchOnWindowFocus: 'always',
    refetchInterval: (query) => {
      const state = query.state.data
      if (state?.status !== 'open') return false
      const serverTime = state.serverNowUtc ? Date.parse(state.serverNowUtc) : NaN
      const serverNow = Number.isFinite(serverTime)
        ? serverTime +
          Math.max(0, performance.now() - (state.receivedAtMonotonicMs ?? performance.now()))
        : Date.now()
      // Schedule a deadline refresh even when no quiz component is mounted. After a failed
      // refresh, keep polling the expired snapshot until the authoritative result arrives.
      return Math.max(1000, Date.parse(state.closesAtUtc) - serverNow)
    },
    queryFn: async () => {
      const state = await fetchCurrentGameQuizState()
      return state?.gameId === gameId ? state : null
    },
  })

export const availableGameQuizQuestionsQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: gameQuizQueryKeys.availableQuestions(gameId),
    queryFn: fetchAvailableGameQuizQuestions,
  })

export const twitchBotStatusQueryOptions = queryOptions({
  queryKey: gameQuizQueryKeys.twitchIntegration(),
  queryFn: fetchTwitchBotStatus,
})
