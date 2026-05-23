import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/query-keys.ts'

export function useInvalidateGameRegistration() {
  const queryClient = useQueryClient()

  return () => queryClient.invalidateQueries({ queryKey: queryKeys.gameRegistration.all })
}
