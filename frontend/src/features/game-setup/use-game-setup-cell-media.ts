import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import type { GameBoardCellMedia, GameSetupSnapshot } from '../../shared/api/contracts/index.ts'
import { queryKeys } from '../../shared/api/query-keys.ts'
import {
  deleteDraftGameSetupCellMedia,
  uploadDraftGameSetupCellMedia,
} from './api/game-setup-api.ts'
import {
  validateGameSetupCellMediaFile,
  type GameSetupCellMediaValidationError,
} from './model/game-setup-cell-media-limits.ts'
import {
  createIdleCellMediaDisplayState,
  isGameSetupCellMediaBusy,
  type GameSetupCellMediaDisplayState,
} from './model/game-setup-cell-media-display.ts'
import type { LoadedGameSetupDraftState } from './model/game-setup-query-state.ts'
import { patchGameSetupSnapshotCellMedia } from './model/game-setup-snapshot-media.ts'

type GameSetupCellMediaErrorKey =
  | GameSetupCellMediaValidationError
  | 'saveRequired'
  | 'invalidFile'
  | 'notFound'
  | 'uploadFailed'
  | 'deleteFailed'

function getCellMediaErrorKey(
  error: unknown,
): Exclude<GameSetupCellMediaErrorKey, GameSetupCellMediaValidationError | 'saveRequired'> {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return 'invalidFile'
    }

    if (error.status === 404) {
      return 'notFound'
    }
  }

  return 'uploadFailed'
}

function getDeleteCellMediaErrorKey(error: unknown): 'notFound' | 'deleteFailed' {
  if (error instanceof ApiError && error.status === 404) {
    return 'notFound'
  }

  return 'deleteFailed'
}

interface UseGameSetupCellMediaOptions {
  flushDraftSave?: () => Promise<void>
}

