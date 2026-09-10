import { createContext } from 'react'
import type { SignalrConnectionManager } from './signalr-connection-manager.ts'

export const SignalrConnectionContext = createContext<SignalrConnectionManager | null>(null)
