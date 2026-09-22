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
  realtimeHubs.gameBoard.events.twitchQuizStateChanged,
  realtimeHubs.gameBoard.events.modifierActivated,
  realtimeHubs.gameBoard.events.modifierActivationCancelled,
  realtimeHubs.gameBoard.events.roundStateChanged,
]

export function GameQuizRealtimeSync() {
  const queryClient = useQueryClient()

  const syncQuizState = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: currentGameBoardQueryOptions.queryKey }),
      queryClient.invalidateQueries({ queryKey: gameHistoryQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: gameQuizQueryKeys.all }),
      queryClient.invalidateQueries({
        queryKey: manualGameQuizAwardPlayersQueryOptions.queryKey,
      }),
    ])
  }, [queryClient])

  const registerEventHandlers = useCallback(
    (connection: HubConnection) => {
      const handleQuizStateChanged = () => {
        void syncQuizState()
      }

      for (const event of QUIZ_EVENTS) connection.on(event, handleQuizStateChanged)

      return () => {
        for (const event of QUIZ_EVENTS) connection.off(event, handleQuizStateChanged)
      }
    },
    [syncQuizState],
  )

  useSignalrHubSubscription({
    hub: 'gameBoard',
    logLabel: 'Game quiz',
    onConnected: syncQuizState,
    registerEventHandlers,
  })

  return null
}
