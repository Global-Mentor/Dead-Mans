import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameLifecycleRealtimeSync } from './GameLifecycleRealtimeSync.tsx'

const mocks = vi.hoisted(() => ({ subscribe: vi.fn() }))
vi.mock('../shared/realtime/index.ts', () => ({
  realtimeHubs: { gameBoard: { events: { gameLifecycleChanged: 'gameLifecycleChanged' } } },
  useSignalrHubSubscription: mocks.subscribe,
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
describe('GameLifecycleRealtimeSync', () => {
  it('refreshes navigation, drafts and registration outside the board page, including reconnect', async () => {
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined)
    render(
      <QueryClientProvider client={client}>
        <GameLifecycleRealtimeSync />
      </QueryClientProvider>,
    )
    const subscription = mocks.subscribe.mock.calls[0]?.[0]
    let handler!: () => void
    const connection = {
      on: vi.fn((_event, fn) => {
        handler = fn
      }),
      off: vi.fn(),
    }
    const unregister = subscription.registerEventHandlers(connection)
    await act(async () => {
      handler()
    })
    for (const queryKey of [
      ['gameSetup', 'draftSnapshot'],
      ['gameBoard', 'currentSnapshot'],
      ['gameBoard', 'currentTeamQueue'],
      ['gameRegistration', 'snapshot'],
      ['gameRegistration', 'adminSnapshot'],
    ]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey })
    }
    invalidate.mockClear()
    await subscription.onConnected()
    expect(invalidate).toHaveBeenCalledTimes(5)
    unregister()
    expect(connection.off).toHaveBeenCalledWith('gameLifecycleChanged', handler)
  })
})
