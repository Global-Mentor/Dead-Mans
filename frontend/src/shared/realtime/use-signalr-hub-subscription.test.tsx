import { cleanup, render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SignalrConnectionProvider } from './SignalrConnectionProvider.tsx'
import {
  calculateSignalrRetryDelay,
  type SignalrHubSubscriptionOptions,
} from './signalr-connection-manager.ts'
import { useSignalrHubSubscription } from './use-signalr-hub-subscription.ts'

const signalrMocks = vi.hoisted(() => {
  const connections: Array<{
    state: string
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
    onreconnecting: ReturnType<typeof vi.fn>
    onreconnected: ReturnType<typeof vi.fn>
    onclose: ReturnType<typeof vi.fn>
  }> = []
  const withUrl = vi.fn()
  const withAutomaticReconnect = vi.fn()
  const startOutcomes: Array<Error | Promise<void> | undefined> = []

  const createConnection = () => {
    const connection = {
      state: 'Disconnected',
      start: vi.fn(async () => {
        connection.state = 'Connecting'
        const outcome = startOutcomes.shift()
        if (outcome) {
          try {
            if (outcome instanceof Error) {
              throw outcome
            }
            await outcome
          } catch (error) {
            connection.state = 'Disconnected'
            throw error
          }
        }
        if (connection.state !== 'Disconnected') {
          connection.state = 'Connected'
        }
      }),
      stop: vi.fn(async () => {
        connection.state = 'Disconnected'
      }),
      onreconnecting: vi.fn(),
      onreconnected: vi.fn(),
      onclose: vi.fn(),
    }
    connections.push(connection)
    return connection
  }

  return { connections, createConnection, startOutcomes, withAutomaticReconnect, withUrl }
})

const loggerMocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: class {
    withUrl(...args: unknown[]) {
      signalrMocks.withUrl(...args)
      return this
    }

    withAutomaticReconnect(...args: unknown[]) {
      signalrMocks.withAutomaticReconnect(...args)
      return this
    }

    build() {
      return signalrMocks.createConnection()
    }
  },
  HubConnectionState: {
    Connected: 'Connected',
    Disconnected: 'Disconnected',
  },
}))

