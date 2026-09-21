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
import { gameQuizQueryKeys } from '../features/game-quiz/api/game-quiz-queries.ts'

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
      const registrationHandler = () => {
        void Promise.all(
          [
            gameRegistrationSnapshotQueryOptions,
            gameRegistrationAdminSnapshotQueryOptions,
            currentGameTeamQueueQueryOptions,
          ].map(({ queryKey }) => queryClient.invalidateQueries({ queryKey })),
        )
      }
      const teamStateHandler = () => {
        void Promise.all(
          [
            currentGameBoardQueryOptions,
            currentGameTeamQueueQueryOptions,
            gameRegistrationSnapshotQueryOptions,
            gameRegistrationAdminSnapshotQueryOptions,
          ].map(({ queryKey }) => queryClient.invalidateQueries({ queryKey })),
        )
      }
      const twitchQuizHandler = () => {
        void queryClient.invalidateQueries({ queryKey: gameQuizQueryKeys.twitchIntegration() })
      }
      connection.on(eventName, handler)
      connection.on(realtimeHubs.gameBoard.events.registrationChanged, registrationHandler)
      connection.on(realtimeHubs.gameBoard.events.teamStateChanged, teamStateHandler)
      connection.on(realtimeHubs.gameBoard.events.twitchQuizStateChanged, twitchQuizHandler)
      return () => {
        connection.off(eventName, handler)
        connection.off(realtimeHubs.gameBoard.events.registrationChanged, registrationHandler)
        connection.off(realtimeHubs.gameBoard.events.teamStateChanged, teamStateHandler)
        connection.off(realtimeHubs.gameBoard.events.twitchQuizStateChanged, twitchQuizHandler)
      }
    },
    [invalidate, queryClient],
  )
  useSignalrHubSubscription({
    hub: 'gameBoard',
    logLabel: 'Game lifecycle',
    onConnected: invalidate,
    registerEventHandlers,
  })
  return null
}
