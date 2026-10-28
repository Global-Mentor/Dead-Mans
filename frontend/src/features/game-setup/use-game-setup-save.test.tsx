import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameSetupSnapshot } from '../../shared/api/contracts/index.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { createDraftFromSnapshot } from './model/game-setup-draft.ts'
import { createLoadedDraftState } from './model/game-setup-query-state.ts'
import { useGameSetupSave } from './use-game-setup-save.ts'

const apiMocks = vi.hoisted(() => ({
  saveDraftGameSetup: vi.fn(),
}))
vi.mock('./api/game-setup-api.ts', () => apiMocks)

const snapshot: GameSetupSnapshot = {
  gameId: 'game-1',
  title: 'Draft game',
  status: 'draft',
  version: 3,
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

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function renderSaveHook() {
  const draft = { ...createDraftFromSnapshot(snapshot), title: 'Edited title' }
  const applyLoadedDraftState = vi.fn()
  const setDraftOverride = vi.fn()
  const setRemoteChangeNotice = vi.fn()
  const hook = renderHook(
    () =>
      useGameSetupSave({
        draft,
        snapshot,
        snapshotDraftKey: snapshot.gameId,
        isDirty: true,
        applyLoadedDraftState,
        setDraftOverride,
        setRemoteChangeNotice,
      }),
    { wrapper: createQueryWrapper() },
  )

  return {
    ...hook,
    draft,
    applyLoadedDraftState,
    setDraftOverride,
    setRemoteChangeNotice,
  }
}

describe('useGameSetupSave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves the current draft through the typed update request', async () => {
    const savedSnapshot = { ...snapshot, title: 'Edited title', version: 4 }
    apiMocks.saveDraftGameSetup.mockResolvedValue(savedSnapshot)
    const { result, applyLoadedDraftState, setRemoteChangeNotice } = renderSaveHook()

    await act(async () => {
      await result.current.saveDraft()
    })

    expect(apiMocks.saveDraftGameSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedVersion: snapshot.version,
        title: 'Edited title',
      }),
    )
    expect(applyLoadedDraftState).toHaveBeenCalledWith(createLoadedDraftState(savedSnapshot))
    expect(setRemoteChangeNotice).toHaveBeenLastCalledWith(false)
    expect(result.current.saveErrorMessage).toBeNull()
  })

  it('preserves local changes and their base version until an explicit reload after conflict', async () => {
    apiMocks.saveDraftGameSetup.mockRejectedValue(
      new ApiError('Conflict', {
        status: 409,
        details: { code: API_ERROR_CODES.gameSetupStaleVersion },
      }),
    )
    const { result, applyLoadedDraftState, setRemoteChangeNotice } = renderSaveHook()

    await act(async () => {
      await expect(result.current.saveDraft()).rejects.toThrow('Conflict')
    })

    expect(applyLoadedDraftState).not.toHaveBeenCalled()
    expect(setRemoteChangeNotice).toHaveBeenLastCalledWith(true)
    expect(result.current.syncStatus).toBe('conflict')

    await act(async () => {
      await expect(result.current.saveDraft()).rejects.toThrow('Conflict')
    })
    expect(apiMocks.saveDraftGameSetup).toHaveBeenLastCalledWith(
      expect.objectContaining({ expectedVersion: snapshot.version, title: 'Edited title' }),
    )
    expect(applyLoadedDraftState).not.toHaveBeenCalled()
  })

  it('rolls an optimistic layout edit back when saving fails', async () => {
    apiMocks.saveDraftGameSetup.mockRejectedValue(new ApiError('Unavailable', { status: 503 }))
    const { result, draft, setDraftOverride } = renderSaveHook()
    const nextDraft = { ...draft, rowLabels: ['200'] }

    act(() => {
      result.current.applyLayoutChange(() => nextDraft)
    })

    expect(setDraftOverride).toHaveBeenNthCalledWith(1, {
      key: snapshot.gameId,
      draft: nextDraft,
    })
    await waitFor(() =>
      expect(setDraftOverride).toHaveBeenLastCalledWith({
        key: snapshot.gameId,
        draft,
      }),
    )
    expect(result.current.syncStatus).toBe('error')
    expect(result.current.saveErrorMessage).toBe('saveFailed')
  })

  it('serializes rapid auto-saves and uses the version returned by the previous save', async () => {
    let resolveFirstSave: ((value: GameSetupSnapshot) => void) | undefined
    apiMocks.saveDraftGameSetup
      .mockImplementationOnce(
        () =>
          new Promise<GameSetupSnapshot>((resolve) => {
            resolveFirstSave = resolve
          }),
      )
      .mockResolvedValueOnce({ ...snapshot, title: 'Second edit', version: 5 })
    const { result, draft } = renderSaveHook()
    const secondDraft = { ...draft, title: 'Second edit' }

    let firstSave: Promise<void>
    let secondSave: Promise<void>
    act(() => {
      firstSave = result.current.saveDraft(draft)
      result.current.handleDraftEdited(secondDraft)
      secondSave = result.current.saveDraft(secondDraft)
    })

    await waitFor(() => expect(apiMocks.saveDraftGameSetup).toHaveBeenCalledOnce())

    await act(async () => {
      resolveFirstSave?.({ ...snapshot, title: draft.title, version: 4 })
      await firstSave!
      await secondSave!
    })

    expect(apiMocks.saveDraftGameSetup).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ expectedVersion: 4, title: 'Second edit' }),
    )
  })

  it('saves an edit committed before the dirty prop rerenders', async () => {
    const initialDraft = createDraftFromSnapshot(snapshot)
    const editedDraft = { ...initialDraft, title: 'Immediate blur edit' }
    apiMocks.saveDraftGameSetup.mockResolvedValue({
      ...snapshot,
      title: editedDraft.title,
      version: 4,
    })
    const hook = renderHook(
      () =>
        useGameSetupSave({
          draft: initialDraft,
          snapshot,
          snapshotDraftKey: snapshot.gameId,
          isDirty: false,
          applyLoadedDraftState: vi.fn(),
          setDraftOverride: vi.fn(),
          setRemoteChangeNotice: vi.fn(),
        }),
      { wrapper: createQueryWrapper() },
    )

    act(() => hook.result.current.handleDraftEdited(editedDraft))
    await act(async () => hook.result.current.saveDraft())

    expect(apiMocks.saveDraftGameSetup).toHaveBeenCalledWith(
      expect.objectContaining({ title: editedDraft.title, expectedVersion: snapshot.version }),
    )
  })

  it('discards queued saves after a version conflict', async () => {
    apiMocks.saveDraftGameSetup.mockRejectedValueOnce(
      new ApiError('Conflict', {
        status: 409,
        details: { code: API_ERROR_CODES.gameSetupStaleVersion },
      }),
    )
    const { result, draft } = renderSaveHook()
    const queuedDraft = { ...draft, title: 'Queued local edit' }

    await act(async () => {
      const conflictingSave = result.current.saveDraft(draft)
      result.current.handleDraftEdited(queuedDraft)
      const queuedSave = result.current.saveDraft(queuedDraft)
      await Promise.allSettled([conflictingSave, queuedSave])
    })

    expect(apiMocks.saveDraftGameSetup).toHaveBeenCalledOnce()
    expect(result.current.syncStatus).toBe('conflict')
  })

  it('keeps the edited base version when a remote snapshot arrives before blur', async () => {
    const draft = { ...createDraftFromSnapshot(snapshot), title: 'Local edit' }
    apiMocks.saveDraftGameSetup.mockResolvedValue({ ...snapshot, title: draft.title, version: 4 })
    const hook = renderHook(
      ({ currentSnapshot }: { currentSnapshot: GameSetupSnapshot }) =>
        useGameSetupSave({
          draft,
          snapshot: currentSnapshot,
          snapshotDraftKey: currentSnapshot.gameId,
          isDirty: true,
          applyLoadedDraftState: vi.fn(),
          setDraftOverride: vi.fn(),
          setRemoteChangeNotice: vi.fn(),
        }),
      {
        wrapper: createQueryWrapper(),
        initialProps: { currentSnapshot: snapshot },
      },
    )

    hook.rerender({ currentSnapshot: { ...snapshot, title: 'Remote edit', version: 4 } })
    await act(async () => {
      await hook.result.current.saveDraft()
    })

    expect(apiMocks.saveDraftGameSetup).toHaveBeenCalledWith(
      expect.objectContaining({ expectedVersion: 3, title: 'Local edit' }),
    )
  })

  it.each(['success', 'missing'] as const)(
    'ignores a late %s and queued saves after another game replaces the draft',
    async (outcome) => {
      let resolve!: (value: GameSetupSnapshot) => void
      let reject!: (error: Error) => void
      apiMocks.saveDraftGameSetup.mockReturnValue(
        new Promise<GameSetupSnapshot>((done, fail) => {
          resolve = done
          reject = fail
        }),
      )
      const applyLoadedDraftState = vi.fn()
      const setDraftOverride = vi.fn()
      const hook = renderHook(
        ({ currentSnapshot }: { currentSnapshot: GameSetupSnapshot }) =>
          useGameSetupSave({
            draft: { ...createDraftFromSnapshot(currentSnapshot), title: 'Local edit' },
            snapshot: currentSnapshot,
            snapshotDraftKey: currentSnapshot.gameId,
            isDirty: true,
            applyLoadedDraftState,
            setDraftOverride,
            setRemoteChangeNotice: vi.fn(),
          }),
        { wrapper: createQueryWrapper(), initialProps: { currentSnapshot: snapshot } },
      )
      let completed!: Promise<PromiseSettledResult<void>[]>
      act(() => {
        completed = Promise.allSettled([
          hook.result.current.saveDraft(),
          hook.result.current.saveDraft(),
        ])
      })
      await waitFor(() => expect(apiMocks.saveDraftGameSetup).toHaveBeenCalledOnce())
      hook.rerender({ currentSnapshot: { ...snapshot, gameId: 'game-2', version: 1 } })

      await act(async () => {
        if (outcome === 'success') resolve({ ...snapshot, version: 4 })
        else reject(new ApiError('Missing draft', { status: 404 }))
        await completed
      })

      expect(applyLoadedDraftState).not.toHaveBeenCalled()
      expect(setDraftOverride).not.toHaveBeenCalled()
      expect(apiMocks.saveDraftGameSetup).toHaveBeenCalledOnce()
    },
  )
})
