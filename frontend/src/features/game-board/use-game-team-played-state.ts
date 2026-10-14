import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import { gameRegistrationQueryKeys } from '../game-registration/api/game-registration-queries.ts'
import {
  currentGameBoardQueryOptions,
  currentGameTeamQueueQueryOptions,
} from './api/game-board-queries.ts'
import { setGameTeamPlayedState } from './api/game-board-data-access.ts'

function getPlayedStateErrorMessage(
  error: unknown,
  messages: {
    fallback: string
    activeTeam: string
    noOpenedCard: string
    noActiveGame: string
    notFound: string
    notConfirmed: string
  },
) {
  if (
    error instanceof ApiError &&
    error.status === 409 &&
    error.details &&
    typeof error.details === 'object' &&
    'code' in error.details &&
    error.details.code === API_ERROR_CODES.gameBoardTeamPlayedStateActiveTeam
  ) {
    return messages.activeTeam
  }

  if (
    error instanceof ApiError &&
    error.status === 404 &&
    error.details &&
    typeof error.details === 'object' &&
    'code' in error.details &&
    error.details.code === API_ERROR_CODES.gameBoardTeamPlayedStateNoActiveGame
  ) {
    return messages.noActiveGame
  }

  if (
    error instanceof ApiError &&
    error.status === 404 &&
    error.details &&
    typeof error.details === 'object' &&
    'code' in error.details &&
    error.details.code === API_ERROR_CODES.gameBoardTeamPlayedStateNotFound
  ) {
    return messages.notFound
  }

  if (
    error instanceof ApiError &&
    error.status === 409 &&
    error.details &&
    typeof error.details === 'object' &&
    'code' in error.details &&
    error.details.code === API_ERROR_CODES.gameBoardTeamPlayedStateNotConfirmed
  ) {
    return messages.notConfirmed
  }

  if (
    error instanceof ApiError &&
    error.details &&
    typeof error.details === 'object' &&
    'code' in error.details &&
    error.details.code === API_ERROR_CODES.gameBoardTeamPlayedStateNoOpenedCard
  )
    return messages.noOpenedCard

  return messages.fallback
}

export function useGameTeamPlayedState({ notifications = true }: { notifications?: boolean } = {}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const getErrorMessage = (error: unknown) =>
    getPlayedStateErrorMessage(error, {
      fallback: t('gameBoard.teamPlayedUpdateFailed'),
      activeTeam: t('gameBoard.teamPlayedActiveTeam'),
      noOpenedCard: t('gameBoard.teamPlayedNoOpenedCard'),
      noActiveGame: t('gameBoard.teamPlayedNoActiveGame'),
      notFound: t('gameBoard.teamPlayedNotFound'),
      notConfirmed: t('gameBoard.teamPlayedNotConfirmed'),
    })

  const mutation = useMutation({
    mutationFn: (input: { teamId: string; isPlayed: boolean }) =>
      setGameTeamPlayedState(input.teamId, input.isPlayed),
    onSuccess: async (_, variables) => {
      if (notifications)
        setToastMessage(
          variables.isPlayed
            ? t('gameBoard.teamPlayedMarkSuccess')
            : t('gameBoard.teamPlayedResetSuccess'),
        )

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: currentGameBoardQueryOptions.queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: currentGameTeamQueueQueryOptions.queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: gameRegistrationQueryKeys.all,
        }),
      ])
    },
    onError: (error) => {
      if (notifications) setToastMessage(getErrorMessage(error))
    },
  })

  return {
    getErrorMessage,
    isUpdatingPlayedState: mutation.isPending,
    updatingTeamId: mutation.variables?.teamId ?? null,
    setTeamPlayedState: mutation.mutateAsync,
    toastMessage,
    dismissToast: () => setToastMessage(null),
  }
}