vi.mock('../lib/logger.ts', () => ({
  logger: loggerMocks,
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  signalrMocks.connections.length = 0
  signalrMocks.startOutcomes.length = 0
})

function Provider({ children }: { children: ReactNode }) {
  return <SignalrConnectionProvider>{children}</SignalrConnectionProvider>
}

function Subscriber(options: SignalrHubSubscriptionOptions) {
  useSignalrHubSubscription(options)
  return null
}

describe('useSignalrHubSubscription', () => {
  it('shares one connection between subscribers of the same hub', async () => {
    const firstOnConnected = vi.fn().mockResolvedValue(undefined)
    const secondOnConnected = vi.fn().mockResolvedValue(undefined)
    const firstCleanup = vi.fn()
    const secondCleanup = vi.fn()
    const firstRegister = vi.fn(() => firstCleanup)
    const secondRegister = vi.fn(() => secondCleanup)

    const view = render(
      <Provider>
        <Subscriber
          key="notifications"
          hub="gameBoard"
          logLabel="Notifications"
          onConnected={firstOnConnected}
          registerEventHandlers={firstRegister}
        />
        <Subscriber
          key="game-board"
          hub="gameBoard"
          logLabel="Game board"
          onConnected={secondOnConnected}
          registerEventHandlers={secondRegister}
        />
      </Provider>,
    )

    await waitFor(() => {
      expect(firstOnConnected).toHaveBeenCalledOnce()
      expect(secondOnConnected).toHaveBeenCalledOnce()
    })

    expect(signalrMocks.connections).toHaveLength(1)
    const connection = signalrMocks.connections[0]!
    expect(connection.start).toHaveBeenCalledOnce()
    expect(signalrMocks.withUrl).toHaveBeenCalledOnce()
    expect(signalrMocks.withUrl).toHaveBeenCalledWith('http://localhost:5285/hubs/game-board', {
      withCredentials: true,
    })
    expect(signalrMocks.withAutomaticReconnect).toHaveBeenCalledOnce()
    expect(firstRegister).toHaveBeenCalledWith(connection)
    expect(secondRegister).toHaveBeenCalledWith(connection)

    view.rerender(
      <Provider>
        <Subscriber
          key="game-board"
          hub="gameBoard"
          logLabel="Game board"
          onConnected={secondOnConnected}
          registerEventHandlers={secondRegister}
        />
      </Provider>,
    )

    expect(firstCleanup).toHaveBeenCalledOnce()
    expect(connection.stop).not.toHaveBeenCalled()

    view.unmount()
    await waitFor(() => {
      expect(secondCleanup).toHaveBeenCalledOnce()
      expect(connection.stop).toHaveBeenCalledOnce()
    })
  })

  it('syncs a subscriber that mounts after the shared connection is established', async () => {
    const firstOnConnected = vi.fn().mockResolvedValue(undefined)
    const secondOnConnected = vi.fn().mockResolvedValue(undefined)
    const firstRegister = vi.fn(() => vi.fn())
    const secondRegister = vi.fn(() => vi.fn())

    const view = render(
      <Provider>
        <Subscriber
          hub="gameBoard"
          logLabel="Notifications"
          onConnected={firstOnConnected}
          registerEventHandlers={firstRegister}
        />
      </Provider>,
    )
    await waitFor(() => expect(firstOnConnected).toHaveBeenCalledOnce())

    view.rerender(
      <Provider>
        <Subscriber
          hub="gameBoard"
          logLabel="Notifications"
          onConnected={firstOnConnected}
          registerEventHandlers={firstRegister}
        />
        <Subscriber
          hub="gameBoard"
          logLabel="Quiz"
          onConnected={secondOnConnected}
          registerEventHandlers={secondRegister}
        />
      </Provider>,
    )

    await waitFor(() => expect(secondOnConnected).toHaveBeenCalledOnce())
    expect(signalrMocks.connections).toHaveLength(1)
    expect(signalrMocks.connections[0]!.start).toHaveBeenCalledOnce()
  })

  it('keeps the connection when the last subscriber is replaced in the same render', async () => {
    const firstOnConnected = vi.fn().mockResolvedValue(undefined)
    const secondOnConnected = vi.fn().mockResolvedValue(undefined)
    const firstCleanup = vi.fn()
    const registerFirst = vi.fn(() => firstCleanup)
    const registerSecond = vi.fn(() => vi.fn())

    const view = render(
      <Provider>
        <Subscriber
          key="first"
          hub="gameSetup"
          logLabel="First setup page"
          onConnected={firstOnConnected}
          registerEventHandlers={registerFirst}
        />
      </Provider>,
    )
    await waitFor(() => expect(firstOnConnected).toHaveBeenCalledOnce())

    const connection = signalrMocks.connections[0]!
    view.rerender(
      <Provider>
        <Subscriber
          key="second"
          hub="gameSetup"
          logLabel="Second setup page"
          onConnected={secondOnConnected}
          registerEventHandlers={registerSecond}
        />
      </Provider>,
    )

    await waitFor(() => expect(secondOnConnected).toHaveBeenCalledOnce())
    expect(firstCleanup).toHaveBeenCalledOnce()
    expect(signalrMocks.connections).toHaveLength(1)
    expect(connection.start).toHaveBeenCalledOnce()
    expect(connection.stop).not.toHaveBeenCalled()
  })

  it('keeps separately authorized hubs on separate connections', async () => {
    const register = vi.fn(() => vi.fn())
    const gameBoardConnected = vi.fn().mockResolvedValue(undefined)
    const gameSetupConnected = vi.fn().mockResolvedValue(undefined)

    render(
      <Provider>
        <Subscriber
          hub="gameBoard"
          logLabel="Game board"
          onConnected={gameBoardConnected}
          registerEventHandlers={register}
        />
        <Subscriber
          hub="gameSetup"
          logLabel="Game setup"
          onConnected={gameSetupConnected}
          registerEventHandlers={register}
        />
      </Provider>,
    )

    await waitFor(() => {
      expect(gameBoardConnected).toHaveBeenCalledOnce()
      expect(gameSetupConnected).toHaveBeenCalledOnce()
    })

    expect(signalrMocks.connections).toHaveLength(2)
    expect(signalrMocks.withUrl).toHaveBeenCalledWith('http://localhost:5285/hubs/game-board', {
      withCredentials: true,
    })
    expect(signalrMocks.withUrl).toHaveBeenCalledWith('http://localhost:5285/hubs/game-setup', {
      withCredentials: true,
    })
  })

  it('resyncs every active subscriber after reconnect without coupling their failures', async () => {
    const failedSync = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('resync failed'))
    const healthySync = vi.fn().mockResolvedValue(undefined)
    const register = vi.fn(() => vi.fn())

    render(
      <Provider>
        <Subscriber
          hub="gameBoard"
          logLabel="Failed subscriber"
          onConnected={failedSync}
          registerEventHandlers={register}
        />
        <Subscriber
          hub="gameBoard"
          logLabel="Healthy subscriber"
          onConnected={healthySync}
          registerEventHandlers={register}
        />
      </Provider>,
    )
    await waitFor(() => expect(healthySync).toHaveBeenCalledOnce())

    const handleReconnected = signalrMocks.connections[0]!.onreconnected.mock.calls[0]?.[0]
    await expect(handleReconnected?.()).resolves.toBeUndefined()

    expect(failedSync).toHaveBeenCalledTimes(2)
    expect(healthySync).toHaveBeenCalledTimes(2)
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      'Failed subscriber realtime reconnected resync failed',
      expect.any(Error),
    )
  })

  it('retries an initial connection failure with bounded exponential backoff', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    signalrMocks.startOutcomes.push(new Error('network down'), undefined)
    const onConnected = vi.fn().mockResolvedValue(undefined)

    render(
      <Provider>
        <Subscriber
          hub="gameBoard"
          logLabel="Game board"
          onConnected={onConnected}
          registerEventHandlers={() => vi.fn()}
        />
      </Provider>,
    )

    await vi.waitFor(() => {
      expect(signalrMocks.connections[0]!.start).toHaveBeenCalledOnce()
      expect(loggerMocks.error).toHaveBeenCalledWith(
        'SignalR gameBoard failed to start',
        expect.any(Error),
      )
    })

    expect(calculateSignalrRetryDelay(0, 0.5)).toBe(750)
    await vi.advanceTimersByTimeAsync(750)

    await vi.waitFor(() => {
      expect(signalrMocks.connections[0]!.start).toHaveBeenCalledTimes(2)
      expect(onConnected).toHaveBeenCalledOnce()
    })
  })

  it('restarts after automatic reconnect closes the connection', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const onConnected = vi.fn().mockResolvedValue(undefined)

    render(
      <Provider>
        <Subscriber
          hub="gameBoard"
          logLabel="Game board"
          onConnected={onConnected}
          registerEventHandlers={() => vi.fn()}
        />
      </Provider>,
    )

    await vi.waitFor(() => {
      expect(signalrMocks.connections[0]!.start).toHaveBeenCalledOnce()
      expect(onConnected).toHaveBeenCalledOnce()
    })

    const connection = signalrMocks.connections[0]!
    connection.state = 'Disconnected'
    const handleClosed = connection.onclose.mock.calls[0]?.[0]
    handleClosed?.(new Error('automatic reconnect exhausted'))

    expect(loggerMocks.warn).toHaveBeenCalledWith(
      'SignalR gameBoard connection closed',
      expect.any(Error),
    )

    await vi.advanceTimersByTimeAsync(750)
    await vi.waitFor(() => {
      expect(connection.start).toHaveBeenCalledTimes(2)
      expect(onConnected).toHaveBeenCalledTimes(2)
    })
  })

  it('stops a pending connection when its last subscriber unmounts', async () => {
    let finishStart: (() => void) | undefined
    const pendingStart = new Promise<void>((resolve) => {
      finishStart = resolve
    })
    signalrMocks.startOutcomes.push(pendingStart)
    const onConnected = vi.fn().mockResolvedValue(undefined)

    const view = render(
      <Provider>
        <Subscriber
          hub="gameBoard"
          logLabel="Game board"
          onConnected={onConnected}
          registerEventHandlers={() => vi.fn()}
        />
      </Provider>,
    )

    const connection = signalrMocks.connections[0]!
    await waitFor(() => {
      expect(connection.start).toHaveBeenCalledOnce()
      expect(connection.state).toBe('Connecting')
    })

    view.unmount()
    await waitFor(() => expect(connection.stop).toHaveBeenCalledOnce())

    finishStart?.()
    await Promise.resolve()
    await Promise.resolve()

    expect(onConnected).not.toHaveBeenCalled()
    expect(connection.stop).toHaveBeenCalledOnce()
  })
})
