import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import {
  createDraftGameSetup,
  deleteDraftGameSetup,
  saveDraftGameSetup,
} from './api/game-setup-api.ts'
import { gameSetupDraftQueryOptions } from './api/game-setup-queries.ts'
import {
  buildUpdateGameSetupRequest,
  isGameSetupDraftDirty,
  type GameSetupDraftState,
} from './model/game-setup-draft.ts'
import {
  createLoadedDraftState,
  getSnapshotDraftKey,
  loadGameSetupDraftQueryState,
  type LoadedGameSetupDraftState,
} from './model/game-setup-query-state.ts'
import type { ErrorResponse } from '../../shared/api/contracts/index.ts'
import { useGameSetupCellMedia } from './use-game-setup-cell-media.ts'
import {
  getGameSetupDraftValidationError,
  type GameSetupDraftValidationError,
} from './model/game-setup-draft-validation.ts'

export type GameSetupSyncStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'
type GameSetupSaveErrorKey = GameSetupDraftValidationError | 'saveFailed'
type GameSetupResetErrorKey = 'resetFailed'

interface DraftOverride {
  key: string
  draft: GameSetupDraftState
}

function isStaleVersionError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return false
  }

  if (!error.details || typeof error.details !== 'object') {
    return false
  }

  return (error.details as ErrorResponse).code === API_ERROR_CODES.gameSetupStaleVersion
}

