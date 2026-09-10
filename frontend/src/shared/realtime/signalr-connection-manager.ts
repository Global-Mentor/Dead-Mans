import {
  HubConnectionBuilder,
  HubConnectionState,
  type HubConnection,
  type IRetryPolicy,
  type RetryContext,
} from '@microsoft/signalr'
import { logger } from '../lib/logger.ts'
import type { RealtimeHubKey } from './generated.ts'
import { buildRealtimeHubUrl } from './hub-url.ts'
import { isExpectedSignalrNegotiationShutdown } from './signalr-connection.ts'

const MIN_RETRY_DELAY_MS = 1_000
const MAX_RETRY_DELAY_MS = 30_000

export interface SignalrHubSubscriptionOptions {
  hub: RealtimeHubKey
  logLabel: string
  onConnected: () => Promise<void> | void
  registerEventHandlers: (connection: HubConnection) => () => void
}

interface SignalrHubSubscriber extends SignalrHubSubscriptionOptions {
  lastSyncedGeneration: number
  unregisterEventHandlers: () => void
}

type ConnectedReason = 'connected' | 'reconnected'

export function calculateSignalrRetryDelay(
  previousRetryCount: number,
  randomValue = Math.random(),
): number {
  const boundedRetryCount = Math.max(0, Math.min(previousRetryCount, 5))
  const baseDelay = Math.min(MIN_RETRY_DELAY_MS * 2 ** boundedRetryCount, MAX_RETRY_DELAY_MS)
  const jitterMultiplier = 0.5 + Math.max(0, Math.min(randomValue, 1)) * 0.5

  return Math.round(baseDelay * jitterMultiplier)
}

class SignalrReconnectRetryPolicy implements IRetryPolicy {
  nextRetryDelayInMilliseconds(retryContext: RetryContext): number {
    return calculateSignalrRetryDelay(retryContext.previousRetryCount)
  }
}

export class SignalrConnectionManager {
  private readonly connections = new Map<RealtimeHubKey, ManagedSignalrHubConnection>()

  subscribe(options: SignalrHubSubscriptionOptions): () => void {
    let managedConnection = this.connections.get(options.hub)
    if (!managedConnection) {
      managedConnection = new ManagedSignalrHubConnection(options.hub, () => {
        if (this.connections.get(options.hub) === managedConnection) {
          this.connections.delete(options.hub)
        }
      })
      this.connections.set(options.hub, managedConnection)
    }

    return managedConnection.subscribe(options)
  }
}

class ManagedSignalrHubConnection {
  private readonly hub: RealtimeHubKey
  private readonly connection: HubConnection
  private readonly subscribers = new Set<SignalrHubSubscriber>()
  private readonly onEmpty: () => void
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private startPromise: Promise<void> | null = null
  private initialRetryCount = 0
  private connectionGeneration = 0
  private disposeScheduled = false
  private disposed = false

  constructor(hub: RealtimeHubKey, onEmpty: () => void) {
    this.hub = hub
    this.onEmpty = onEmpty
    this.connection = new HubConnectionBuilder()
      .withUrl(buildRealtimeHubUrl(hub), { withCredentials: true })
      .withAutomaticReconnect(new SignalrReconnectRetryPolicy())
      .build()

    this.connection.onreconnecting((error) => {
      logger.warn(`SignalR ${this.hub} reconnecting`, error)
    })

    this.connection.onreconnected(async () => {
      logger.info(`SignalR ${this.hub} reconnected`)
      await this.notifyConnected('reconnected')
    })

    this.connection.onclose((error) => {
      if (this.disposed) {
        return
      }

      if (error) {
        logger.warn(`SignalR ${this.hub} connection closed`, error)
      }

      this.scheduleInitialRetry()
    })
  }

