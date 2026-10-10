import { useCallback } from 'react'
import type { HubConnection } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { gameHistoryQueryKeys } from '../game-history/api/game-history-queries.ts'
import {
  currentGameBoardQueryOptions,
  manualGameQuizAwardPlayersQueryOptions,
} from '../game-board/index.ts'
import { realtimeHubs, useSignalrHubSubscription } from '../../shared/realtime/index.ts'
import { gameQuizQueryKeys } from './api/game-quiz-queries.ts'

const QUIZ_EVENTS = [
  realtimeHubs.gameBoard.events.quizStateChanged,
  realtimeHubs.gameBoard.events.modifierActivated,
  realtimeHubs.gameBoard.events.modifierActivationCancelled,
  realtimeHubs.gameBoard.events.roundStateChanged,
]

export function GameQuizRealtimeSync() {
  const queryClient = useQueryClient()

  const syncQuizState = useCallback(
    async (includeSharedState = false) => {
      await Promise.all([
        ...(includeSharedState
          ? [
              queryClient.invalidateQueries({ queryKey: currentGameBoardQueryOptions.queryKey }),
              queryClient.invalidateQueries({ queryKey: gameHistoryQueryKeys.all }),
            ]
          : []),
        queryClient.invalidateQueries({ queryKey: gameQuizQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: manualGameQuizAwardPlayersQueryOptions.queryKey,
        }),
      ])
    },
    [queryClient],
  )

  const registerEventHandlers = useCallback(
    (connection: HubConnection) => {
      const handlers = QUIZ_EVENTS.map((event) => {
        // Board events already refresh the shared snapshot/history in GameBoardRealtimeSync.
        const handler = () =>
          void syncQuizState(event === realtimeHubs.gameBoard.events.quizStateChanged)
        connection.on(event, handler)
        return { event, handler }
      })

      return () => {
        for (const { event, handler } of handlers) connection.off(event, handler)
      }
    },
    [syncQuizState],
  )

  useSignalrHubSubscription({
    hub: 'gameBoard',
    logLabel: 'Game quiz',
    onConnected: useCallback(async () => {
      await Promise.all([
        syncQuizState(),
        queryClient.invalidateQueries({ queryKey: gameHistoryQueryKeys.all }),
      ])
    }, [queryClient, syncQuizState]),
    registerEventHandlers,
  })

  return null
}
