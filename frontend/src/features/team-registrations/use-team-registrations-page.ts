import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/query-keys.ts'
import { fetchGameRegistrationAdminTeams, useGameRegistrationMutations } from '../game-registration/index.ts'

export function useTeamRegistrationsPage() {
  const { confirmTeam, rejectTeam, toastMessage, dismissToast } = useGameRegistrationMutations()
  const teamsQuery = useQuery({
    queryKey: queryKeys.gameRegistration.adminTeams(),
    queryFn: fetchGameRegistrationAdminTeams,
  })

  return { teamsQuery, confirmTeam, rejectTeam, toastMessage, dismissToast }
}
