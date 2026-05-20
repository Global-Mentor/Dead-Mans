import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import { queryKeys } from '../../shared/api/query-keys.ts'
import {
  createDraftGameSetup,
  deleteDraftGameSetup,
  fetchDraftGameSetupSnapshot,
  saveDraftGameSetup,
} from './api/game-setup-data-access.ts'
import {
  buildUpdateGameSetupRequest,
  createDraftFromSnapshot,
  isGameSetupDraftDirty,
  type GameSetupDraftState,
} from './model/game-setup-draft.ts'
import {
  clearGameSetupLocalDraft,
  resolveInitialGameSetupDraft,
  writeGameSetupLocalDraft,
} from './model/game-setup-local-draft-storage.ts'
import type { ErrorResponse, GameSetupSnapshot } from '../../shared/api/contracts/index.ts'

const LOCAL_DRAFT_PERSIST_DELAY_MS = 300

interface LoadedGameSetupDraftState {
  snapshot: GameSetupSnapshot | null
  savedDraft: GameSetupDraftState | null
  initialDraft: GameSetupDraftState | null
  restoredFromLocal: boolean
}

interface DraftOverride {
  key: string
  draft: GameSetupDraftState
  restoredFromLocal: boolean
}

function getSnapshotDraftKey(snapshot: GameSetupSnapshot): string {
  return `${snapshot.gameId}:${snapshot.version}`
}

function createLoadedDraftState(
  snapshot: GameSetupSnapshot | null,
  restoreLocalDraft: boolean,
): LoadedGameSetupDraftState {
  if (snapshot === null) {
    clearGameSetupLocalDraft()
    return {
      snapshot: null,
      savedDraft: null,
      initialDraft: null,
      restoredFromLocal: false,
    }
  }

  if (restoreLocalDraft) {
    const resolved = resolveInitialGameSetupDraft(snapshot)
    return {
      snapshot,
      savedDraft: resolved.serverDraft,
      initialDraft: resolved.draft,
      restoredFromLocal: resolved.restoredFromLocal,
    }
  }

  const serverDraft = createDraftFromSnapshot(snapshot)
  return {
    snapshot,
    savedDraft: serverDraft,
    initialDraft: serverDraft,
    restoredFromLocal: false,
  }
}

function persistOrClearLocalDraft(
  snapshot: GameSetupSnapshot,
  savedDraft: GameSetupDraftState,
  draft: GameSetupDraftState,
) {
  if (isGameSetupDraftDirty(savedDraft, draft)) {
    writeGameSetupLocalDraft({
      gameId: snapshot.gameId,
      boardVersion: snapshot.version,
      draft,
    })
    return
  }

  clearGameSetupLocalDraft()
}

