import { useEffect, useState } from 'react'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { fetchOverlayFrame } from './api/overlay-api.ts'
import { useOverlayRealtime } from './use-overlay-realtime.ts'

export function useOverlayFrame(key: string) {
  const [failures, setFailures] = useState(0)
  const [deniedKey, setDeniedKey] = useState<string | null>(null)
  const validKey = /^[a-f0-9]{64}$/.test(key)
  const connected = useOverlayRealtime(key, validKey && deniedKey !== key)
  const query = useQuery(
    queryOptions({
      queryKey: ['game-overlay', key],
      queryFn: async ({ signal }) => {
        try {
          const frame = await fetchOverlayFrame(key, signal)
          setFailures(0)
          return frame
        } catch (error) {
          if (!signal.aborted) setFailures((value) => value + 1)
          if (error instanceof ApiError && error.status === 401) setDeniedKey(key)
          throw error
        }
      },
      enabled: validKey && deniedKey !== key,
      gcTime: 0,
      staleTime: 0,
      retry: false,
      refetchInterval: (state) =>
        state.state.error instanceof ApiError && state.state.error.status === 401
          ? false
          : state.state.error
            ? Math.min(2000 * 2 ** Math.min(failures, 4), 30000)
            : connected
              ? 10000
              : 2000,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    }),
  )
  const [expiredReceipt, setExpiredReceipt] = useState<number | null>(null)
  useEffect(() => {
    if (!query.data) return
    const receivedAt = query.data.receivedAtMonotonicMs
    const timer = window.setTimeout(
      () => setExpiredReceipt(receivedAt),
      Math.max(0, receivedAt + 15000 - performance.now()),
    )
    return () => window.clearTimeout(timer)
  }, [query.data])
  // Brief outages retain the frame; an old team must not remain on stream indefinitely.
  const expired = !query.data || expiredReceipt === query.data.receivedAtMonotonicMs
  const denied = query.error instanceof ApiError && query.error.status === 401
  return !expired && !denied ? query.data : undefined
}
