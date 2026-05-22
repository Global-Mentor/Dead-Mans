import { useEffect } from 'react'
import { HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/query-keys.ts'
import { logger } from '../../../shared/lib/logger.ts'
import {
  buildRealtimeHubUrl,
  isExpectedSignalrNegotiationShutdown,
  realtimeHubs,
} from '../../../shared/realtime/index.ts'
import {
  loadGameSetupDraftQueryState,
  type LoadedGameSetupDraftState,
} from '../model/game-setup-query-state.ts'

const GAME_SETUP_HUB_URL = buildRealtimeHubUrl('gameSetup')
const DRAFT_CHANGED_EVENT = realtimeHubs.gameSetup.events.draftChanged

export function GameSetupRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let disposed = false
    const connection = new HubConnectionBuilder()
      .withUrl(GAME_SETUP_HUB_URL, { withCredentials: true })
      .withAutomaticReconnect()
      .build()

    const syncFromServer = async () => {
      const loaded = await loadGameSetupDraftQueryState().catch((error) => {
        logger.warn('Game setup realtime resync failed', error)
        return null
      })
      if (!loaded) {
        return
      }

      queryClient.setQueryData<LoadedGameSetupDraftState>(
        queryKeys.gameSetup.draftSnapshot(),
        (current) => {
          if (!current?.snapshot || !loaded.snapshot) {
            return loaded
          }

          return loaded.snapshot.version >= current.snapshot.version ? loaded : current
        },
      )
    }

    connection.onreconnecting((error) => {
      logger.warn('Game setup realtime reconnecting', error)
    })

    connection.on(DRAFT_CHANGED_EVENT, () => {
      logger.debug('Game setup realtime event received')
      void syncFromServer()
    })

    connection.onreconnected(() => {
      logger.info('Game setup realtime reconnected')
      return syncFromServer()
    })

    connection.onclose((error) => {
      if (!disposed && error) {
        logger.warn('Game setup realtime connection closed', error)
      }
    })

    const startPromise = (async () => {
      try {
        await connection.start()
        if (disposed) {
          await connection.stop()
          return
        }

        logger.info('Game setup realtime connected')
        await syncFromServer()
      } catch (error) {
        if (disposed || isExpectedSignalrNegotiationShutdown(error)) {
          return
        }

        logger.error('Game setup realtime failed to start', error)
      }
    })()

    return () => {
      disposed = true
      connection.off(DRAFT_CHANGED_EVENT)
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

