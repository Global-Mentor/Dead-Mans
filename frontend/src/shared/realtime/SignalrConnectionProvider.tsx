import { useState, type ReactNode } from 'react'
import { SignalrConnectionContext } from './signalr-connection-context.ts'
import { SignalrConnectionManager } from './signalr-connection-manager.ts'

export function SignalrConnectionProvider({ children }: { children: ReactNode }) {
  const [connectionManager] = useState(() => new SignalrConnectionManager())

  return (
    <SignalrConnectionContext.Provider value={connectionManager}>
      {children}
    </SignalrConnectionContext.Provider>
  )
}
