import { queryOptions } from '@tanstack/react-query'
import { loadGameSetupDraftQueryState } from '../model/game-setup-query-state.ts'

const gameSetupQueryKeys = {
  all: ['gameSetup'] as const,
  draftSnapshot: () => [...gameSetupQueryKeys.all, 'draftSnapshot'] as const,
}

export const gameSetupDraftQueryOptions = queryOptions({
  queryKey: gameSetupQueryKeys.draftSnapshot(),
  queryFn: loadGameSetupDraftQueryState,
})
