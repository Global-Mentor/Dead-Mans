import { useMutation, useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/query-keys.ts'
import { fetchGameRegistrationAdminTeams } from '../game-registration/api/game-registration-data-access.ts'
import { gameRegistrationApi } from '../game-registration/api/game-registration-api.ts'
import { useInvalidateGameRegistration } from '../game-registration/api/use-invalidate-game-registration.ts'
import { useGameRegistrationToast } from '../game-registration/api/use-game-registration-toast.ts'

export function useTeamRegistrationsPage() {
  const invalidate = useInvalidateGameRegistration()
  const { toastMessage, onMutationError, dismissToast } = useGameRegistrationToast()
  const teamsQuery = useQuery({
    queryKey: queryKeys.gameRegistration.adminTeams(),
    queryFn: fetchGameRegistrationAdminTeams,
  })

  const mutationHandlers = { onSuccess: invalidate, onError: onMutationError }

  const confirmTeam = useMutation({
    mutationFn: (teamId: string) => gameRegistrationApi.confirmTeam(teamId),
    ...mutationHandlers,
  })

  const rejectTeam = useMutation({
    mutationFn: (teamId: string) => gameRegistrationApi.rejectTeam(teamId),
    ...mutationHandlers,
  })

  return { teamsQuery, confirmTeam, rejectTeam, toastMessage, dismissToast }
}
