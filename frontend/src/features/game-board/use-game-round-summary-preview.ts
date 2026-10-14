import { useEffect, useRef, useState } from 'react'
import type { components } from '../../shared/api/contracts/generated'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { broadcastGameRoundSummary } from '../game-rounds/index.ts'
import { getGameRoundPreviewErrorCode } from './model/game-round-preview-error.ts'
import type { GameRoundPreviewState } from './model/game-round-preview-state.ts'

export function useGameRoundSummaryPreview(
  roundId: string,
  roundVersion: number,
  broadcastInput: components['schemas']['BroadcastGameRoundSummaryRequestDto'] | null,
  previewInputKey: string | null,
) {
  const requestSequence = useRef(0)
  const pendingPublication = useRef<Promise<void>>(Promise.resolve())
  const [previewState, setPreviewState] = useState<GameRoundPreviewState>({
    status: 'incomplete',
    data: null,
    inputKey: null,
    errorCode: null,
  })

  useEffect(() => {
    const sequence = ++requestSequence.current
    let cancelled = false
    if (!broadcastInput) return
    const timer = window.setTimeout(() => {
      if (cancelled || requestSequence.current !== sequence) return
      setPreviewState((current) => ({
        ...current,
        status: 'loading',
        inputKey: previewInputKey,
        errorCode: null,
      }))
      // Serialize writes so a slow earlier draft cannot replace a newer one on OBS.
      pendingPublication.current = pendingPublication.current
        .then(async () => {
          if (cancelled || requestSequence.current !== sequence) return
          return broadcastGameRoundSummary(roundId, broadcastInput)
        })
        .then((data) => {
          if (cancelled || requestSequence.current !== sequence) return
          if (!data) {
            setPreviewState({ status: 'incomplete', data: null, inputKey: null, errorCode: null })
            return
          }
          if (data.roundVersion !== roundVersion) {
            setPreviewState({
              status: 'stale',
              data: null,
              inputKey: previewInputKey,
              errorCode: null,
            })
            return
          }
          if (!data.normalizedInputHash.trim()) {
            setPreviewState({
              status: 'error',
              data: null,
              inputKey: previewInputKey,
              errorCode: null,
            })
            return
          }
          setPreviewState({
            status: 'success',
            data,
            inputKey: previewInputKey,
            errorCode: null,
          })
        })
        .catch((error: unknown) => {
          if (cancelled || requestSequence.current !== sequence) return
          const errorCode = getGameRoundPreviewErrorCode(error)
          setPreviewState({
            status:
              errorCode === 'game_round.stale_version' ||
              (error instanceof ApiError && error.status === 409)
                ? 'stale'
                : 'error',
            data: null,
            inputKey: previewInputKey,
            errorCode,
          })
        })
    }, 350)

    return () => {
      window.clearTimeout(timer)
      cancelled = true
    }
  }, [roundId, roundVersion, previewInputKey, broadcastInput])

  return previewState
}
