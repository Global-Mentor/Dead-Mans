import { useContext, useEffect } from 'react'
import { SignalrConnectionContext } from './signalr-connection-context.ts'
import type { SignalrHubSubscriptionOptions } from './signalr-connection-manager.ts'

export function useSignalrHubSubscription({
  hub,
  logLabel,
  onConnected,
  registerEventHandlers,
}: SignalrHubSubscriptionOptions) {
  const connectionManager = useContext(SignalrConnectionContext)
  if (!connectionManager) {
    throw new Error('useSignalrHubSubscription must be used within SignalrConnectionProvider')
  }

  useEffect(
    () =>
      connectionManager.subscribe({
        hub,
        logLabel,
        onConnected,
        registerEventHandlers,
      }),
    [connectionManager, hub, logLabel, onConnected, registerEventHandlers],
  )
}
