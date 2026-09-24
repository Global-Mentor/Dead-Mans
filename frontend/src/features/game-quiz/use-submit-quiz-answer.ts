import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import { gameHistoryQueryKeys } from '../game-history/api/game-history-queries.ts'
import { gameModifierQueryKeys } from '../game-modifiers/api/game-modifier-queries.ts'
import { submitGameQuizAnswer } from './api/game-quiz-api.ts'
import { gameQuizQueryKeys } from './api/game-quiz-queries.ts'

export function useSubmitQuizAnswer(gameId: string) {
  const queryClient = useQueryClient()
  const mutationKey = [...gameQuizQueryKeys.all, 'answer', gameId]
  const pendingCount = useIsMutating({ mutationKey })
  const mutation = useMutation({
    mutationKey,
    mutationFn: ({
      questionSessionId,
      optionId,
    }: {
      questionSessionId: string
      optionId: string
    }) => submitGameQuizAnswer(questionSessionId, optionId),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: gameQuizQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: gameHistoryQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: gameModifierQueryKeys.all }),
      ])
    },
  })
  return { ...mutation, isPending: pendingCount > 0 }
}
