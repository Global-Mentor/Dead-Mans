import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/query-keys.ts'
import {
  createDraftGameSetup,
  fetchDraftGameSetupSnapshot,
} from './api/game-setup-data-access.ts'

export function useGameSetupPage() {
  const queryClient = useQueryClient()

  const draftQuery = useQuery({
    queryKey: queryKeys.gameSetup.draftSnapshot(),
    queryFn: fetchDraftGameSetupSnapshot,
  })

  const createDraftMutation = useMutation({
    mutationFn: createDraftGameSetup,
    onSuccess: (snapshot) => {
      queryClient.setQueryData(queryKeys.gameSetup.draftSnapshot(), snapshot)
    },
  })

  return {
    snapshot: draftQuery.data ?? null,
    isLoading: draftQuery.isLoading,
    isError: draftQuery.isError,
    isEmpty: draftQuery.data === null,
    createDraft: createDraftMutation.mutateAsync,
    isCreating: createDraftMutation.isPending,
  }
}
