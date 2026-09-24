import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query'
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameHistoryRealtimeSync } from './GameHistoryRealtimeSync.tsx'
import { gameHistoryQueryKeys } from './api/game-history-queries.ts'

const mocks = vi.hoisted(() => ({ subscribe: vi.fn() }))
vi.mock('../../shared/realtime/index.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../shared/realtime/index.ts')>()),
  useSignalrHubSubscription: mocks.subscribe,
}))

afterEach(() => vi.clearAllMocks())

describe('GameHistoryRealtimeSync', () => {
  it('recovers missed results on reconnect, refreshes on events and unregisters handlers', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const queryKey = gameHistoryQueryKeys.gameDetails('game-1')
    let earnedPoints = 25
    const fetchResults = vi.fn(async () => ({ earnedPoints }))
    const observer = new QueryObserver(client, {
      queryKey,
      queryFn: fetchResults,
      staleTime: Infinity,
    })
    const stopObserving = observer.subscribe(() => {})
    await waitFor(() => expect(client.getQueryData(queryKey)).toEqual({ earnedPoints: 25 }))
    const { unmount } = render(
      <QueryClientProvider client={client}>
        <GameHistoryRealtimeSync />
      </QueryClientProvider>,
    )
    const subscription = mocks.subscribe.mock.calls[0][0]
    const handlers = new Map<string, () => void>()
    const connection = {
      on: (event: string, handler: () => void) => handlers.set(event, handler),
      off: (event: string, handler: () => void) => {
        expect(handlers.get(event)).toBe(handler)
        handlers.delete(event)
      },
    }
    const unregister = subscription.registerEventHandlers(connection)

    // No event was delivered during the disconnect.
    earnedPoints = 40
    await act(async () => subscription.onConnected())
    expect(client.getQueryData(queryKey)).toEqual({ earnedPoints: 40 })

    for (const event of ['quizStateChanged', 'roundStateChanged', 'gameLifecycleChanged']) {
      earnedPoints += 5
      await act(async () => handlers.get(event)!())
      await waitFor(() => expect(client.getQueryData(queryKey)).toEqual({ earnedPoints }))
    }

    // A transient HTTP failure must not prevent subsequent resynchronization.
    fetchResults.mockRejectedValueOnce(new Error('Temporary failure'))
    await act(async () => subscription.onConnected())
    expect(client.getQueryData(queryKey)).toEqual({ earnedPoints })
    earnedPoints = 80
    await act(async () => subscription.onConnected())
    expect(client.getQueryData(queryKey)).toEqual({ earnedPoints: 80 })

    unregister()
    expect(handlers.size).toBe(0)
    unmount()
    stopObserving()
    client.clear()
  })
})
