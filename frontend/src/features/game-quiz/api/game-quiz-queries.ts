import { queryOptions } from '@tanstack/react-query'
import { fetchAvailableGameQuizQuestions, fetchCurrentGameQuizState } from './game-quiz-api.ts'

export const gameQuizQueryKeys = {
  all: ['gameQuiz'] as const,
  current: (gameId: string) => [...gameQuizQueryKeys.all, 'current', gameId] as const,
  availableQuestions: (gameId: string) =>
    [...gameQuizQueryKeys.all, 'availableQuestions', gameId] as const,
}

export const currentGameQuizQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: gameQuizQueryKeys.current(gameId),
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
