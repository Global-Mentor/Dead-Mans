import type { HubConnection } from '@microsoft/signalr'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSignalrHubSubscription } from '../../shared/realtime/use-signalr-hub-subscription.ts'
import { GameQuizRealtimeSync } from './GameQuizRealtimeSync.tsx'
import { gameQuizQueryKeys } from './api/game-quiz-queries.ts'
import { gameHistoryQueryKeys } from '../game-history/api/game-history-queries.ts'
import { GameBoardQuizRealtimeSync } from '../game-board/realtime/GameBoardQuizRealtimeSync.tsx'

vi.mock('../../shared/realtime/use-signalr-hub-subscription.ts', () => ({
  useSignalrHubSubscription: vi.fn(),
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('quiz realtime reconciliation', () => {
  it.each(['roundStateChanged', 'modifierActivated', 'modifierActivationCancelled'])(
    'refreshes each shared query only once for %s',
    (eventName) => {
      const client = new QueryClient()
      const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
      render(
        <QueryClientProvider client={client}>
          <GameBoardQuizRealtimeSync />
        </QueryClientProvider>,
      )
      const handlers: Array<() => void> = []
      const connection = {
        on: (event: string, handler: () => void) => {
          if (event === eventName) handlers.push(handler)
        },
        off: vi.fn(),
      } as unknown as HubConnection
      for (const [subscription] of vi.mocked(useSignalrHubSubscription).mock.calls) {
        subscription.registerEventHandlers?.(connection)
      }
      expect(handlers).toHaveLength(2)
      for (const handler of handlers) handler()
      const keys = invalidate.mock.calls.map(([filter]) => JSON.stringify(filter?.queryKey))
      for (const key of [
        gameHistoryQueryKeys.all,
        ['gameBoard', 'currentSnapshot'],
        gameQuizQueryKeys.all,
      ]) {
        expect(keys.filter((value) => value === JSON.stringify(key))).toHaveLength(1)
      }
    },
  )

  it('refreshes authoritative state after reconnect and question events', async () => {
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
    render(
      <QueryClientProvider client={client}>
        <GameQuizRealtimeSync />
      </QueryClientProvider>,
    )
    const subscription = vi.mocked(useSignalrHubSubscription).mock.calls[0]![0]
    await subscription.onConnected?.()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: gameQuizQueryKeys.all })
    invalidate.mockClear()

    const on = vi.fn()
    const off = vi.fn()
    const unsubscribe = subscription.registerEventHandlers?.({
      on,
      off,
    } as unknown as HubConnection)
    expect(on.mock.calls.map(([event]) => event)).toEqual([
      'quizStateChanged',
      'modifierActivated',
      'modifierActivationCancelled',
      'roundStateChanged',
    ])
    for (const [event, handler] of on.mock.calls as [string, () => void][]) {
      invalidate.mockClear()
      handler()
      expect(invalidate).toHaveBeenCalledWith({ queryKey: gameQuizQueryKeys.all })
      if (event === 'quizStateChanged') {
        expect(invalidate).toHaveBeenCalledWith({ queryKey: gameHistoryQueryKeys.all })
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['gameBoard', 'currentSnapshot'] })
      } else {
        expect(invalidate).not.toHaveBeenCalledWith({ queryKey: gameHistoryQueryKeys.all })
        expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['gameBoard', 'currentSnapshot'] })
      }
    }
    unsubscribe?.()
    expect(off.mock.calls).toEqual(on.mock.calls)
  })
})
