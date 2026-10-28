import { act, cleanup, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameNotificationRealtimeSync } from './GameNotificationRealtimeSync.tsx'
import { gameNotificationsQueryOptions } from './api/game-notification-queries.ts'
import {
  closeBrowserNotifications,
  deliverBrowserNotifications,
} from './browser/browser-notification-delivery.ts'
import { StrictMode } from 'react'
import type { SignalrHubSubscriptionOptions } from '../../shared/realtime/signalr-connection-manager.ts'

const mock = vi.hoisted(() => ({
  subscription: null as SignalrHubSubscriptionOptions | null,
  refresh: async () => {},
}))
vi.mock('../../shared/realtime/index.ts', () => ({
  realtimeHubs: {
    gameBoard: {
      events: {
        userNotificationCreated: 'userNotificationCreated',
        userNotificationsRead: 'userNotificationsRead',
        registrationChanged: 'registrationChanged',
      },
    },
  },
  useSignalrHubSubscription: (options: SignalrHubSubscriptionOptions) => {
    mock.subscription = options
  },
}))
vi.mock('../../shared/realtime/refresh-realtime-queries.ts', () => ({
  refreshRealtimeQueries: () => mock.refresh(),
}))
vi.mock('./browser/browser-notification-preferences.ts', () => ({
  getBrowserNotificationPreference: () => 'enabled',
}))
vi.mock('./browser/browser-notification-delivery.ts', () => ({
  deliverBrowserNotifications: vi.fn(),
  closeBrowserNotifications: vi.fn(async () => {}),
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

beforeEach(() => {
  vi.clearAllMocks()
  mock.refresh = async () => {}
})
afterEach(cleanup)

describe('live browser notification synchronization', () => {
  it('closes the old account notifications on account change, without closing them on StrictMode replay', async () => {
    const client = new QueryClient()
    const view = (userId: string) => (
      <StrictMode>
        <QueryClientProvider client={client}>
          <GameNotificationRealtimeSync userId={userId} canSeeStaffNotifications={false} />
        </QueryClientProvider>
      </StrictMode>
    )
    const { rerender, unmount } = render(view('first'))
    await act(async () => {})
    expect(closeBrowserNotifications).not.toHaveBeenCalled()
    rerender(view('second'))
    await waitFor(() => expect(closeBrowserNotifications).toHaveBeenCalledExactlyOnceWith('first'))
    unmount()
    await waitFor(() => expect(closeBrowserNotifications).toHaveBeenLastCalledWith('second'))
  })

  function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const setNotices = (ids: string[]) =>
      client.setQueryData(
        gameNotificationsQueryOptions.queryKey,
        ids.map((notificationId) => ({
          notificationId,
          type: 'team_member_removed',
          createdAtUtc: '2026-10-15T12:00:00Z',
          teamName: 'Hunters',
        })),
      )
    render(
      <QueryClientProvider client={client}>
        <GameNotificationRealtimeSync userId="user" canSeeStaffNotifications={false} />
      </QueryClientProvider>,
    )
    const handlers = new Map<string, () => void>()
    const connection = {
      state: 'Connected',
      on: (event: string, handler: () => void) => handlers.set(event, handler),
      off: (event: string) => handlers.delete(event),
    }
    // The production adapter only uses these three HubConnection members.
    const unsubscribe = mock.subscription!.registerEventHandlers(
      connection as Parameters<SignalrHubSubscriptionOptions['registerEventHandlers']>[0],
    )
    return { setNotices, handlers, unsubscribe }
  }

  it('keeps initial and reconnect snapshots quiet, but delivers new live events', async () => {
    const { setNotices, handlers } = setup()
    mock.refresh = async () => {
      setNotices(['old'])
    }
    await act(async () => {
      await mock.subscription!.onConnected()
    })
    expect(deliverBrowserNotifications).not.toHaveBeenCalled()
    mock.refresh = async () => {
      setNotices(['old', 'new'])
    }
    await act(async () => {
      handlers.get('registrationChanged')?.()
    })
    await waitFor(() => expect(deliverBrowserNotifications).toHaveBeenCalledOnce())
    expect(
      vi.mocked(deliverBrowserNotifications).mock.calls[0]?.[2].map((item) => item.id),
    ).toEqual(['saved:new'])
    mock.refresh = async () => {
      setNotices(['old', 'new', 'while-disconnected'])
    }
    await act(async () => {
      await mock.subscription!.onConnected()
    })
    expect(deliverBrowserNotifications).toHaveBeenCalledOnce()
  })

  it('refreshes read notifications from another session without displaying a browser notification', async () => {
    const { setNotices, handlers, unsubscribe } = setup()
    setNotices(['unread'])
    await act(async () => {
      await mock.subscription!.onConnected()
    })
    const refresh = vi.fn(async () => setNotices([]))
    mock.refresh = refresh

    await act(async () => {
      handlers.get('userNotificationsRead')?.()
    })

    expect(refresh).toHaveBeenCalledOnce()
    expect(deliverBrowserNotifications).not.toHaveBeenCalled()
    unsubscribe()
    expect(handlers.has('userNotificationsRead')).toBe(false)
  })

  it('drops a late response after unsubscribe', async () => {
    const { setNotices, handlers, unsubscribe } = setup()
    setNotices([])
    await act(async () => {
      await mock.subscription!.onConnected()
    })
    let resolve: (() => void) | undefined
    const pending = new Promise<void>((done) => {
      resolve = () => {
        setNotices(['late'])
        done()
      }
    })
    mock.refresh = () => pending
    handlers.get('userNotificationCreated')?.()
    unsubscribe()
    resolve?.()
    await act(async () => {})
    expect(deliverBrowserNotifications).not.toHaveBeenCalled()
  })
})
