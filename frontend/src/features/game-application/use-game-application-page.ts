import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/query-keys.ts'
import { fetchGameRegistrationSnapshot } from '../game-registration/api/game-registration-data-access.ts'
import { useGameRegistrationMutations } from '../game-registration/api/use-game-registration-mutations.ts'

export function useGameApplicationPage() {
  const {
    createTeam,
    joinTeam,
    leaveTeam,
    acceptInvitation,
    declineInvitation,
    toastMessage,
    dismissToast,
  } = useGameRegistrationMutations()
  const snapshotQuery = useQuery({
    queryKey: queryKeys.gameRegistration.snapshot(),
    queryFn: fetchGameRegistrationSnapshot,
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