export function useGameSetupPage() {
  const queryClient = useQueryClient()
  const [draftOverride, setDraftOverride] = useState<DraftOverride | null>(null)
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null)
  const persistTimeoutRef = useRef<number | null>(null)

  const draftQuery = useQuery({
    queryKey: queryKeys.gameSetup.draftSnapshot(),
    queryFn: async () => createLoadedDraftState(await fetchDraftGameSetupSnapshot(), true),
  })

  const snapshot = draftQuery.data?.snapshot ?? null
  const savedDraft = draftQuery.data?.savedDraft ?? null
  const snapshotDraftKey = snapshot ? getSnapshotDraftKey(snapshot) : null
  const activeDraftOverride =
    snapshotDraftKey && draftOverride?.key === snapshotDraftKey ? draftOverride : null
  const draft = activeDraftOverride?.draft ?? draftQuery.data?.initialDraft ?? null
  const restoredFromLocal =
    activeDraftOverride?.restoredFromLocal ?? draftQuery.data?.restoredFromLocal ?? false

  const isDirty = useMemo(() => {
    if (!savedDraft || !draft) {
      return false
    }

    return isGameSetupDraftDirty(savedDraft, draft)
  }, [savedDraft, draft])

  useEffect(() => {
    if (!snapshot || !draft || !savedDraft) {
      return
    }

    const persistNow = () => persistOrClearLocalDraft(snapshot, savedDraft, draft)

    if (persistTimeoutRef.current !== null) {
      window.clearTimeout(persistTimeoutRef.current)
    }

    persistTimeoutRef.current = window.setTimeout(() => {
      persistTimeoutRef.current = null
      persistNow()
    }, LOCAL_DRAFT_PERSIST_DELAY_MS)

    return () => {
      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current)
        persistTimeoutRef.current = null
      }

      persistNow()
    }
  }, [snapshot, draft, savedDraft])

  useEffect(() => {
    if (!snapshot || !draft || !savedDraft) {
      return
    }

    const flushLocalDraft = () => persistOrClearLocalDraft(snapshot, savedDraft, draft)

    window.addEventListener('beforeunload', flushLocalDraft)
    return () => window.removeEventListener('beforeunload', flushLocalDraft)
  }, [snapshot, draft, savedDraft])

  const createDraftMutation = useMutation({
    mutationFn: createDraftGameSetup,
    onSuccess: (nextSnapshot) => {
      clearGameSetupLocalDraft()
      setDraftOverride(null)
      queryClient.setQueryData(
        queryKeys.gameSetup.draftSnapshot(),
        createLoadedDraftState(nextSnapshot, false),
      )
      setResetErrorMessage(null)
    },
  })

  const saveDraftMutation = useMutation({
    mutationFn: saveDraftGameSetup,
    onSuccess: (nextSnapshot) => {
      clearGameSetupLocalDraft()
      setDraftOverride(null)
      queryClient.setQueryData(
        queryKeys.gameSetup.draftSnapshot(),
        createLoadedDraftState(nextSnapshot, false),
      )
      setResetErrorMessage(null)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.details && typeof error.details === 'object') {
        const payload = error.details as ErrorResponse
        if (payload.code === API_ERROR_CODES.invalidGameSetupTitle) {
          setSaveErrorMessage('invalidTitle')
          return
        }
      }

      setSaveErrorMessage('saveFailed')
    },
  })

  const updateDraft = (updater: (current: GameSetupDraftState) => GameSetupDraftState) => {
    if (!snapshotDraftKey || !draft) {
      return
    }

    setDraftOverride({
      key: snapshotDraftKey,
      draft: updater(draft),
      restoredFromLocal: false,
    })
    setSaveErrorMessage(null)
    setResetErrorMessage(null)
  }

  const deleteDraftMutation = useMutation({
    mutationFn: deleteDraftGameSetup,
    onSuccess: () => {
      clearGameSetupLocalDraft()
      setDraftOverride(null)
      queryClient.setQueryData(
        queryKeys.gameSetup.draftSnapshot(),
        createLoadedDraftState(null, false),
      )
      setSaveErrorMessage(null)
      setResetErrorMessage(null)
    },
    onError: () => {
      setResetErrorMessage('resetFailed')
    },
  })

  const saveDraft = async () => {
    if (!draft) {
      return
    }

    await saveDraftMutation.mutateAsync(buildUpdateGameSetupRequest(draft))
  }

  const deleteDraft = async () => {
    await deleteDraftMutation.mutateAsync()
  }

  return {
    snapshot,
    draft,
    isLoading: draftQuery.isLoading,
    isError: draftQuery.isError,
    isEmpty: draftQuery.data?.snapshot === null,
    isDirty,
    restoredFromLocal,
    saveErrorMessage,
    resetErrorMessage,
    updateDraft,
    saveDraft,
    createDraft: createDraftMutation.mutateAsync,
    deleteDraft,
    isCreating: createDraftMutation.isPending,
    isResetting: deleteDraftMutation.isPending,
    isSaving: saveDraftMutation.isPending,
  }
}
