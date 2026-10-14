import { useQuery } from '@tanstack/react-query'
import {
  gameRegistrationAdminSnapshotQueryOptions,
  useAssignGameRegistrationPlayerToTeamMutation,
  useCancelGameRegistrationTeamInvitationMutation,
  useConfirmGameRegistrationTeamMutation,
  useUnconfirmGameRegistrationTeamMutation,
  useCreateAdminGameRegistrationInvitationMutation,
  useCreateAdminGameRegistrationTeamMutation,
  useDisbandGameRegistrationTeamMutation,
  useGameRegistrationToast,
  useMoveGameRegistrationTeamToSlotMutation,
  useRejectGameRegistrationTeamMutation,
  useRemoveGameRegistrationPlayerFromTeamMutation,
  useUpdateAdminGameRegistrationTeamNameMutation,
} from '../game-registration/index.ts'
import { currentGameBoardQueryOptions } from '../game-board/index.ts'
import { useGameTeamPlayedState } from '../game-board/use-game-team-played-state.ts'

export function useTeamRegistrationsPage() {
  const { toastMessage, onMutationError, dismissToast } = useGameRegistrationToast()
  const createAdminTeam = useCreateAdminGameRegistrationTeamMutation(onMutationError)
  const createAdminInvitation = useCreateAdminGameRegistrationInvitationMutation(() => {})
  const assignPlayerToTeam = useAssignGameRegistrationPlayerToTeamMutation(() => {})
  const removePlayerFromTeam = useRemoveGameRegistrationPlayerFromTeamMutation(() => {})
  const cancelTeamInvitation = useCancelGameRegistrationTeamInvitationMutation(onMutationError)
  const moveTeamToSlot = useMoveGameRegistrationTeamToSlotMutation(onMutationError)
  const unconfirmTeam = useUnconfirmGameRegistrationTeamMutation(() => {})
  const confirmTeam = useConfirmGameRegistrationTeamMutation(() => {})
  const rejectTeam = useRejectGameRegistrationTeamMutation(() => {})
  const disbandTeam = useDisbandGameRegistrationTeamMutation(() => {})
  const teamPlayedState = useGameTeamPlayedState({ notifications: false })
  const updateTeamName = useUpdateAdminGameRegistrationTeamNameMutation(onMutationError)
  const gameBoardQuery = useQuery(currentGameBoardQueryOptions)
  const isTeamManagementAvailable =
    gameBoardQuery.data?.status === 'ready' || gameBoardQuery.data?.status === 'active'
  const registrationAdminSnapshotQuery = useQuery({
    ...gameRegistrationAdminSnapshotQueryOptions,
    enabled: isTeamManagementAvailable,
  })
  const adminSnapshotQuery = {
    data: isTeamManagementAvailable ? registrationAdminSnapshotQuery.data : null,
    isLoading:
      gameBoardQuery.isLoading ||
      (isTeamManagementAvailable && registrationAdminSnapshotQuery.isLoading),
    isError:
      gameBoardQuery.isError ||
      (isTeamManagementAvailable && registrationAdminSnapshotQuery.isError),
    refetch: async () => {
      const game = await gameBoardQuery.refetch()
      if (game.data?.status === 'ready' || game.data?.status === 'active')
        await registrationAdminSnapshotQuery.refetch()
    },
  }

  return {
    adminSnapshotQuery,
    createAdminTeam,
    createAdminInvitation,
    assignPlayerToTeam,
    removePlayerFromTeam,
    cancelTeamInvitation,
    moveTeamToSlot,
    confirmTeam,
    unconfirmTeam,
    rejectTeam,
    disbandTeam,
    teamPlayedState,
    updateTeamName,
    toastMessage,
    dismissToast,
  }
}
