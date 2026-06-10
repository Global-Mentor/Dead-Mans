import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSignalrHubLifecycle } from './use-signalr-hub-lifecycle.ts'

const signalrMocks = vi.hoisted(() => {
  const connection = {
    state: 'Connected',
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    onreconnecting: vi.fn(),
    onreconnected: vi.fn(),
    onclose: vi.fn(),
  }

  const builder = {
    withUrl: vi.fn(),
    withAutomaticReconnect: vi.fn(),
    build: vi.fn(() => connection),
  }

  builder.withUrl.mockReturnValue(builder)
  builder.withAutomaticReconnect.mockReturnValue(builder)

  return { builder, connection }
})

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: class {
    withUrl(...args: unknown[]) {
      return signalrMocks.builder.withUrl(...args)
    }

    withAutomaticReconnect() {
      return signalrMocks.builder.withAutomaticReconnect()
    }

    build() {
      return signalrMocks.builder.build()
    }
  },
  HubConnectionState: {
    Disconnected: 'Disconnected',
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  signalrMocks.connection.state = 'Connected'
})

describe('useSignalrHubLifecycle', () => {
  it('owns connection lifecycle while feature handlers stay injectable', async () => {
    const onConnected = vi.fn().mockResolvedValue(undefined)
    const unregisterEventHandlers = vi.fn()
    const registerEventHandlers = vi.fn(() => unregisterEventHandlers)

    function TestComponent() {
      useSignalrHubLifecycle({
        hub: 'gameBoard',
        logLabel: 'Game board',
        onConnected,
        registerEventHandlers,
      })
      return null
    }

    const view = render(<TestComponent />)

    await waitFor(() => {
      expect(signalrMocks.connection.start).toHaveBeenCalledOnce()
      expect(onConnected).toHaveBeenCalledOnce()
    })

    expect(signalrMocks.builder.withUrl).toHaveBeenCalledWith(
      'http://localhost:5285/hubs/game-board',
      { withCredentials: true },
    )
    expect(signalrMocks.builder.withAutomaticReconnect).toHaveBeenCalledOnce()
    expect(registerEventHandlers).toHaveBeenCalledWith(signalrMocks.connection)

    const handleReconnected = signalrMocks.connection.onreconnected.mock.calls[0]?.[0]
    await handleReconnected?.()
    expect(onConnected).toHaveBeenCalledTimes(2)

    view.unmount()

    await waitFor(() => {
      expect(unregisterEventHandlers).toHaveBeenCalledOnce()
      expect(signalrMocks.connection.stop).toHaveBeenCalledOnce()
    })
  })
})
