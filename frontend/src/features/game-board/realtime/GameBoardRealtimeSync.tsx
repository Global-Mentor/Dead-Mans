import { refreshRealtimeQueries } from '../../../shared/realtime/refresh-realtime-queries.ts'
import { useCallback, useEffect, useRef } from 'react'
import type { HubConnection } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import type {
  GameBoardSnapshot,
  GameLifecycleChangedEvent,
} from '../../../shared/api/contracts/index.ts'
import { logger } from '../../../shared/lib/logger.ts'
import { realtimeHubs, useSignalrHubSubscription } from '../../../shared/realtime/index.ts'
import { activeGameRoundQueryOptions } from '../../game-rounds/api/game-rounds-queries.ts'
import { gameHistoryQueryKeys } from '../../game-history/api/game-history-queries.ts'
import { gameModifierQueryKeys } from '../../game-modifiers/api/game-modifier-queries.ts'
import { fetchCurrentGameBoardSnapshot } from '../api/game-board-data-access.ts'
import { currentGameBoardQueryOptions } from '../api/game-board-queries.ts'
import { gameFinishQueryKeys } from '../api/game-finish-queries.ts'
import {
  applyCellOpenedEvent,
  applyModifierActivationCancelledEvent,
  applyModifierActivatedEvent,
  selectNewerGameBoardSnapshot,
  type CellOpenedEvent,
  type ModifierActivationCancelledEvent,
  type ModifierActivatedEvent,
} from './game-board-realtime-model.ts'

const CELL_OPENED_EVENT = realtimeHubs.gameBoard.events.cellOpened
const ROUND_STATE_CHANGED_EVENT = realtimeHubs.gameBoard.events.roundStateChanged
const MODIFIER_ACTIVATED_EVENT = realtimeHubs.gameBoard.events.modifierActivated
const MODIFIER_CANCELLED_EVENT = realtimeHubs.gameBoard.events.modifierActivationCancelled
const GAME_LIFECYCLE_CHANGED_EVENT = realtimeHubs.gameBoard.events.gameLifecycleChanged
const MODIFIER_AVAILABILITY_CHANGED_EVENT =
  realtimeHubs.gameBoard.events.modifierAvailabilityChanged

