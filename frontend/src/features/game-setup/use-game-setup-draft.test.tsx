import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  GameQuestionCatalogItem,
  GameSetupSnapshot,
} from '../../shared/api/contracts/index.ts'
import { gameQuestionCatalogQueryOptions } from '../game-questions/index.ts'
import { gameSetupDraftQueryOptions } from './api/game-setup-queries.ts'
import { createLoadedDraftState } from './model/game-setup-query-state.ts'
import { useGameSetupDraft } from './use-game-setup-draft.ts'

const apiMocks = vi.hoisted(() => ({
  fetchDraftGameSetupSnapshot: vi.fn(),
  createDraftGameSetup: vi.fn(),
  deleteDraftGameSetup: vi.fn(),
  fetchGameQuestionCatalog: vi.fn(),
}))

vi.mock('./api/game-setup-api.ts', () => apiMocks)
vi.mock('../game-questions/api/game-questions-api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../game-questions/api/game-questions-api.ts')>()),
  fetchGameQuestionCatalog: apiMocks.fetchGameQuestionCatalog,
}))

afterEach(cleanup)

const snapshot: GameSetupSnapshot = {
  gameId: 'game-1',
  title: 'Draft game',
  status: 'draft',
  version: 1,
  rows: 1,
  cols: 1,
  rowLabels: ['100'],
  colLabels: ['A'],
  cells: [
    {
      id: 'cell-1',
      row: 0,
      col: 0,
      cellType: 'question',
      title: 'First cell',
      description: null,
      cost: 100,
      state: 'closed',
      media: [],
    },
  ],
  enabledModifierIds: [],
  enabledQuestionIds: [],
}

function createQueryWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useGameSetupDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.fetchGameQuestionCatalog.mockResolvedValue([])
  })

  it('keeps create and delete lifecycle state inside the draft controller', async () => {
    apiMocks.fetchDraftGameSetupSnapshot.mockResolvedValue(null)
    apiMocks.createDraftGameSetup.mockResolvedValue(snapshot)
    apiMocks.deleteDraftGameSetup.mockResolvedValue(undefined)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const { result } = renderHook(() => useGameSetupDraft(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isEmpty).toBe(true)

    await act(async () => {
      await result.current.createDraft({ title: snapshot.title })
    })

    expect(apiMocks.createDraftGameSetup).toHaveBeenCalledWith(
      { title: snapshot.title },
      expect.anything(),
    )
    await waitFor(() => expect(result.current.snapshot).toEqual(snapshot))
    expect(result.current.draft?.title).toBe(snapshot.title)
    expect(result.current.draftRemovedNotice).toBe(false)

    await act(async () => {
      await result.current.deleteDraft()
    })

    expect(apiMocks.deleteDraftGameSetup).toHaveBeenCalledOnce()
    await waitFor(() => expect(result.current.snapshot).toBeNull())
    expect(result.current.draft).toBeNull()
    expect(result.current.isEmpty).toBe(true)
    expect(result.current.draftRemovedNotice).toBe(false)
  })

  it('preserves local edits and reports a newer remote snapshot', async () => {
    apiMocks.fetchDraftGameSetupSnapshot.mockResolvedValue(snapshot)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const { result } = renderHook(() => useGameSetupDraft(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.snapshot).toEqual(snapshot))

    act(() => {
      result.current.updateDraft((current) => ({ ...current, title: 'Local title' }))
    })

    expect(result.current.isDirty).toBe(true)
    expect(result.current.draft?.title).toBe('Local title')

    const remoteSnapshot = { ...snapshot, title: 'Remote title', version: 2 }
    act(() => {
      queryClient.setQueryData(
        gameSetupDraftQueryOptions.queryKey,
        createLoadedDraftState(remoteSnapshot),
      )
    })

    await waitFor(() => expect(result.current.remoteChangeNotice).toBe(true))
    expect(result.current.draft?.title).toBe('Local title')
    expect(result.current.snapshot).toEqual(remoteSnapshot)
  })

  it.each(['catalog first', 'draft first'])(
    'removes disabled selections without losing local edits or reattaching on enable (%s)',
    async (order) => {
      const selectedSnapshot = { ...snapshot, enabledQuestionIds: ['q1', 'q2'] }
      const catalog = ['q1', 'q2'].map((questionId) => ({
        questionId,
        isEnabled: true,
      })) as GameQuestionCatalogItem[]
      const catalogKey = gameQuestionCatalogQueryOptions({
        search: '',
        includeDisabled: false,
      }).queryKey
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      })
      queryClient.setQueryData(
        gameSetupDraftQueryOptions.queryKey,
        createLoadedDraftState(selectedSnapshot),
      )
      queryClient.setQueryData(catalogKey, catalog)
      const { result } = renderHook(() => useGameSetupDraft(), {
        wrapper: createQueryWrapper(queryClient),
      })

      act(() =>
        result.current.updateDraft((current) => ({
          ...current,
          title: 'Local title',
          cells: current.cells.map((cell) => ({ ...cell, title: 'Local cell' })),
        })),
      )
      const remoteSnapshot = { ...selectedSnapshot, version: 2, enabledQuestionIds: ['q2'] }
      const updates = [
        () => queryClient.setQueryData(catalogKey, [catalog[1]]),
        () =>
          queryClient.setQueryData(
            gameSetupDraftQueryOptions.queryKey,
            createLoadedDraftState(remoteSnapshot),
          ),
      ]
      if (order === 'draft first') updates.reverse()
      for (const update of updates)
        await act(async () => {
          update()
        })

      await waitFor(() => expect(result.current.draft?.enabledQuestionIds).toEqual(['q2']))
      expect(result.current.draft?.title).toBe('Local title')
      expect(result.current.draft?.cells[0].title).toBe('Local cell')
      await waitFor(() => expect(result.current.remoteChangeNotice).toBe(true))

      await act(async () => {
        queryClient.setQueryData(catalogKey, catalog)
      })
      expect(result.current.draft?.enabledQuestionIds).toEqual(['q2'])
      expect(result.current.isDirty).toBe(true)
      queryClient.clear()
    },
  )

  it('preserves selections while the full catalog is unavailable, regardless of search results', async () => {
    apiMocks.fetchGameQuestionCatalog.mockRejectedValue(new Error('offline'))
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    queryClient.setQueryData(
      gameSetupDraftQueryOptions.queryKey,
      createLoadedDraftState({ ...snapshot, enabledQuestionIds: ['q1', 'q2'] }),
    )
    queryClient.setQueryData(
      gameQuestionCatalogQueryOptions({ search: 'First', includeDisabled: false }).queryKey,
      [],
    )
    const { result } = renderHook(() => useGameSetupDraft(), {
      wrapper: createQueryWrapper(queryClient),
    })
    await waitFor(() =>
      expect(apiMocks.fetchGameQuestionCatalog).toHaveBeenCalledWith({
        search: '',
        includeDisabled: false,
      }),
    )
    expect(result.current.draft?.enabledQuestionIds).toEqual(['q1', 'q2'])
    expect(result.current.isDirty).toBe(false)
    queryClient.clear()
  })

  it('does not restore a removed selection if re-enabled before the draft refresh completes', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
    const catalogKey = gameQuestionCatalogQueryOptions({
      search: '',
      includeDisabled: false,
    }).queryKey
    client.setQueryData(
      gameSetupDraftQueryOptions.queryKey,
      createLoadedDraftState({ ...snapshot, enabledQuestionIds: ['q1'] }),
    )
    client.setQueryData(catalogKey, [])
    const { result } = renderHook(() => useGameSetupDraft(), {
      wrapper: createQueryWrapper(client),
    })
    await waitFor(() => expect(result.current.draft?.enabledQuestionIds).toEqual([]))
    await act(async () => {
      client.setQueryData(catalogKey, [{ questionId: 'q1', isEnabled: true }])
    })
    expect(result.current.draft?.enabledQuestionIds).toEqual([])
    client.clear()
  })

  it('waits for a catalog refresh before pruning a newly selected question missing from the old cache', async () => {
    let resolveCatalog!: (questions: GameQuestionCatalogItem[]) => void
    apiMocks.fetchGameQuestionCatalog.mockReturnValue(
      new Promise<GameQuestionCatalogItem[]>((resolve) => {
        resolveCatalog = resolve
      }),
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    apiMocks.fetchDraftGameSetupSnapshot.mockResolvedValue({
      ...snapshot,
      enabledQuestionIds: ['q1'],
    })
    client.setQueryData(
      gameSetupDraftQueryOptions.queryKey,
      createLoadedDraftState({ ...snapshot, enabledQuestionIds: ['q1'] }),
    )
    client.setQueryData(
      gameQuestionCatalogQueryOptions({ search: '', includeDisabled: false }).queryKey,
      [],
    )
    const { result } = renderHook(() => useGameSetupDraft(), {
      wrapper: createQueryWrapper(client),
    })
    await waitFor(() => expect(apiMocks.fetchGameQuestionCatalog).toHaveBeenCalledOnce())
    expect(result.current.draft?.enabledQuestionIds).toEqual(['q1'])
    await act(async () => {
      resolveCatalog([{ questionId: 'q1', isEnabled: true }] as GameQuestionCatalogItem[])
    })
    expect(result.current.draft?.enabledQuestionIds).toEqual(['q1'])
    expect(result.current.isDirty).toBe(false)
    client.clear()
  })
})
