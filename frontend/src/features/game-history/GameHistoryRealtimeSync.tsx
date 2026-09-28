import type { HubConnection } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { realtimeHubs, useSignalrHubSubscription } from '../../shared/realtime/index.ts'
import { gameHistoryQueryKeys } from './api/game-history-queries.ts'

const events = realtimeHubs.gameBoard.events
const historyEvents = [
  events.quizStateChanged,
  events.roundStateChanged,
  events.cellOpened,
  events.modifierActivated,
  events.modifierActivationCancelled,
  events.modifierAvailabilityChanged,
  events.teamStateChanged,
  events.gameLifecycleChanged,
]

export function GameHistoryRealtimeSync() {
  const queryClient = useQueryClient()
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: gameHistoryQueryKeys.all })
  }, [queryClient])
  const registerEventHandlers = useCallback(
    (connection: HubConnection) => {
      const handler = () => void refresh()
      for (const event of historyEvents) connection.on(event, handler)
      return () => {
        for (const event of historyEvents) connection.off(event, handler)
      }
    },
    [refresh],
  )

  useSignalrHubSubscription({
    hub: 'gameBoard',
    logLabel: 'Game history',
    onConnected: refresh,
    registerEventHandlers,
  })
  return null
}
