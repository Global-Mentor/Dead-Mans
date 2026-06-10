import { useMutation } from '@tanstack/react-query'
import {
  acceptGameRegistrationInvitation,
  confirmGameRegistrationTeam,
  createGameRegistrationTeam,
  declineGameRegistrationInvitation,
  joinGameRegistrationTeam,
  leaveGameRegistrationTeam,
  rejectGameRegistrationTeam,
} from './game-registration-api.ts'
import { useInvalidateGameRegistration } from './use-invalidate-game-registration.ts'
import { useGameRegistrationToast } from './use-game-registration-toast.ts'

export function useGameRegistrationMutations() {
  const invalidate = useInvalidateGameRegistration()
  const { toastMessage, onMutationError, dismissToast } = useGameRegistrationToast()
  const mutationHandlers = { onSuccess: invalidate, onError: onMutationError }

  const createTeam = useMutation({
    mutationFn: createGameRegistrationTeam,
    ...mutationHandlers,
  })

  const joinTeam = useMutation({
    mutationFn: joinGameRegistrationTeam,
    ...mutationHandlers,
  })

  const leaveTeam = useMutation({
    mutationFn: leaveGameRegistrationTeam,
    ...mutationHandlers,
  })

  const acceptInvitation = useMutation({
    mutationFn: acceptGameRegistrationInvitation,
    ...mutationHandlers,
  })

  const declineInvitation = useMutation({
    mutationFn: declineGameRegistrationInvitation,
    ...mutationHandlers,
  })

  const confirmTeam = useMutation({
    mutationFn: confirmGameRegistrationTeam,
    ...mutationHandlers,
  })

  const rejectTeam = useMutation({
    mutationFn: rejectGameRegistrationTeam,
    ...mutationHandlers,
  })

  return {
    createTeam,
    joinTeam,
    leaveTeam,
    acceptInvitation,
    declineInvitation,
    confirmTeam,
    rejectTeam,
    toastMessage,
    dismissToast,
  }
}
