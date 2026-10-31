import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { refreshGameLifecycle } from './refresh-game-lifecycle.ts'
import { currentGameBoardQueryOptions } from './game-board-queries.ts'

const mocks = vi.hoisted(() => ({ fetchBoard: vi.fn() }))
vi.mock('./game-board-data-access.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./game-board-data-access.ts')>()),
  fetchCurrentGameBoardSnapshot: mocks.fetchBoard,
}))

describe('refreshGameLifecycle', () => {
  it('replaces a request started before completion instead of reusing its stale response', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let resolveOld!: (value: unknown) => void
    mocks.fetchBoard.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve
      }),
    )
    mocks.fetchBoard.mockResolvedValueOnce({ gameId: 'game-1', status: 'finished' })
    const oldRequest = client.fetchQuery(currentGameBoardQueryOptions).catch(() => undefined)
    await refreshGameLifecycle(client)
    resolveOld({ gameId: 'game-1', status: 'active' })
    await oldRequest
    expect(client.getQueryData(currentGameBoardQueryOptions.queryKey)).toEqual({
      gameId: 'game-1',
      status: 'finished',
    })
    client.clear()
    vi.clearAllMocks()
  })

  it.each(['finished', 'ready', 'active', null])(
    'refreshes dependent observers only after HTTP confirms %s',
    async (status) => {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      })
      client.setQueryData(currentGameBoardQueryOptions.queryKey, {
        gameId: 'game-1',
        status: 'active',
      })
      let resolveBoard!: (value: unknown) => void
      mocks.fetchBoard.mockReturnValue(
        new Promise((resolve) => {
          resolveBoard = resolve
        }),
      )
      const registration = vi.fn().mockResolvedValue({})
      const modifiers = vi.fn().mockResolvedValue([])
      const finish = vi.fn().mockResolvedValue({})
      const subscriptions = [
        { queryKey: ['gameRegistration', 'adminSnapshot'], queryFn: registration },
        { queryKey: ['gameModifiers', 'runtime', 'adminActivations'], queryFn: modifiers },
        { queryKey: ['gameFinish', 'preview', 'game-1'], queryFn: finish },
      ].map((options) => {
        client.setQueryData(options.queryKey, {})
        return new QueryObserver(client, options).subscribe(() => {})
      })

      const refreshing = refreshGameLifecycle(client)
      await vi.waitFor(() => expect(mocks.fetchBoard).toHaveBeenCalled())
      expect(registration).not.toHaveBeenCalled()
      expect(modifiers).not.toHaveBeenCalled()
      expect(finish).not.toHaveBeenCalled()
      resolveBoard(status === null ? null : { gameId: 'game-1', status })
      await refreshing

      expect(client.getQueryData(currentGameBoardQueryOptions.queryKey)).toEqual(
        status === null ? null : { gameId: 'game-1', status },
      )
      expect(registration).toHaveBeenCalledTimes(status === 'ready' || status === 'active' ? 1 : 0)
      expect(modifiers).toHaveBeenCalledTimes(status === 'active' ? 1 : 0)
      expect(finish).toHaveBeenCalledTimes(status === 'active' ? 1 : 0)
      subscriptions.forEach((unsubscribe) => unsubscribe())
      client.clear()
      vi.clearAllMocks()
    },
  )
})
