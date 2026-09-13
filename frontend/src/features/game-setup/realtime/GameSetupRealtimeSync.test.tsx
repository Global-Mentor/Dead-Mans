import type { HubConnection } from '@microsoft/signalr'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { SignalrHubSubscriptionOptions } from '../../../shared/realtime/signalr-connection-manager.ts'
import { gameQuestionCatalogQueryOptions } from '../../game-questions/index.ts'
import { gameSetupDraftQueryOptions } from '../api/game-setup-queries.ts'
import { GameSetupRealtimeSync } from './GameSetupRealtimeSync.tsx'

const mocks = vi.hoisted(() => ({ subscribe: vi.fn(), fetchDraft: vi.fn() }))
vi.mock('../../../shared/realtime/index.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/realtime/index.ts')>()),
  useSignalrHubSubscription: mocks.subscribe,
}))
vi.mock('../api/game-setup-api.ts', () => ({ fetchDraftGameSetupSnapshot: mocks.fetchDraft }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it.each(['event', 'reconnect'])(
  'refreshes the draft and all question filters on %s',
  async (trigger) => {
    const client = new QueryClient()
    const fullCatalogKey = gameQuestionCatalogQueryOptions({
      search: '',
      includeDisabled: false,
    }).queryKey
    const searchCatalogKey = gameQuestionCatalogQueryOptions({
      search: 'Capital',
      includeDisabled: false,
    }).queryKey
    client.setQueryData(fullCatalogKey, [])
    client.setQueryData(searchCatalogKey, [])
    mocks.fetchDraft.mockResolvedValue(null)
    render(
      <QueryClientProvider client={client}>
        <GameSetupRealtimeSync />
      </QueryClientProvider>,
    )
    const subscription: SignalrHubSubscriptionOptions = mocks.subscribe.mock.calls[0][0]
    const connection = { on: vi.fn(), off: vi.fn() }
    const unregister = subscription.registerEventHandlers(connection as unknown as HubConnection)

    await act(async () => {
      if (trigger === 'reconnect') await subscription.onConnected()
      else connection.on.mock.calls[0][1]()
    })

    await waitFor(() =>
      expect(client.getQueryData(gameSetupDraftQueryOptions.queryKey)).toMatchObject({
        snapshot: null,
      }),
    )
    expect(client.getQueryState(fullCatalogKey)?.isInvalidated).toBe(true)
    expect(client.getQueryState(searchCatalogKey)?.isInvalidated).toBe(true)
    expect(mocks.fetchDraft).toHaveBeenCalledOnce()
    expect(connection.on).toHaveBeenCalledWith('draftChanged', expect.any(Function))
    unregister()
    expect(connection.off).toHaveBeenCalledWith('draftChanged', connection.on.mock.calls[0][1])
    client.clear()
  },
)
