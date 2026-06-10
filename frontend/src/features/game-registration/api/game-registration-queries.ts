import { queryOptions } from '@tanstack/react-query'
import {
  fetchGameRegistrationAdminTeams,
  fetchGameRegistrationSnapshot,
} from './game-registration-api.ts'

export const gameRegistrationQueryKeys = {
  all: ['gameRegistration'] as const,
  snapshot: () => [...gameRegistrationQueryKeys.all, 'snapshot'] as const,
  adminTeams: () => [...gameRegistrationQueryKeys.all, 'adminTeams'] as const,
}

export const gameRegistrationSnapshotQueryOptions = queryOptions({
  queryKey: gameRegistrationQueryKeys.snapshot(),
  queryFn: fetchGameRegistrationSnapshot,
})

export const gameRegistrationAdminTeamsQueryOptions = queryOptions({
  queryKey: gameRegistrationQueryKeys.adminTeams(),
  queryFn: fetchGameRegistrationAdminTeams,
})