export function GameBoardRealtimeSync() {
  const queryClient = useQueryClient()
  const resyncRequest = useRef(0)

  useEffect(
    () => () => {
      resyncRequest.current += 1
    },
    [],
  )

  const syncFromServerIfNewer = useCallback(async () => {
    const request = ++resyncRequest.current
    const requestedGameId = queryClient.getQueryData<GameBoardSnapshot | null>(
      currentGameBoardQueryOptions.queryKey,
    )?.gameId
    const freshSnapshot = await fetchCurrentGameBoardSnapshot().catch((error) => {
      logger.warn('Game board realtime resync failed', error)
      return undefined
    })
    if (request !== resyncRequest.current) {
      return
    }
    if (freshSnapshot === undefined) {
      await refreshRealtimeQueries(queryClient, currentGameBoardQueryOptions.queryKey)
      return
    }

    queryClient.setQueryData<GameBoardSnapshot | null>(
      currentGameBoardQueryOptions.queryKey,
      (current) => {
        // A response started before a game switch must not restore the previous game.
        if (current?.gameId !== requestedGameId && current?.gameId !== freshSnapshot?.gameId) {
          return current
        }
        return freshSnapshot === null ? null : selectNewerGameBoardSnapshot(current, freshSnapshot)
      },
    )
  }, [queryClient])

  const reconnect = useCallback(async () => {
    await Promise.all([
      syncFromServerIfNewer(),
      refreshRealtimeQueries(queryClient, activeGameRoundQueryOptions.queryKey),
      refreshRealtimeQueries(queryClient, gameModifierQueryKeys.all),
    ])
  }, [queryClient, syncFromServerIfNewer])

  const registerEventHandlers = useCallback(
    (connection: HubConnection) => {
      const handleCellOpened = (event: CellOpenedEvent) => {
        logger.debug('Game board realtime event received', event)
        void refreshRealtimeQueries(queryClient, activeGameRoundQueryOptions.queryKey)
        void refreshRealtimeQueries(queryClient, gameHistoryQueryKeys.all)
        void refreshRealtimeQueries(queryClient, gameModifierQueryKeys.runtime())
        queryClient.setQueryData<GameBoardSnapshot | null>(
          currentGameBoardQueryOptions.queryKey,
          (current) => applyCellOpenedEvent(current, event),
        )
        void refreshRealtimeQueries(queryClient, currentGameBoardQueryOptions.queryKey)
      }

      const handleRoundStateChanged = () => {
        logger.debug('Game board round state realtime event received')
        void refreshRealtimeQueries(queryClient, activeGameRoundQueryOptions.queryKey)
        void refreshRealtimeQueries(queryClient, currentGameBoardQueryOptions.queryKey)
        void refreshRealtimeQueries(queryClient, gameHistoryQueryKeys.all)
        void refreshRealtimeQueries(queryClient, gameModifierQueryKeys.runtime())
      }

      const handleModifierActivated = (event: ModifierActivatedEvent) => {
        logger.debug('Game board modifier realtime event received', event)
        void refreshRealtimeQueries(queryClient, activeGameRoundQueryOptions.queryKey)
        void refreshRealtimeQueries(queryClient, gameHistoryQueryKeys.all)
        void refreshRealtimeQueries(queryClient, gameModifierQueryKeys.runtime())
        queryClient.setQueryData<GameBoardSnapshot | null>(
          currentGameBoardQueryOptions.queryKey,
          (current) => applyModifierActivatedEvent(current, event),
        )
        void refreshRealtimeQueries(queryClient, currentGameBoardQueryOptions.queryKey)
      }

      const handleModifierCancelled = (event: ModifierActivationCancelledEvent) => {
        logger.debug('Game board modifier cancel realtime event received', event)
        void refreshRealtimeQueries(queryClient, activeGameRoundQueryOptions.queryKey)
        void refreshRealtimeQueries(queryClient, gameHistoryQueryKeys.all)
        void refreshRealtimeQueries(queryClient, gameModifierQueryKeys.runtime())
        queryClient.setQueryData<GameBoardSnapshot | null>(
          currentGameBoardQueryOptions.queryKey,
          (current) => applyModifierActivationCancelledEvent(current, event),
        )
        void refreshRealtimeQueries(queryClient, currentGameBoardQueryOptions.queryKey)
      }

      const handleGameLifecycleChanged = (event: GameLifecycleChangedEvent) => {
        logger.debug('Game lifecycle realtime event received', event)
        // MainLayout's lifecycle subscription owns shared board/registration invalidation.
        void refreshRealtimeQueries(queryClient, activeGameRoundQueryOptions.queryKey)
        void refreshRealtimeQueries(queryClient, gameHistoryQueryKeys.all)
        void refreshRealtimeQueries(queryClient, gameModifierQueryKeys.all)
        void refreshRealtimeQueries(queryClient, gameFinishQueryKeys.all)
      }

      connection.on(CELL_OPENED_EVENT, handleCellOpened)
      connection.on(ROUND_STATE_CHANGED_EVENT, handleRoundStateChanged)
      connection.on(MODIFIER_ACTIVATED_EVENT, handleModifierActivated)
      connection.on(MODIFIER_CANCELLED_EVENT, handleModifierCancelled)
      connection.on(GAME_LIFECYCLE_CHANGED_EVENT, handleGameLifecycleChanged)
      connection.on(MODIFIER_AVAILABILITY_CHANGED_EVENT, handleRoundStateChanged)

      return () => {
        connection.off(CELL_OPENED_EVENT, handleCellOpened)
        connection.off(ROUND_STATE_CHANGED_EVENT, handleRoundStateChanged)
        connection.off(MODIFIER_ACTIVATED_EVENT, handleModifierActivated)
        connection.off(MODIFIER_CANCELLED_EVENT, handleModifierCancelled)
        connection.off(GAME_LIFECYCLE_CHANGED_EVENT, handleGameLifecycleChanged)
        connection.off(MODIFIER_AVAILABILITY_CHANGED_EVENT, handleRoundStateChanged)
      }
    },
    [queryClient],
  )

  useSignalrHubSubscription({
    hub: 'gameBoard',
    logLabel: 'Game board',
    onConnected: reconnect,
    registerEventHandlers,
  })

  return null
}
