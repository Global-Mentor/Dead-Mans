import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/query-keys.ts'
import { fetchGameRegistrationSnapshot, useGameRegistrationMutations } from '../game-registration/index.ts'

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
