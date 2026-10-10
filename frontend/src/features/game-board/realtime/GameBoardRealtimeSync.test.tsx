import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameBoardRealtimeSync } from './GameBoardRealtimeSync.tsx'
import type { GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'

const snapshot: GameBoardSnapshot = {
  gameId: 'old-game',
  title: 'Old game',
  description: null,
  status: 'active',
  version: 8,
  rows: 1,
  cols: 1,
  rowLabels: ['1'],
  colLabels: ['A'],
  cells: [],
  enabledModifierIds: [],
  activeModifiers: [],
}
const snapshotKey = ['gameBoard', 'currentSnapshot']

function deferredSnapshot() {
  let resolve!: (value: GameBoardSnapshot | null) => void
  const promise = new Promise<GameBoardSnapshot | null>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

function renderSync() {
  const client = new QueryClient()
  client.setQueryData(snapshotKey, snapshot)
  const view = render(
    <QueryClientProvider client={client}>
      <GameBoardRealtimeSync />
    </QueryClientProvider>,
  )
  const reconnect: () => Promise<void> =
    mocks.useSignalrHubSubscription.mock.calls[0]![0].onConnected
  return { client, reconnect, ...view }
}

const mocks = vi.hoisted(() => ({
  useSignalrHubSubscription: vi.fn(),
  fetchSnapshot: vi.fn(),
}))

vi.mock('../../../shared/realtime/index.ts', () => ({
  realtimeHubs: {
    gameBoard: {
      events: {
        cellOpened: 'cellOpened',
        roundStateChanged: 'roundStateChanged',
        modifierActivated: 'modifierActivated',
        modifierActivationCancelled: 'modifierActivationCancelled',
        gameLifecycleChanged: 'gameLifecycleChanged',
        modifierAvailabilityChanged: 'modifierAvailabilityChanged',
      },
    },
  },
  useSignalrHubSubscription: mocks.useSignalrHubSubscription,
}))

vi.mock('../api/game-board-data-access.ts', () => ({
  fetchCurrentGameBoardSnapshot: mocks.fetchSnapshot,
  fetchCurrentGameTeamQueue: vi.fn(),
}))

describe('GameBoardRealtimeSync', () => {
  afterEach(() => vi.clearAllMocks())

  it('replaces the old game with a lower-version game after reconnect', async () => {
    const incoming = { ...snapshot, gameId: 'new-game', version: 1 }
    mocks.fetchSnapshot.mockResolvedValueOnce(incoming)
    const { client, reconnect } = renderSync()
    await act(reconnect)
    expect(client.getQueryData(snapshotKey)).toEqual(incoming)
  })

  it.each([1, 8, 9])('reconciles version %i only within the same game', async (version) => {
    const incoming = { ...snapshot, version }
    mocks.fetchSnapshot.mockResolvedValueOnce(incoming)
    const { client, reconnect } = renderSync()
    await act(reconnect)
    expect(client.getQueryData(snapshotKey)).toEqual(version > 8 ? incoming : snapshot)
  })

  it.each([null, { ...snapshot, gameId: 'new-game', version: 1 }])(
    'does not restore the old game after its cache identity changes',
    async (current) => {
      const response = deferredSnapshot()
      mocks.fetchSnapshot.mockReturnValueOnce(response.promise)
      const { client, reconnect } = renderSync()
      await act(async () => {
        const request = reconnect()
        client.setQueryData(snapshotKey, current)
        response.resolve({ ...snapshot, version: 9 })
        await request
      })
      expect(client.getQueryData(snapshotKey)).toEqual(current)
    },
  )

  it('ignores an earlier resync that completes after the latest resync', async () => {
    const slow = deferredSnapshot()
    const fast = deferredSnapshot()
    mocks.fetchSnapshot.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)
    const { client, reconnect } = renderSync()
    const incoming = { ...snapshot, gameId: 'new-game', version: 1 }
    await act(async () => {
      const earlier = reconnect()
      const later = reconnect()
      fast.resolve(incoming)
      await later
      slow.resolve({ ...snapshot, version: 9 })
      await earlier
    })
    expect(client.getQueryData(snapshotKey)).toEqual(incoming)
  })

  it('does not apply an in-flight resync after unmount', async () => {
    const response = deferredSnapshot()
    mocks.fetchSnapshot.mockReturnValueOnce(response.promise)
    const { client, reconnect, unmount } = renderSync()
    const request = reconnect()
    unmount()
    response.resolve({ ...snapshot, gameId: 'new-game', version: 1 })
    await request
    expect(client.getQueryData(snapshotKey)).toEqual(snapshot)
  })

  it('preserves a newer same-game event applied while a resync is pending', async () => {
    const response = deferredSnapshot()
    mocks.fetchSnapshot.mockReturnValueOnce(response.promise)
    const { client, reconnect } = renderSync()
    const updated = { ...snapshot, version: 10 }
    await act(async () => {
      const request = reconnect()
      client.setQueryData(snapshotKey, updated)
      response.resolve({ ...snapshot, version: 9 })
      await request
    })
    expect(client.getQueryData(snapshotKey)).toEqual(updated)
  })

  it('refreshes the round and modifiers when the connection is restored', async () => {
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined)
    mocks.fetchSnapshot.mockResolvedValue(null)
    render(
      <QueryClientProvider client={queryClient}>
        <GameBoardRealtimeSync />
      </QueryClientProvider>,
    )

    await act(async () => {
      await mocks.useSignalrHubSubscription.mock.calls[0]?.[0].onConnected()
    })

    expect(mocks.fetchSnapshot).toHaveBeenCalledOnce()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['gameRounds', 'active'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['gameModifiers'] })
  })

  it('resynchronizes the board after another client opens a card', async () => {
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined)
    render(
      <QueryClientProvider client={queryClient}>
        <GameBoardRealtimeSync />
      </QueryClientProvider>,
    )
    const options = mocks.useSignalrHubSubscription.mock.calls[0]?.[0]
    const handlers = new Map<string, (event: unknown) => void>()
    options.registerEventHandlers({
      on: vi.fn((name: string, handler: (event: unknown) => void) => handlers.set(name, handler)),
      off: vi.fn(),
    })

    act(() => {
      handlers.get('cellOpened')?.({ gameId: 'game-1', version: 2, cell: { id: 'cell-1' } })
    })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['gameBoard', 'currentSnapshot'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['gameRounds', 'active'] })
  })

  it('refreshes board-specific completion views without repeating the shared lifecycle invalidation', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined)
    render(
      <QueryClientProvider client={queryClient}>
        <GameBoardRealtimeSync />
      </QueryClientProvider>,
    )
    const options = mocks.useSignalrHubSubscription.mock.calls[0]?.[0]
    const handlers = new Map<string, (event: unknown) => void>()
    const connection = {
      on: vi.fn((name: string, handler: (event: unknown) => void) => handlers.set(name, handler)),
      off: vi.fn(),
    }
    const unregister = options.registerEventHandlers(connection)

    await act(async () => {
      handlers.get('gameLifecycleChanged')?.({
        gameId: 'game-1',
        status: 'finished',
        boardVersion: 8,
        occurredAtUtc: '2026-09-06T00:00:00Z',
      })
      await Promise.resolve()
    })

    for (const queryKey of [
      ['gameRounds', 'active'],
      ['gameHistory'],
      ['gameModifiers'],
      ['gameFinish'],
    ]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey })
    }
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['gameBoard', 'currentSnapshot'] })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['gameRegistration'] })

    unregister()
    expect(connection.off).toHaveBeenCalledWith('gameLifecycleChanged', expect.any(Function))
  })
})