  subscribe(options: SignalrHubSubscriptionOptions): () => void {
    if (this.disposed) {
      throw new Error(`Cannot subscribe to disposed SignalR hub ${this.hub}.`)
    }
    this.disposeScheduled = false

    let unregisterEventHandlers: () => void
    try {
      unregisterEventHandlers = options.registerEventHandlers(this.connection)
    } catch (error) {
      if (this.subscribers.size === 0) {
        this.dispose()
      }
      throw error
    }

    const subscriber: SignalrHubSubscriber = {
      ...options,
      lastSyncedGeneration: 0,
      unregisterEventHandlers,
    }
    this.subscribers.add(subscriber)

    if (this.connection.state === HubConnectionState.Connected && this.connectionGeneration > 0) {
      void this.syncSubscriber(subscriber, this.connectionGeneration, 'connected')
    } else {
      this.ensureStarted()
    }

    let unsubscribed = false
    return () => {
      if (unsubscribed) {
        return
      }
      unsubscribed = true

      try {
        subscriber.unregisterEventHandlers()
      } catch (error) {
        logger.warn(`${subscriber.logLabel} realtime handler cleanup failed`, error)
      } finally {
        this.subscribers.delete(subscriber)
      }

      if (this.subscribers.size === 0) {
        this.scheduleDispose()
      }
    }
  }

  private scheduleDispose() {
    if (this.disposed || this.disposeScheduled) {
      return
    }

    this.disposeScheduled = true
    queueMicrotask(() => {
      if (!this.disposeScheduled) {
        return
      }

      this.disposeScheduled = false
      if (this.subscribers.size === 0) {
        this.dispose()
      }
    })
  }

  private ensureStarted() {
    if (
      this.disposed ||
      this.subscribers.size === 0 ||
      this.startPromise !== null ||
      this.connection.state !== HubConnectionState.Disconnected
    ) {
      return
    }

    const startPromise = this.startConnection()
    this.startPromise = startPromise
    void startPromise.finally(() => {
      if (this.startPromise === startPromise) {
        this.startPromise = null
      }
    })
  }

  private async startConnection() {
    try {
      await this.connection.start()
      this.clearRetryTimer()
      this.initialRetryCount = 0

      if (this.disposed || this.subscribers.size === 0) {
        await this.stopConnection()
        return
      }

      logger.info(`SignalR ${this.hub} connected`)
      await this.notifyConnected('connected')
    } catch (error) {
      if (this.disposed || isExpectedSignalrNegotiationShutdown(error)) {
        return
      }

      logger.error(`SignalR ${this.hub} failed to start`, error)
      this.scheduleInitialRetry()
    }
  }

  private scheduleInitialRetry() {
    if (this.disposed || this.subscribers.size === 0 || this.retryTimer !== null) {
      return
    }

    const retryDelay = calculateSignalrRetryDelay(this.initialRetryCount)
    this.initialRetryCount += 1
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.ensureStarted()
    }, retryDelay)
  }

  private async notifyConnected(reason: ConnectedReason) {
    if (this.disposed || this.subscribers.size === 0) {
      return
    }

    this.connectionGeneration += 1
    const generation = this.connectionGeneration
    await Promise.all(
      [...this.subscribers].map((subscriber) =>
        this.syncSubscriber(subscriber, generation, reason),
      ),
    )
  }

  private async syncSubscriber(
    subscriber: SignalrHubSubscriber,
    generation: number,
    reason: ConnectedReason,
  ) {
    if (
      this.disposed ||
      !this.subscribers.has(subscriber) ||
      subscriber.lastSyncedGeneration >= generation
    ) {
      return
    }

    subscriber.lastSyncedGeneration = generation
    try {
      await subscriber.onConnected()
    } catch (error) {
      logger.warn(`${subscriber.logLabel} realtime ${reason} resync failed`, error)
    }
  }

  private dispose() {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.clearRetryTimer()
    this.onEmpty()
    void this.stopConnection()
  }

  private clearRetryTimer() {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
  }

  private async stopConnection() {
    if (this.connection.state === HubConnectionState.Disconnected) {
      return
    }

    try {
      await this.connection.stop()
    } catch (error) {
      if (!isExpectedSignalrNegotiationShutdown(error)) {
        logger.warn(`SignalR ${this.hub} failed to stop cleanly`, error)
      }
    }
  }
}
