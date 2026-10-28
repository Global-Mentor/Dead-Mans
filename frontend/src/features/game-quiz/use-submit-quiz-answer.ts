import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CurrentGameQuizState } from '../../shared/api/contracts/index.ts'
import { gameHistoryQueryKeys } from '../game-history/index.ts'
import { gameModifierQueryKeys } from '../game-modifiers/index.ts'
import { refreshRealtimeQueries } from '../../shared/realtime/refresh-realtime-queries.ts'
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
    onSuccess: (receipt) => {
      queryClient.setQueryData<CurrentGameQuizState | null>(
        gameQuizQueryKeys.current(gameId),
        (state) =>
          state?.gameId === gameId && state.questionSessionId === receipt.questionSessionId
            ? { ...state, mySelectedOptionId: receipt.selectedOptionId }
            : state,
      )
    },
    onSettled: async () => {
      await Promise.all([
        refreshRealtimeQueries(queryClient, gameQuizQueryKeys.all),
        refreshRealtimeQueries(queryClient, gameHistoryQueryKeys.all),
        refreshRealtimeQueries(queryClient, gameModifierQueryKeys.runtime()),
      ])
    },
  })
  return { ...mutation, isPending: pendingCount > 0 }
}
