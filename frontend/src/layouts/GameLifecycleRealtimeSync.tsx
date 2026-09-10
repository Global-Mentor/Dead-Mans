import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  currentGameBoardQueryOptions,
  currentGameTeamQueueQueryOptions,
} from '../features/game-board/index.ts'
import { gameSetupDraftQueryOptions } from '../features/game-setup/index.ts'
import {
  gameRegistrationAdminSnapshotQueryOptions,
  gameRegistrationSnapshotQueryOptions,
} from '../features/game-registration/index.ts'
import { realtimeHubs, useSignalrHubSubscription } from '../shared/realtime/index.ts'

const eventName = realtimeHubs.gameBoard.events.gameLifecycleChanged

// Shared navigation and registration state must update even outside the board page.
export function GameLifecycleRealtimeSync() {
  const queryClient = useQueryClient()
  const invalidate = useCallback(async () => {
    await Promise.all(
      [
        currentGameBoardQueryOptions,
        currentGameTeamQueueQueryOptions,
        gameSetupDraftQueryOptions,
        gameRegistrationSnapshotQueryOptions,
        gameRegistrationAdminSnapshotQueryOptions,
      ].map(({ queryKey }) => queryClient.invalidateQueries({ queryKey })),
    )
  }, [queryClient])
  const registerEventHandlers = useCallback(
    (connection: {
      on: (name: string, handler: () => void) => void
      off: (name: string, handler: () => void) => void
    }) => {
      const handler = () => void invalidate()
      connection.on(eventName, handler)
      return () => connection.off(eventName, handler)
    },
    [invalidate],
  )
  useSignalrHubSubscription({
    hub: 'gameBoard',
    logLabel: 'Game lifecycle',
    onConnected: invalidate,
    registerEventHandlers,
  })
  return null
}
