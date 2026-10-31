import type { HubConnection } from '@microsoft/signalr'
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useSignalrHubSubscription } from '../shared/realtime/use-signalr-hub-subscription.ts'
import { GameBoardQuizRealtimeSync } from '../features/game-board/realtime/GameBoardQuizRealtimeSync.tsx'
import { GameLifecycleRealtimeSync } from './GameLifecycleRealtimeSync.tsx'
import { gameModifierQueryKeys } from '../features/game-modifiers/api/game-modifier-queries.ts'
import type { GameBoardSnapshot } from '../shared/api/contracts/index.ts'

vi.mock('../shared/realtime/use-signalr-hub-subscription.ts', () => ({
  useSignalrHubSubscription: vi.fn(),
}))
vi.mock('../features/game-board/api/game-board-data-access.ts', async (original) => ({
  ...(await original<typeof import('../features/game-board/api/game-board-data-access.ts')>()),
  fetchCurrentGameBoardSnapshot: vi.fn(
    async () =>
      ({
        gameId: 'game-1',
        title: 'Active game',
        description: null,
        status: 'active',
        version: 2,
        rows: 1,
        cols: 1,
        rowLabels: ['1'],
        colLabels: ['A'],
        cells: [],
        enabledModifierIds: [],
        activeModifiers: [],
      }) satisfies GameBoardSnapshot,
  ),
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it.each([
  'reconnect',
  'cellOpened',
  'roundStateChanged',
  'modifierActivated',
  'modifierActivationCancelled',
  'modifierAvailabilityChanged',
  'gameLifecycleChanged',
  'quizStateChanged',
  'teamStateChanged',
])(
  'keeps history and relevant modifiers fresh through the global %s subscription',
  async (event) => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    const keys = [
      ['gameHistory', 'games'],
      ['gameHistory', 'games', 'game-1'],
      ['gameHistory', 'users', 'user-1'],
      gameModifierQueryKeys.state(),
    ]
    const queryFn = vi.fn().mockResolvedValue(1)
    const observers = keys.map((queryKey) => {
      client.setQueryData(queryKey, 0)
      return new QueryObserver(client, { queryKey, queryFn })
    })
    const unsubscribes = observers.map((observer) => observer.subscribe(() => {}))
    render(
      <QueryClientProvider client={client}>
        <GameLifecycleRealtimeSync />
        <GameBoardQuizRealtimeSync />
      </QueryClientProvider>,
    )
    const handlers = new Map<string, Array<(payload: unknown) => void>>()
    const on = vi.fn((name: string, handler: (payload: unknown) => void) => {
      handlers.set(name, [...(handlers.get(name) ?? []), handler])
    })
    const off = vi.fn()
    const subscriptions = vi.mocked(useSignalrHubSubscription).mock.calls.map(([value]) => value)
    const unregister = subscriptions.map((subscription) =>
      subscription.registerEventHandlers({ on, off } as unknown as HubConnection),
    )
    await act(async () => {
      if (event === 'reconnect')
        await Promise.all(subscriptions.map((value) => value.onConnected()))
      else
        for (const handler of handlers.get(event) ?? [])
          handler({ gameId: 'game-1', version: 2, cell: { id: 'cell-1' } })
    })
    for (const queryKey of keys.slice(0, 3)) expect(client.getQueryData(queryKey)).toBe(1)
    expect(client.getQueryData(keys[3]!)).toBe(event === 'teamStateChanged' ? 0 : 1)
    queryFn.mockResolvedValue(2)
    await act(async () => {
      await Promise.all(subscriptions.map((value) => value.onConnected()))
    })
    for (const queryKey of keys) expect(client.getQueryData(queryKey)).toBe(2)
    unregister.forEach((stop) => stop())
    expect(off.mock.calls).toEqual(on.mock.calls)
    unsubscribes.forEach((stop) => stop())
    client.clear()
  },
)
