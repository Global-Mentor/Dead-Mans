import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  acceptGameRegistrationInvitationMutationOptions,
  confirmGameRegistrationTeamMutationOptions,
  createGameRegistrationTeamMutationOptions,
  declineGameRegistrationInvitationMutationOptions,
  type GameRegistrationMutationErrorHandler,
  joinGameRegistrationTeamMutationOptions,
  leaveGameRegistrationTeamMutationOptions,
  rejectGameRegistrationTeamMutationOptions,
} from './game-registration-mutation-options.ts'

export function useCreateGameRegistrationTeamMutation(
  onError: GameRegistrationMutationErrorHandler,
) {
  const queryClient = useQueryClient()
  return useMutation(createGameRegistrationTeamMutationOptions(queryClient, onError))
}

export function useJoinGameRegistrationTeamMutation(onError: GameRegistrationMutationErrorHandler) {
  const queryClient = useQueryClient()
  return useMutation(joinGameRegistrationTeamMutationOptions(queryClient, onError))
}

export function useLeaveGameRegistrationTeamMutation(
  onError: GameRegistrationMutationErrorHandler,
) {
  const queryClient = useQueryClient()
  return useMutation(leaveGameRegistrationTeamMutationOptions(queryClient, onError))
}

export function useAcceptGameRegistrationInvitationMutation(
  onError: GameRegistrationMutationErrorHandler,
) {
  const queryClient = useQueryClient()
  return useMutation(acceptGameRegistrationInvitationMutationOptions(queryClient, onError))
}

export function useDeclineGameRegistrationInvitationMutation(
  onError: GameRegistrationMutationErrorHandler,
) {
  const queryClient = useQueryClient()
  return useMutation(declineGameRegistrationInvitationMutationOptions(queryClient, onError))
}

export function useConfirmGameRegistrationTeamMutation(
  onError: GameRegistrationMutationErrorHandler,
) {
  const queryClient = useQueryClient()
  return useMutation(confirmGameRegistrationTeamMutationOptions(queryClient, onError))
}

export function useRejectGameRegistrationTeamMutation(
  onError: GameRegistrationMutationErrorHandler,
) {
  const queryClient = useQueryClient()
  return useMutation(rejectGameRegistrationTeamMutationOptions(queryClient, onError))
}
