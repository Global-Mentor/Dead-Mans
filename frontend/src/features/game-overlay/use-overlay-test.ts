import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { fetchOverlayTestState, setOverlayTestEnabled } from './api/overlay-api.ts'

export function useOverlayTest() {
  const { user } = useAuth()
  const queryKey = ['overlay-test-state', user?.id] as const
  const client = useQueryClient()
  const state = useQuery(
    queryOptions({
      queryKey,
      queryFn: ({ signal }) => fetchOverlayTestState(signal),
      enabled: Boolean(user),
      refetchInterval: 5000,
    }),
  )
  const change = useMutation({
    mutationFn: setOverlayTestEnabled,
    onMutate: () => client.cancelQueries({ queryKey }),
    onSuccess: (data) => client.setQueryData(queryKey, data),
    onSettled: () => client.invalidateQueries({ queryKey }),
  })
  const reset = async (hasKey: boolean) => {
    await client.cancelQueries({ queryKey })
    client.setQueryData(queryKey, { hasKey, enabled: false })
    change.reset()
  }
  return { state, change, reset }
}
