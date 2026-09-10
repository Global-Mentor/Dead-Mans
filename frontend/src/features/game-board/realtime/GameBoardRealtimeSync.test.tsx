import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameBoardRealtimeSync } from './GameBoardRealtimeSync.tsx'

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
