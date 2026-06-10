import { useEffect } from 'react'
import { HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/query-keys.ts'
import type { GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'
import { logger } from '../../../shared/lib/logger.ts'
import {
  buildRealtimeHubUrl,
  isExpectedSignalrNegotiationShutdown,
  realtimeHubs,
} from '../../../shared/realtime/index.ts'
import { fetchCurrentGameBoardSnapshot } from '../api/game-board-data-access.ts'
import {
  applyCellOpenedEvent,
  type CellOpenedEvent,
  type ModifierActivatedEvent,
} from './game-board-realtime-model.ts'

const GAME_BOARD_HUB_URL = buildRealtimeHubUrl('gameBoard')
const CELL_OPENED_EVENT = realtimeHubs.gameBoard.events.cellOpened
const MODIFIER_ACTIVATED_EVENT = realtimeHubs.gameBoard.events.modifierActivated

export function GameBoardRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let disposed = false
    const connection = new HubConnectionBuilder()
      .withUrl(GAME_BOARD_HUB_URL, { withCredentials: true })
      .withAutomaticReconnect()
      .build()

    const syncFromServerIfNewer = async () => {
      const freshSnapshot = await fetchCurrentGameBoardSnapshot().catch((error) => {
        logger.warn('Game board realtime resync failed', error)
        return null
      })
      if (!freshSnapshot) {
        return
      }

      queryClient.setQueryData<GameBoardSnapshot | null>(
        queryKeys.gameBoard.currentSnapshot(),
        (current) => {
          if (!current) {
            return freshSnapshot
          }

          return freshSnapshot.version > current.version ? freshSnapshot : current
        },
      )
    }

    connection.onreconnecting((error) => {
      logger.warn('Game board realtime reconnecting', error)
    })

    connection.on(CELL_OPENED_EVENT, (event: CellOpenedEvent) => {
      logger.debug('Game board realtime event received', event)
      queryClient.setQueryData<GameBoardSnapshot | null>(
        queryKeys.gameBoard.currentSnapshot(),
        (current) => {
          const patchResult = applyCellOpenedEvent(current, event)
          if (patchResult.requiresResync) {
            void syncFromServerIfNewer()
          }

          return patchResult.nextSnapshot ?? null
        },
      )
    })

    connection.on(MODIFIER_ACTIVATED_EVENT, (event: ModifierActivatedEvent) => {
      logger.debug('Game board modifier realtime event received', event)
      void syncFromServerIfNewer()
    })

    connection.onreconnected(() => {
      logger.info('Game board realtime reconnected')
      return syncFromServerIfNewer()
    })
    connection.onclose((error) => {
      if (!disposed && error) {
        logger.warn('Game board realtime connection closed', error)
      }
    })

    const startPromise = (async () => {
      try {
        await connection.start()
        if (disposed) {
          await connection.stop()
          return
        }

        logger.info('Game board realtime connected')
        await syncFromServerIfNewer()
      } catch (error) {
        if (disposed || isExpectedSignalrNegotiationShutdown(error)) {
          return
        }

        logger.error('Game board realtime failed to start', error)
      }
    })()

    return () => {
      disposed = true
      connection.off(CELL_OPENED_EVENT)
      connection.off(MODIFIER_ACTIVATED_EVENT)
      void (async () => {
        await startPromise.catch(() => undefined)
        if (connection.state !== HubConnectionState.Disconnected) {
          await connection.stop()
        }
      })()
    }
  }, [queryClient])

  return null
}
