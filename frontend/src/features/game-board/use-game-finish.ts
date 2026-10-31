import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { finishGame } from './api/game-finish-api.ts'
import { refreshGameLifecycle } from './api/refresh-game-lifecycle.ts'

export function useGameFinish() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: ({ gameId, ...input }: Parameters<typeof finishGame>[1] & { gameId: string }) =>
      finishGame(gameId, input),
    onSuccess: async () => {
      setToastMessage(t('gameBoard.finishSuccess'))
      await refreshGameLifecycle(queryClient)
    },
  })

  return {
    finishGame: mutation.mutateAsync,
    isFinishing: mutation.isPending,
    error: mutation.error,
    resetError: mutation.reset,
    toastMessage,
    dismissToast: () => setToastMessage(null),
  }
}
