import { queryOptions } from '@tanstack/react-query'
import { fetchAvailableGameQuizQuestions, fetchCurrentGameQuizState } from './game-quiz-api.ts'

export const gameQuizQueryKeys = {
  all: ['gameQuiz'] as const,
  current: () => [...gameQuizQueryKeys.all, 'current'] as const,
  availableQuestions: () => [...gameQuizQueryKeys.all, 'availableQuestions'] as const,
}

export const currentGameQuizQueryOptions = queryOptions({
  queryKey: gameQuizQueryKeys.current(),
  queryFn: fetchCurrentGameQuizState,
})

export const availableGameQuizQuestionsQueryOptions = queryOptions({
  queryKey: gameQuizQueryKeys.availableQuestions(),
  queryFn: fetchAvailableGameQuizQuestions,
})