export function useGameSetupPage() {
  const queryClient = useQueryClient()
  const [draftOverride, setDraftOverride] = useState<DraftOverride | null>(null)
  const [syncStatus, setSyncStatus] = useState<GameSetupSyncStatus>('saved')
  const [saveErrorMessage, setSaveErrorMessage] = useState<GameSetupSaveErrorKey | null>(null)
  const [resetErrorMessage, setResetErrorMessage] = useState<GameSetupResetErrorKey | null>(null)
  const [remoteChangeNotice, setRemoteChangeNotice] = useState(false)
  const [draftRemovedNotice, setDraftRemovedNotice] = useState(false)
  const lastSyncedVersionRef = useRef<number | null>(null)
  const hadSnapshotRef = useRef(false)

  const draftQuery = useQuery(gameSetupDraftQueryOptions)

  const snapshot = draftQuery.data?.snapshot ?? null
  const savedDraft = draftQuery.data?.savedDraft ?? null
  const snapshotDraftKey = snapshot ? getSnapshotDraftKey(snapshot) : null
  const activeDraftOverride =
    snapshotDraftKey && draftOverride?.key === snapshotDraftKey ? draftOverride : null
  const draft = activeDraftOverride?.draft ?? draftQuery.data?.initialDraft ?? null

  const isDirty = useMemo(() => {
    if (!savedDraft || !draft) {
      return false
    }

    return isGameSetupDraftDirty(savedDraft, draft)
  }, [savedDraft, draft])

  const applyLoadedDraftState = useCallback(
    (loaded: LoadedGameSetupDraftState) => {
      const previous = queryClient.getQueryData<LoadedGameSetupDraftState>(
        gameSetupDraftQueryOptions.queryKey,
      )
      if (previous?.snapshot && !loaded.snapshot) {
        setDraftRemovedNotice(true)
      }

      setDraftOverride(null)
      queryClient.setQueryData(gameSetupDraftQueryOptions.queryKey, loaded)
      lastSyncedVersionRef.current = loaded.snapshot?.version ?? null
    },
    [queryClient],
  )

  const handleSaveConflict = useCallback(async () => {
    const loaded = await loadGameSetupDraftQueryState()
    applyLoadedDraftState(loaded)
    setSyncStatus('conflict')
    setRemoteChangeNotice(true)
  }, [applyLoadedDraftState])

  const { mutateAsync: saveDraftAsync, isPending: isSaving } = useMutation({
    mutationFn: async ({
      draftToSave,
      expectedVersion,
    }: {
      draftToSave: GameSetupDraftState
      expectedVersion: number
    }) => saveDraftGameSetup(buildUpdateGameSetupRequest(draftToSave, expectedVersion)),
    onMutate: () => {
      setSyncStatus('saving')
      setSaveErrorMessage(null)
    },
    onSuccess: (nextSnapshot) => {
      applyLoadedDraftState(createLoadedDraftState(nextSnapshot))
      setSyncStatus('saved')
      setRemoteChangeNotice(false)
    },
    onError: async (error) => {
      if (isStaleVersionError(error)) {
        await handleSaveConflict()
        return
      }

      if (error instanceof ApiError && error.status === 404) {
        applyLoadedDraftState(createLoadedDraftState(null))
        setSyncStatus('idle')
        return
      }

      if (error instanceof ApiError && error.details && typeof error.details === 'object') {
        const payload = error.details as ErrorResponse
        if (payload.code === API_ERROR_CODES.invalidGameSetupTitle) {
          setSaveErrorMessage('invalidTitle')
          setSyncStatus('error')
          return
        }
      }

      setSaveErrorMessage('saveFailed')
      setSyncStatus('error')
    },
  })

  const saveDraft = useCallback(async () => {
    if (!draft || !snapshot || !isDirty) {
      return
    }

    const validationError = getGameSetupDraftValidationError(draft)
    if (validationError) {
      setSaveErrorMessage(validationError)
      setSyncStatus('error')
      return
    }

    await saveDraftAsync({
      draftToSave: draft,
      expectedVersion: snapshot.version,
    })
  }, [draft, isDirty, saveDraftAsync, snapshot])

  const saveDraftWithLayout = useCallback(
    async (nextDraft: GameSetupDraftState) => {
      if (!snapshot) {
        return
      }

      const validationError = getGameSetupDraftValidationError(nextDraft)
      if (validationError) {
        setSaveErrorMessage(validationError)
        setSyncStatus('error')
        return
      }

      await saveDraftAsync({
        draftToSave: nextDraft,
        expectedVersion: snapshot.version,
      })
    },
    [saveDraftAsync, snapshot],
  )

  const flushDraftSave = useCallback(async () => {
    await saveDraft()
  }, [saveDraft])

  useEffect(() => {
    const hadSnapshot = hadSnapshotRef.current
    hadSnapshotRef.current = snapshot !== null

    if (!snapshot) {
      if (hadSnapshot && draftOverride !== null) {
        queueMicrotask(() => setDraftRemovedNotice(true))
      }

      lastSyncedVersionRef.current = null
      queueMicrotask(() => setDraftOverride(null))
      return
    }

    const previousVersion = lastSyncedVersionRef.current
    lastSyncedVersionRef.current = snapshot.version

    if (previousVersion === null || previousVersion === snapshot.version) {
      return
    }

    if (isDirty) {
      queueMicrotask(() => setRemoteChangeNotice(true))
      return
    }

    queueMicrotask(() => setDraftOverride(null))
    queueMicrotask(() => setRemoteChangeNotice(false))
  }, [draftOverride, isDirty, snapshot])

  const resolvedSyncStatus = useMemo((): GameSetupSyncStatus => {
    if (syncStatus === 'saving' || syncStatus === 'error' || syncStatus === 'conflict') {
      return syncStatus
    }

    if (isDirty) {
      return syncStatus === 'saved' ? 'idle' : syncStatus
    }

    return 'saved'
  }, [isDirty, syncStatus])

  const cellMedia = useGameSetupCellMedia(snapshot, { flushDraftSave })

  const createDraftMutation = useMutation({
    mutationFn: createDraftGameSetup,
    onSuccess: (nextSnapshot) => {
      applyLoadedDraftState(createLoadedDraftState(nextSnapshot))
      setResetErrorMessage(null)
      setSaveErrorMessage(null)
      setDraftRemovedNotice(false)
      setSyncStatus('saved')
    },
  })

  const updateDraft = (updater: (current: GameSetupDraftState) => GameSetupDraftState) => {
    if (!snapshotDraftKey || !draft) {
      return
    }

    setDraftOverride({
      key: snapshotDraftKey,
      draft: updater(draft),
    })
    setSaveErrorMessage(null)
    setResetErrorMessage(null)
    setRemoteChangeNotice(false)
    if (syncStatus === 'saved') {
      setSyncStatus('idle')
    }
  }

  const applyLayoutChange = (updater: (current: GameSetupDraftState) => GameSetupDraftState) => {
    if (!draft || !snapshot || !snapshotDraftKey) {
      return
    }

    const previousDraft = draft
    const nextDraft = updater(draft)
    setDraftOverride({
      key: snapshotDraftKey,
      draft: nextDraft,
    })
    void saveDraftWithLayout(nextDraft).catch((error) => {
      if (isStaleVersionError(error)) {
        return
      }

      if (error instanceof ApiError && error.status === 404) {
        return
      }

      setDraftOverride({
        key: snapshotDraftKey,
        draft: previousDraft,
      })
    })
  }

  const deleteDraftMutation = useMutation({
    mutationFn: deleteDraftGameSetup,
    onSuccess: () => {
      applyLoadedDraftState(createLoadedDraftState(null))
      setDraftRemovedNotice(false)
      setSaveErrorMessage(null)
      setResetErrorMessage(null)
      setSyncStatus('idle')
    },
    onError: () => {
      setResetErrorMessage('resetFailed')
    },
  })

  const deleteDraft = async () => {
    await deleteDraftMutation.mutateAsync()
  }

  const toggleModifier = (modifierCode: string, enabled: boolean) => {
    updateDraft((current) => {
      const currentCodes = current.enabledModifierCodes
      const nextCodes = enabled
        ? currentCodes.includes(modifierCode)
          ? currentCodes
          : [...currentCodes, modifierCode]
        : currentCodes.filter((code) => code !== modifierCode)

      return {
        ...current,
        enabledModifierCodes: nextCodes,
      }
    })
  }

  const dismissRemoteChangeNotice = () => setRemoteChangeNotice(false)
  const dismissDraftRemovedNotice = () => setDraftRemovedNotice(false)

  const reloadFromServer = async () => {
    const loaded = await loadGameSetupDraftQueryState()
    applyLoadedDraftState(loaded)
    if (loaded.snapshot) {
      setDraftRemovedNotice(false)
    }
    setRemoteChangeNotice(false)
    setSyncStatus('saved')
  }

  return {
    snapshot,
    draft,
    isLoading: draftQuery.isLoading,
    isError: draftQuery.isError,
    isEmpty: draftQuery.data?.snapshot === null,
    isDirty,
    syncStatus: resolvedSyncStatus,
    remoteChangeNotice,
    draftRemovedNotice,
    saveErrorMessage,
    resetErrorMessage,
    updateDraft,
    applyLayoutChange,
    saveDraft,
    reloadFromServer,
    createDraft: createDraftMutation.mutateAsync,
    deleteDraft,
    toggleModifier,
    isCreating: createDraftMutation.isPending,
    isResetting: deleteDraftMutation.isPending,
    isSaving,
    dismissRemoteChangeNotice,
    dismissDraftRemovedNotice,
    ...cellMedia,
  }
}