export function useGameSetupCellMedia(
  snapshot: GameSetupSnapshot | null,
  options: UseGameSetupCellMediaOptions = {},
) {
  const { flushDraftSave } = options
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [displayBySnapshotKey, setDisplayBySnapshotKey] = useState<
    Record<string, Record<string, GameSetupCellMediaDisplayState>>
  >({})
  const [errorKey, setErrorKey] = useState<GameSetupCellMediaErrorKey | null>(null)
  const previewUrlsRef = useRef<Set<string>>(new Set())
  const snapshotKey = snapshot ? `${snapshot.gameId}:${snapshot.version}` : null
  const displayByCellId = useMemo(
    () => (snapshotKey ? (displayBySnapshotKey[snapshotKey] ?? {}) : {}),
    [displayBySnapshotKey, snapshotKey],
  )

  const trackPreviewUrl = useCallback((previewUrl: string) => {
    previewUrlsRef.current.add(previewUrl)
  }, [])

  const revokePreviewUrl = useCallback((previewUrl: string | null) => {
    if (!previewUrl) {
      return
    }

    URL.revokeObjectURL(previewUrl)
    previewUrlsRef.current.delete(previewUrl)
  }, [])

  const setCellDisplay = useCallback(
    (
      cellId: string,
      updater: (current: GameSetupCellMediaDisplayState) => GameSetupCellMediaDisplayState,
    ) => {
      if (!snapshotKey) {
        return
      }

      setDisplayBySnapshotKey((current) => {
        const snapshotDisplay = current[snapshotKey] ?? {}
        const previous = snapshotDisplay[cellId] ?? createIdleCellMediaDisplayState()
        const next = updater(previous)

        if (previous.previewUrl && previous.previewUrl !== next.previewUrl) {
          revokePreviewUrl(previous.previewUrl)
        }

        if (
          next.phase === 'idle' &&
          !next.previewUrl &&
          next.cacheRevision === previous.cacheRevision
        ) {
          if (!(cellId in snapshotDisplay)) {
            return current
          }

          const rest = { ...snapshotDisplay }
          delete rest[cellId]
          return {
            ...current,
            [snapshotKey]: rest,
          }
        }

        return {
          ...current,
          [snapshotKey]: {
            ...snapshotDisplay,
            [cellId]: next,
          },
        }
      })
    },
    [revokePreviewUrl, snapshotKey],
  )

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl)
      })
      previewUrlsRef.current.clear()
    },
    [],
  )

  const patchSnapshotMedia = useCallback(
    (cellId: string, media: GameBoardCellMedia | null) => {
      queryClient.setQueryData(
        queryKeys.gameSetup.draftSnapshot(),
        (current: LoadedGameSetupDraftState | undefined) => {
          if (!current?.snapshot) {
            return current
          }

          return {
            ...current,
            snapshot: patchGameSetupSnapshotCellMedia(current.snapshot, cellId, media),
          }
        },
      )
    },
    [queryClient],
  )

  const uploadMutation = useMutation({
    mutationFn: ({ cellId, file }: { cellId: string; file: File }) =>
      uploadDraftGameSetupCellMedia(cellId, file),
    onSuccess: (media, { cellId }) => {
      patchSnapshotMedia(cellId, media)
      setCellDisplay(cellId, (current) => ({
        phase: 'idle',
        previewUrl: null,
        cacheRevision: current.cacheRevision + 1,
      }))
    },
    onError: (error, { cellId }) => {
      setErrorKey(getCellMediaErrorKey(error))
      setCellDisplay(cellId, (current) => ({
        phase: 'idle',
        previewUrl: null,
        cacheRevision: current.cacheRevision,
      }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (cellId: string) => deleteDraftGameSetupCellMedia(cellId),
    onMutate: (cellId) => {
      const previousData = queryClient.getQueryData<LoadedGameSetupDraftState>(
        queryKeys.gameSetup.draftSnapshot(),
      )
      patchSnapshotMedia(cellId, null)
      setCellDisplay(cellId, (current) => ({
        ...current,
        phase: 'deleting',
        previewUrl: null,
      }))

      return { previousData }
    },
    onSuccess: (_, cellId) => {
      setCellDisplay(cellId, (current) => ({
        phase: 'idle',
        previewUrl: null,
        cacheRevision: current.cacheRevision + 1,
      }))
    },
    onError: (error, cellId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.gameSetup.draftSnapshot(), context.previousData)
      }

      setErrorKey(getDeleteCellMediaErrorKey(error))
      setCellDisplay(cellId, (current) => ({
        phase: 'idle',
        previewUrl: null,
        cacheRevision: current.cacheRevision,
      }))
    },
  })

  const isCellMediaBusy = useCallback(
    (cellId: string | undefined) => {
      if (!cellId) {
        return false
      }

      return isGameSetupCellMediaBusy(displayByCellId[cellId])
    },
    [displayByCellId],
  )

  const beginUpload = useCallback(
    (cellId: string, file: File) => {
      const previewUrl = URL.createObjectURL(file)
      trackPreviewUrl(previewUrl)
      setErrorKey(null)
      setCellDisplay(cellId, (current) => ({
        phase: 'uploading',
        previewUrl,
        cacheRevision: current.cacheRevision,
      }))
      uploadMutation.mutate({ cellId, file })
    },
    [setCellDisplay, trackPreviewUrl, uploadMutation],
  )

  const uploadCellMedia = useCallback(
    async (cellId: string | undefined, file: File) => {
      if (!snapshot) {
        return
      }

      if (!cellId) {
        if (flushDraftSave) {
          await flushDraftSave()
        }
        setErrorKey('saveRequired')
        return
      }

      if (isCellMediaBusy(cellId)) {
        return
      }

      const validationError = validateGameSetupCellMediaFile(file)
      if (validationError) {
        setErrorKey(validationError)
        return
      }

      beginUpload(cellId, file)
    },
    [beginUpload, flushDraftSave, isCellMediaBusy, snapshot],
  )

  const deleteCellMedia = useCallback(
    (cellId: string | undefined) => {
      if (!snapshot || !cellId) {
        if (!cellId) {
          setErrorKey('saveRequired')
        }
        return
      }

      if (isCellMediaBusy(cellId)) {
        return
      }

      setErrorKey(null)
      deleteMutation.mutate(cellId)
    },
    [deleteMutation, isCellMediaBusy, snapshot],
  )

  const cellMediaErrorMessage = errorKey ? t(`gameSetup.cellMedia.errors.${errorKey}`) : null

  return {
    cellMediaDisplayByCellId: displayByCellId,
    isCellMediaBusy,
    cellMediaErrorMessage,
    uploadCellMedia,
    deleteCellMedia,
    dismissCellMediaError: () => setErrorKey(null),
  }
}
