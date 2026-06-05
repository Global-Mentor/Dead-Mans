import { useMutation } from '@tanstack/react-query'
import { gameRegistrationApi } from './game-registration-api.ts'
import { useInvalidateGameRegistration } from './use-invalidate-game-registration.ts'
import { useGameRegistrationToast } from './use-game-registration-toast.ts'

export function useGameRegistrationMutations() {
  const invalidate = useInvalidateGameRegistration()
  const { toastMessage, onMutationError, dismissToast } = useGameRegistrationToast()
  const mutationHandlers = { onSuccess: invalidate, onError: onMutationError }

  const createTeam = useMutation({
    mutationFn: (recruitmentOpen: boolean) => gameRegistrationApi.createTeam(recruitmentOpen),
    ...mutationHandlers,
  })

  const joinTeam = useMutation({
    mutationFn: (teamId: string) => gameRegistrationApi.joinTeam(teamId),
    ...mutationHandlers,
  })

  const leaveTeam = useMutation({
    mutationFn: () => gameRegistrationApi.leaveTeam(),
    ...mutationHandlers,
  })

  const acceptInvitation = useMutation({
    mutationFn: (invitationId: string) => gameRegistrationApi.acceptInvitation(invitationId),
    ...mutationHandlers,
  })

  const declineInvitation = useMutation({
    mutationFn: (invitationId: string) => gameRegistrationApi.declineInvitation(invitationId),
    ...mutationHandlers,
  })

  const confirmTeam = useMutation({
    mutationFn: (teamId: string) => gameRegistrationApi.confirmTeam(teamId),
    ...mutationHandlers,
  })

  const rejectTeam = useMutation({
    mutationFn: (teamId: string) => gameRegistrationApi.rejectTeam(teamId),
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
