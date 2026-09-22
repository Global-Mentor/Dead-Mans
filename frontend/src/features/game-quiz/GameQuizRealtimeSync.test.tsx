import type { HubConnection } from '@microsoft/signalr'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSignalrHubSubscription } from '../../shared/realtime/use-signalr-hub-subscription.ts'
import { GameQuizRealtimeSync } from './GameQuizRealtimeSync.tsx'
import { gameQuizQueryKeys } from './api/game-quiz-queries.ts'
import { gameHistoryQueryKeys } from '../game-history/api/game-history-queries.ts'

vi.mock('../../shared/realtime/use-signalr-hub-subscription.ts', () => ({
  useSignalrHubSubscription: vi.fn(),
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('quiz realtime reconciliation', () => {
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
      'twitchQuizStateChanged',
      'modifierActivated',
      'modifierActivationCancelled',
      'roundStateChanged',
    ])
    for (const [, handler] of on.mock.calls as [string, () => void][]) {
      invalidate.mockClear()
      handler()
      expect(invalidate).toHaveBeenCalledWith({ queryKey: gameQuizQueryKeys.all })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: gameHistoryQueryKeys.all })
    }
    unsubscribe?.()
    expect(off.mock.calls).toEqual(on.mock.calls)
  })
})
