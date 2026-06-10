import { mutationOptions, type QueryClient } from '@tanstack/react-query'
import {
  acceptGameRegistrationInvitation,
  confirmGameRegistrationTeam,
  createGameRegistrationTeam,
  declineGameRegistrationInvitation,
  joinGameRegistrationTeam,
  leaveGameRegistrationTeam,
  rejectGameRegistrationTeam,
} from './game-registration-api.ts'
import { gameRegistrationQueryKeys } from './game-registration-queries.ts'

export type GameRegistrationMutationErrorHandler = (error: Error) => void

function registrationMutationHandlers(
  queryClient: QueryClient,
  onError: GameRegistrationMutationErrorHandler,
) {
  return {
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: gameRegistrationQueryKeys.all,
      }),
    onError: (error: Error) => onError(error),
  }
}

export function createGameRegistrationTeamMutationOptions(
  queryClient: QueryClient,
  onError: GameRegistrationMutationErrorHandler,
) {
  return mutationOptions({
    mutationFn: createGameRegistrationTeam,
    ...registrationMutationHandlers(queryClient, onError),
  })
}

export function joinGameRegistrationTeamMutationOptions(
  queryClient: QueryClient,
  onError: GameRegistrationMutationErrorHandler,
) {
  return mutationOptions({
    mutationFn: joinGameRegistrationTeam,
    ...registrationMutationHandlers(queryClient, onError),
  })
}

export function leaveGameRegistrationTeamMutationOptions(
  queryClient: QueryClient,
  onError: GameRegistrationMutationErrorHandler,
) {
  return mutationOptions({
    mutationFn: leaveGameRegistrationTeam,
    ...registrationMutationHandlers(queryClient, onError),
  })
}

export function acceptGameRegistrationInvitationMutationOptions(
  queryClient: QueryClient,
  onError: GameRegistrationMutationErrorHandler,
) {
  return mutationOptions({
    mutationFn: acceptGameRegistrationInvitation,
    ...registrationMutationHandlers(queryClient, onError),
  })
}

export function declineGameRegistrationInvitationMutationOptions(
  queryClient: QueryClient,
  onError: GameRegistrationMutationErrorHandler,
) {
  return mutationOptions({
    mutationFn: declineGameRegistrationInvitation,
    ...registrationMutationHandlers(queryClient, onError),
  })
}

export function confirmGameRegistrationTeamMutationOptions(
  queryClient: QueryClient,
  onError: GameRegistrationMutationErrorHandler,
) {
  return mutationOptions({
    mutationFn: confirmGameRegistrationTeam,
    ...registrationMutationHandlers(queryClient, onError),
  })
}

export function rejectGameRegistrationTeamMutationOptions(
  queryClient: QueryClient,
  onError: GameRegistrationMutationErrorHandler,
) {
  return mutationOptions({
    mutationFn: rejectGameRegistrationTeam,
    ...registrationMutationHandlers(queryClient, onError),
  })
}
