import { mutationOptions, type QueryClient } from '@tanstack/react-query'
import { setGameQuestionCategoryEnabled, setGameQuestionEnabled } from './game-questions-api.ts'
import { gameQuestionQueryKeys } from './game-question-queries.ts'

function invalidateGameQuestions(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: gameQuestionQueryKeys.all })
}

export function setGameQuestionEnabledMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: ({ questionId, isEnabled }: { questionId: string; isEnabled: boolean }) =>
      setGameQuestionEnabled(questionId, isEnabled),
    onSuccess: () => invalidateGameQuestions(queryClient),
  })
}

export function setGameQuestionCategoryEnabledMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: ({
      category,
      isEnabled,
      vectorCode,
    }: {
      category: string
      isEnabled: boolean
      vectorCode?: string
    }) => setGameQuestionCategoryEnabled(category, isEnabled, vectorCode),
    onSuccess: () => invalidateGameQuestions(queryClient),
  })
}
