import { useQuery } from '@tanstack/react-query'
import {
  gameRegistrationSnapshotQueryOptions,
  useAcceptGameRegistrationInvitationMutation,
  useCreateGameRegistrationTeamMutation,
  useDeclineGameRegistrationInvitationMutation,
  useGameRegistrationToast,
  useJoinGameRegistrationTeamMutation,
  useLeaveGameRegistrationTeamMutation,
} from '../game-registration/index.ts'

export function useGameApplicationPage() {
  const { toastMessage, onMutationError, dismissToast } = useGameRegistrationToast()
  const createTeam = useCreateGameRegistrationTeamMutation(onMutationError)
  const joinTeam = useJoinGameRegistrationTeamMutation(onMutationError)
  const leaveTeam = useLeaveGameRegistrationTeamMutation(onMutationError)
  const acceptInvitation = useAcceptGameRegistrationInvitationMutation(onMutationError)
  const declineInvitation = useDeclineGameRegistrationInvitationMutation(onMutationError)
  const snapshotQuery = useQuery(gameRegistrationSnapshotQueryOptions)

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
