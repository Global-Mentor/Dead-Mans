import { useAuth } from '../../shared/auth/use-auth.ts'
import { useQuery } from '@tanstack/react-query'
import {
  gameRegistrationSnapshotQueryOptions,
  useAcceptGameRegistrationInvitationMutation,
  useCancelPlayerGameRegistrationInvitationMutation,
  useCreatePlayerGameRegistrationInvitationMutation,
  useCreateGameRegistrationTeamMutation,
  useDeclineGameRegistrationInvitationMutation,
  useGameRegistrationToast,
  useJoinGameRegistrationTeamMutation,
  useLeaveGameRegistrationTeamMutation,
  useRequestMyGameRegistrationTeamDisbandMutation,
  useCancelMyGameRegistrationTeamDisbandRequestMutation,
  useUpdateMyGameRegistrationTeamNameMutation,
  useUpdateMyGameRegistrationReadinessMutation,
} from '../game-registration/index.ts'
import { currentGameBoardQueryOptions } from '../game-board/index.ts'

export function useGameApplicationPage() {
  const { user } = useAuth()
  const { toastMessage, onMutationError, dismissToast } = useGameRegistrationToast()
  const createTeam = useCreateGameRegistrationTeamMutation(onMutationError)
  const joinTeam = useJoinGameRegistrationTeamMutation(onMutationError)
  const leaveTeam = useLeaveGameRegistrationTeamMutation(onMutationError)
  const acceptInvitation = useAcceptGameRegistrationInvitationMutation(onMutationError)
  const declineInvitation = useDeclineGameRegistrationInvitationMutation(onMutationError)
  const createPlayerInvitation = useCreatePlayerGameRegistrationInvitationMutation(onMutationError)
  const cancelPlayerInvitation = useCancelPlayerGameRegistrationInvitationMutation(onMutationError)
  const cancelTeamDisbandRequest =
    useCancelMyGameRegistrationTeamDisbandRequestMutation(onMutationError)
  const requestTeamDisband = useRequestMyGameRegistrationTeamDisbandMutation(onMutationError)
  const updateTeamName = useUpdateMyGameRegistrationTeamNameMutation(onMutationError)
  const updateReadiness = useUpdateMyGameRegistrationReadinessMutation(onMutationError)
  const gameBoardQuery = useQuery(currentGameBoardQueryOptions)
  const isRegistrationOpen = gameBoardQuery.data?.status === 'ready'
  const registrationSnapshotQuery = useQuery({
    ...gameRegistrationSnapshotQueryOptions,
    enabled: isRegistrationOpen,
  })
  const snapshotQuery = {
    data: isRegistrationOpen ? registrationSnapshotQuery.data : null,
    isLoading:
      gameBoardQuery.isLoading || (isRegistrationOpen && registrationSnapshotQuery.isLoading),
    isError: gameBoardQuery.isError || (isRegistrationOpen && registrationSnapshotQuery.isError),
    refetch: async () => {
      await gameBoardQuery.refetch()
      if (isRegistrationOpen) await registrationSnapshotQuery.refetch()
    },
  }

  return {
    snapshotQuery,
    createTeam,
    joinTeam,
    leaveTeam,
    acceptInvitation,
    declineInvitation,
    createPlayerInvitation,
    cancelPlayerInvitation,
    requestTeamDisband,
    cancelTeamDisbandRequest,
    canCancelDisbandRequest:
      user != null && snapshotQuery.data?.myTeam?.disbandRequestedByUserId === user.id,
    updateTeamName,
    updateReadiness,
    currentUserId: user?.id,
    toastMessage,
    dismissToast,
  }
}
