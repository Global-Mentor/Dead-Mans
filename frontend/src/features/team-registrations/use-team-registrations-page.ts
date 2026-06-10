import { useQuery } from '@tanstack/react-query'
import {
  gameRegistrationAdminTeamsQueryOptions,
  useConfirmGameRegistrationTeamMutation,
  useGameRegistrationToast,
  useRejectGameRegistrationTeamMutation,
} from '../game-registration/index.ts'

export function useTeamRegistrationsPage() {
  const { toastMessage, onMutationError, dismissToast } = useGameRegistrationToast()
  const confirmTeam = useConfirmGameRegistrationTeamMutation(onMutationError)
  const rejectTeam = useRejectGameRegistrationTeamMutation(onMutationError)
  const teamsQuery = useQuery(gameRegistrationAdminTeamsQueryOptions)

  return { teamsQuery, confirmTeam, rejectTeam, toastMessage, dismissToast }
}
