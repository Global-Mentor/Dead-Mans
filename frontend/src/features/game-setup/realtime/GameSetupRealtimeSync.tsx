import { useCallback, useEffect, useRef } from 'react'
import type { HubConnection } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '../../../shared/lib/logger.ts'
import { realtimeHubs, useSignalrHubSubscription } from '../../../shared/realtime/index.ts'
import { refreshRealtimeQueries } from '../../../shared/realtime/refresh-realtime-queries.ts'
import { gameQuestionQueryKeys } from '../../game-questions/index.ts'
import { gameSetupDraftQueryOptions } from '../api/game-setup-queries.ts'
import {
  loadGameSetupDraftQueryState,
  type LoadedGameSetupDraftState,
} from '../model/game-setup-query-state.ts'
import { selectNewerGameSetupState } from './game-setup-realtime-model.ts'

const DRAFT_CHANGED_EVENT = realtimeHubs.gameSetup.events.draftChanged

export function GameSetupRealtimeSync() {
  const queryClient = useQueryClient()
  const latestRequestIdRef = useRef(0)

  useEffect(
    () => () => {
      latestRequestIdRef.current += 1
    },
    [],
  )

  const syncFromServer = useCallback(async () => {
    const cached = queryClient.getQueryData<LoadedGameSetupDraftState>(
      gameSetupDraftQueryOptions.queryKey,
    )
    const requestId = Math.max(latestRequestIdRef.current, cached?.requestId ?? 0) + 1
    latestRequestIdRef.current = requestId

    void refreshRealtimeQueries(queryClient, gameQuestionQueryKeys.all).catch((error) => {
      logger.warn('Game setup question catalog resync failed', error)
    })
    const loaded = await loadGameSetupDraftQueryState(requestId).catch((error) => {
      logger.warn('Game setup realtime resync failed', error)
      return null
    })
    if (!loaded || requestId !== latestRequestIdRef.current) {
      return
    }

    queryClient.setQueryData<LoadedGameSetupDraftState>(
      gameSetupDraftQueryOptions.queryKey,
      (current) => {
        if (
          current?.snapshot?.gameId !== cached?.snapshot?.gameId &&
          current?.snapshot?.gameId !== loaded.snapshot?.gameId
        )
          return current
        return selectNewerGameSetupState(current, loaded)
      },
    )
  }, [queryClient])

  const registerEventHandlers = useCallback(
    (connection: HubConnection) => {
      const handleDraftChanged = () => {
        logger.debug('Game setup realtime event received')
        void syncFromServer()
      }

      connection.on(DRAFT_CHANGED_EVENT, handleDraftChanged)

      return () => {
        connection.off(DRAFT_CHANGED_EVENT, handleDraftChanged)
      }
    },
    [syncFromServer],
  )

  useSignalrHubSubscription({
    hub: 'gameSetup',
    logLabel: 'Game setup',
    onConnected: syncFromServer,
    registerEventHandlers,
  })

  return null
}
