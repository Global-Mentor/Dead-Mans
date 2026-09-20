import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ErrorResponse, GameSetupSnapshot } from '../../shared/api/contracts/index.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { saveDraftGameSetup } from './api/game-setup-api.ts'
import { buildUpdateGameSetupRequest, type GameSetupDraftState } from './model/game-setup-draft.ts'
import {
  getGameSetupDraftValidationError,
  type GameSetupDraftValidationError,
} from './model/game-setup-draft-validation.ts'
import {
  createLoadedDraftState,
  getSnapshotDraftKey,
  loadGameSetupDraftQueryState,
} from './model/game-setup-query-state.ts'
import type { GameSetupDraftController } from './use-game-setup-draft.ts'

export type GameSetupSyncStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'
export type GameSetupSaveErrorKey = GameSetupDraftValidationError | 'saveFailed'

class SupersededGameSetupSaveError extends Error {}

interface SaveDraftVariables {
  draftToSave: GameSetupDraftState
  generation: number
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

interface UseGameSetupSaveOptions {
  draft: GameSetupDraftState | null
  snapshot: GameSetupSnapshot | null
  snapshotDraftKey: string | null
  isDirty: boolean
  applyLoadedDraftState: GameSetupDraftController['applyLoadedDraftState']
  setDraftOverride: GameSetupDraftController['setDraftOverride']
  setRemoteChangeNotice: GameSetupDraftController['setRemoteChangeNotice']
}

export function useGameSetupSave({
  draft,
  snapshot,
  snapshotDraftKey,
  isDirty,
  applyLoadedDraftState,
  setDraftOverride,
  setRemoteChangeNotice,
}: UseGameSetupSaveOptions) {
  const [syncStatus, setSyncStatus] = useState<GameSetupSyncStatus>('saved')
  const [saveErrorMessage, setSaveErrorMessage] = useState<GameSetupSaveErrorKey | null>(null)
  const draftRef = useRef(draft)
  const snapshotRef = useRef(snapshot)
  const dirtyRef = useRef(isDirty)
  const saveGenerationRef = useRef(0)

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    if (!isDirty) {
      snapshotRef.current = snapshot
    }
    dirtyRef.current = isDirty
  }, [isDirty, snapshot])

  const handleSaveConflict = useCallback(async () => {
    saveGenerationRef.current += 1
    const loaded = await loadGameSetupDraftQueryState()
    snapshotRef.current = loaded.snapshot
    draftRef.current = loaded.initialDraft
    dirtyRef.current = false
    applyLoadedDraftState(loaded)
    setSyncStatus('conflict')
    setRemoteChangeNotice(true)
  }, [applyLoadedDraftState, setRemoteChangeNotice])

  const { mutateAsync: saveDraftAsync, isPending: isSaving } = useMutation({
    scope: { id: `game-setup-save:${snapshotDraftKey ?? 'none'}` },
    mutationFn: async ({ draftToSave, generation }: SaveDraftVariables) => {
      if (generation !== saveGenerationRef.current) {
        throw new SupersededGameSetupSaveError()
      }

      const currentSnapshot = snapshotRef.current
      if (!currentSnapshot) {
        throw new Error('Cannot save a game setup draft without a server snapshot.')
      }

      return saveDraftGameSetup(buildUpdateGameSetupRequest(draftToSave, currentSnapshot.version))
    },
    onMutate: ({ generation }) => {
      if (generation !== saveGenerationRef.current) {
        return
      }
      setSyncStatus('saving')
      setSaveErrorMessage(null)
    },
    onSuccess: (nextSnapshot, { draftToSave, generation }) => {
      if (generation !== saveGenerationRef.current) {
        return
      }

      const hasNewerDraft = draftRef.current !== null && draftRef.current !== draftToSave
      snapshotRef.current = nextSnapshot
      applyLoadedDraftState(createLoadedDraftState(nextSnapshot))
      if (hasNewerDraft && draftRef.current) {
        setDraftOverride({
          key: getSnapshotDraftKey(nextSnapshot),
          draft: draftRef.current,
        })
      }
      dirtyRef.current = hasNewerDraft
      setSyncStatus('saved')
      setRemoteChangeNotice(false)
    },
    onError: async (error, { generation }) => {
      if (
        generation !== saveGenerationRef.current ||
        error instanceof SupersededGameSetupSaveError
      ) {
        return
      }

      if (isStaleVersionError(error)) {
        await handleSaveConflict()
        return
      }

      if (error instanceof ApiError && error.status === 404) {
        dirtyRef.current = false
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

  const saveDraft = useCallback(
    async (draftToSave?: GameSetupDraftState) => {
      const nextDraft = draftToSave ?? draftRef.current
      if (!nextDraft || !snapshotRef.current || (!draftToSave && !dirtyRef.current)) {
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
        generation: saveGenerationRef.current,
      })
    },
    [saveDraftAsync],
  )

  const saveDraftWithLayout = useCallback(
    async (nextDraft: GameSetupDraftState) => {
      if (!snapshotRef.current) {
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
        generation: saveGenerationRef.current,
      })
    },
    [saveDraftAsync],
  )

  const flushDraftSave = useCallback(async () => {
    await saveDraft()
  }, [saveDraft])

  const applyLayoutChange = (updater: (current: GameSetupDraftState) => GameSetupDraftState) => {
    if (!draft || !snapshot || !snapshotDraftKey) {
      return
    }

    const previousDraft = draft
    const nextDraft = updater(draft)
    draftRef.current = nextDraft
    dirtyRef.current = true
    setDraftOverride({
      key: snapshotDraftKey,
      draft: nextDraft,
    })
    void saveDraftWithLayout(nextDraft).catch((error) => {
      if (error instanceof SupersededGameSetupSaveError) {
        return
      }

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
      draftRef.current = previousDraft
      dirtyRef.current = true
    })
  }

  const resolvedSyncStatus = useMemo((): GameSetupSyncStatus => {
    if (syncStatus === 'saving' || syncStatus === 'error' || syncStatus === 'conflict') {
      return syncStatus
    }

    if (isDirty) {
      return syncStatus === 'saved' ? 'idle' : syncStatus
    }

    return 'saved'
  }, [isDirty, syncStatus])

  const handleDraftEdited = useCallback((nextDraft?: GameSetupDraftState) => {
    if (nextDraft) {
      draftRef.current = nextDraft
    }
    dirtyRef.current = true
    setSaveErrorMessage(null)
    setSyncStatus((current) => (current === 'saved' ? 'idle' : current))
  }, [])

  const resetToSaved = useCallback(() => {
    saveGenerationRef.current += 1
    dirtyRef.current = false
    setSaveErrorMessage(null)
    setSyncStatus('saved')
  }, [])

  const resetToIdle = useCallback(() => {
    saveGenerationRef.current += 1
    dirtyRef.current = false
    setSaveErrorMessage(null)
    setSyncStatus('idle')
  }, [])

  return {
    syncStatus: resolvedSyncStatus,
    saveErrorMessage,
    isSaving,
    saveDraft,
    applyLayoutChange,
    flushDraftSave,
    handleDraftEdited,
    resetToSaved,
    resetToIdle,
  }
}
