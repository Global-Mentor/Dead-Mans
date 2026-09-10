import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { teamRegistrationsRoute } from '../../routes/app-routes.ts'
import {
  currentGameBoardQueryOptions,
  currentGameTeamQueueQueryOptions,
} from '../game-board/index.ts'
import {
  gameRegistrationAdminSnapshotQueryOptions,
  gameRegistrationSnapshotQueryOptions,
} from '../game-registration/index.ts'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import { openDraftGameRegistration } from './api/game-setup-api.ts'
import { gameSetupDraftQueryOptions } from './api/game-setup-queries.ts'

export function useOpenGameRegistration(onBusyChange: (busy: boolean) => void) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const currentGame = useQuery(currentGameBoardQueryOptions)
  const mutation = useMutation({
    mutationFn: openDraftGameRegistration,
    onMutate: () => onBusyChange(true),
    onSuccess: async () => {
      navigate(teamRegistrationsRoute.fullPath)
      await Promise.all(
        [
          gameSetupDraftQueryOptions,
          currentGameBoardQueryOptions,
          currentGameTeamQueueQueryOptions,
          gameRegistrationSnapshotQueryOptions,
          gameRegistrationAdminSnapshotQueryOptions,
        ].map(({ queryKey }) => queryClient.invalidateQueries({ queryKey })),
      )
    },
    onSettled: () => onBusyChange(false),
  })

  return {
    currentGame,
    isOpening: mutation.isPending,
    openRegistration: mutation.mutate,
    errorKey: mutation.error ? getPublicationErrorKey(mutation.error) : null,
  }
}

function getPublicationErrorKey(error: Error) {
  if (error instanceof ApiError) {
    const details = error.details
    const code = details && typeof details === 'object' && 'code' in details ? details.code : null
    if (code === API_ERROR_CODES.gameSetupStaleVersion) return 'stale' as const
    if (code === API_ERROR_CODES.gameLifecycleCurrentAlreadyExists) return 'currentGame' as const
    if (code === API_ERROR_CODES.gameLifecycleInvalidTeamSizeLimits) return 'teamSize' as const
    if (code === API_ERROR_CODES.gameLifecycleRegistrationSlotsRequired) return 'slots' as const
    if (code === API_ERROR_CODES.gameModifierVersionBindingMissing) return 'modifiers' as const
    if (error.status === 404) return 'missingDraft' as const
    if (error.status === 401 || error.status === 403) return 'forbidden' as const
  }
  return 'failed' as const
}
