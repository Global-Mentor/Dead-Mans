import { refreshRealtimeQueries } from '../shared/realtime/refresh-realtime-queries.ts'
import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  currentGameBoardQueryOptions,
  currentGameTeamQueueQueryOptions,
  refreshGameLifecycle,
} from '../features/game-board/index.ts'
import {
  gameRegistrationAdminSnapshotQueryOptions,
  gameRegistrationSnapshotQueryOptions,
} from '../features/game-registration/index.ts'
import { realtimeHubs, useSignalrHubSubscription } from '../shared/realtime/index.ts'
import { gameQuizQueryKeys } from '../features/game-quiz/api/game-quiz-queries.ts'
import { gameHistoryQueryKeys } from '../features/game-history/index.ts'

const eventName = realtimeHubs.gameBoard.events.gameLifecycleChanged

// Shared navigation and registration state must update even outside the board page.
export function GameLifecycleRealtimeSync() {
  const queryClient = useQueryClient()
  const registerEventHandlers = useCallback(
    (connection: {
      on: (name: string, handler: () => void) => void
      off: (name: string, handler: () => void) => void
    }) => {
      const handler = () => void refreshGameLifecycle(queryClient)
      const registrationHandler = () => {
        void Promise.all(
          [
            gameRegistrationSnapshotQueryOptions,
            gameRegistrationAdminSnapshotQueryOptions,
            currentGameTeamQueueQueryOptions,
          ].map(({ queryKey }) => refreshRealtimeQueries(queryClient, queryKey)),
        )
      }
      const teamStateHandler = () => {
        void refreshRealtimeQueries(queryClient, gameHistoryQueryKeys.all)
        void Promise.all(
          [
            currentGameBoardQueryOptions,
            currentGameTeamQueueQueryOptions,
            gameRegistrationSnapshotQueryOptions,
            gameRegistrationAdminSnapshotQueryOptions,
          ].map(({ queryKey }) => refreshRealtimeQueries(queryClient, queryKey)),
        )
      }
      const twitchQuizHandler = () => {
        void refreshRealtimeQueries(queryClient, gameQuizQueryKeys.twitchIntegration())
      }
      const roundStateHandler = () => {
        void refreshRealtimeQueries(queryClient, currentGameTeamQueueQueryOptions.queryKey)
      }
      connection.on(eventName, handler)
      connection.on(realtimeHubs.gameBoard.events.registrationChanged, registrationHandler)
      connection.on(realtimeHubs.gameBoard.events.teamStateChanged, teamStateHandler)
      connection.on(realtimeHubs.gameBoard.events.roundStateChanged, roundStateHandler)
      connection.on(realtimeHubs.gameBoard.events.twitchQuizStateChanged, twitchQuizHandler)
      return () => {
        connection.off(eventName, handler)
        connection.off(realtimeHubs.gameBoard.events.registrationChanged, registrationHandler)
        connection.off(realtimeHubs.gameBoard.events.teamStateChanged, teamStateHandler)
        connection.off(realtimeHubs.gameBoard.events.roundStateChanged, roundStateHandler)
        connection.off(realtimeHubs.gameBoard.events.twitchQuizStateChanged, twitchQuizHandler)
      }
    },
    [queryClient],
  )
  useSignalrHubSubscription({
    hub: 'gameBoard',
    logLabel: 'Game lifecycle',
    onConnected: useCallback(() => refreshGameLifecycle(queryClient), [queryClient]),
    registerEventHandlers,
  })
  return null
}
