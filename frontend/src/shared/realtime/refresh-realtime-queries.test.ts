import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { refreshRealtimeQueries } from './refresh-realtime-queries.ts'

it('merges a burst without cancelling HTTP and refreshes again after the last event', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  const responses: Array<(value: number) => void> = []
  const queryFn = vi.fn(() => new Promise<number>((resolve) => responses.push(resolve)))
  const queryKey = ['history', 'game']
  client.setQueryData(queryKey, 0)
  const observer = new QueryObserver(client, { queryKey, queryFn })
  const unsubscribe = observer.subscribe(() => {})
  const first = refreshRealtimeQueries(client, ['history'])
  for (let i = 0; i < 10; i += 1) void refreshRealtimeQueries(client, ['history'])
  await vi.waitFor(() => expect(queryFn).toHaveBeenCalledOnce())
  for (let i = 0; i < 10; i += 1) void refreshRealtimeQueries(client, ['history'])
  expect(queryFn).toHaveBeenCalledOnce()
  responses[0]!(1)
  await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2))
  responses[1]!(2)
  await first
  expect(client.getQueryData(queryKey)).toBe(2)
  expect(queryFn).toHaveBeenCalledTimes(2)
  unsubscribe()
  client.clear()
})

it('retains cached data on failure and allows the next event to recover', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  const queryKey = ['modifiers']
  const queryFn = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(2)
  client.setQueryData(queryKey, 1)
  const observer = new QueryObserver(client, { queryKey, queryFn })
  const unsubscribe = observer.subscribe(() => {})
  await refreshRealtimeQueries(client, queryKey)
  expect(client.getQueryData(queryKey)).toBe(1)
  await refreshRealtimeQueries(client, queryKey)
  expect(client.getQueryData(queryKey)).toBe(2)
  unsubscribe()
  client.clear()
})

it('invalidates inactive entries without fetching and isolates client sessions', async () => {
  const first = new QueryClient()
  const second = new QueryClient()
  const queryKey = ['quiz']
  first.setQueryData(queryKey, 1)
  second.setQueryData(queryKey, 2)
  await refreshRealtimeQueries(first, queryKey)
  expect(first.getQueryState(queryKey)?.isInvalidated).toBe(true)
  expect(second.getQueryState(queryKey)?.isInvalidated).toBe(false)
  first.clear()
  second.clear()
})
