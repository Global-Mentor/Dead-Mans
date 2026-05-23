import { useMutation, useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/query-keys.ts'
import { fetchGameRegistrationSnapshot } from '../game-registration/api/game-registration-data-access.ts'
import { gameRegistrationApi } from '../game-registration/api/game-registration-api.ts'
import { useInvalidateGameRegistration } from '../game-registration/api/use-invalidate-game-registration.ts'
import { useGameRegistrationToast } from '../game-registration/api/use-game-registration-toast.ts'

export function useGameApplicationPage() {
  const invalidate = useInvalidateGameRegistration()
  const { toastMessage, onMutationError, dismissToast } = useGameRegistrationToast()
  const snapshotQuery = useQuery({
    queryKey: queryKeys.gameRegistration.snapshot(),
    queryFn: fetchGameRegistrationSnapshot,
  })

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

  return {
    snapshotQuery,
    createTeam,
    joinTeam,
    leaveTeam,
    acceptInvitation,
    declineInvitation,
    toastMessage,
    dismissToast,
  }
}
