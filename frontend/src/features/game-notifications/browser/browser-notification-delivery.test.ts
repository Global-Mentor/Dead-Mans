import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deliverBrowserNotifications } from './browser-notification-delivery.ts'
import {
  getBrowserNotificationPreference,
  setBrowserNotificationPreference,
} from './browser-notification-preferences.ts'

const item = {
  id: 'event-1',
  title: 'Team changed',
  body: 'You were moved.',
  path: '/panel/game-application',
}
let background = true
let answer: (() => void) | undefined
let holdAnswer = false
const showNotification = vi.fn(async () => {})
const getNotifications = vi.fn(async () => [])

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  background = true
  holdAnswer = false
  answer = undefined
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('Notification', { permission: 'granted' })
  vi.stubGlobal('ServiceWorkerRegistration', { prototype: { showNotification } })
  vi.stubGlobal(
    'MessageChannel',
    class {
      port1 = { onmessage: null as ((event: { data: boolean }) => void) | null, close: vi.fn() }
      port2 = { postMessage: (data: boolean) => this.port1.onmessage?.({ data }) }
    },
  )
  let tail = Promise.resolve()
  vi.stubGlobal('navigator', {
    locks: {
      request: (_key: string, callback: () => Promise<void>) => {
        const task = tail.then(callback)
        tail = task.catch(() => {})
        return task
      },
    },
    serviceWorker: {
      getRegistration: async () => ({
        active: {
          postMessage: (_message: unknown, ports: { postMessage: (data: boolean) => void }[]) => {
            answer = () => ports[0]?.postMessage(background)
            if (!holdAnswer) answer()
          },
        },
        showNotification,
        getNotifications,
      }),
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('browser notification delivery', () => {
  it('is off by default and never requests permission on event delivery', async () => {
    await deliverBrowserNotifications('user', null, [item], () => true)
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('claims an event once across concurrent tabs and uses a quiet notification', async () => {
    setBrowserNotificationPreference('user', true)
    const epoch = getBrowserNotificationPreference('user')
    await Promise.all(
      [1, 2, 3].map(() => deliverBrowserNotifications('user', epoch, [item], () => true)),
    )
    expect(showNotification).toHaveBeenCalledExactlyOnceWith(item.title, {
      body: item.body,
      tag: 'deadmans:user:event-1',
      silent: true,
      data: { path: item.path },
    })
  })

  it('consumes foreground events without replaying them after the user leaves', async () => {
    setBrowserNotificationPreference('user', true)
    const epoch = getBrowserNotificationPreference('user')
    background = false
    await deliverBrowserNotifications('user', epoch, [item], () => true)
    background = true
    await deliverBrowserNotifications('user', epoch, [item], () => true)
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('does not display an event if disabled while waiting for the other tabs', async () => {
    setBrowserNotificationPreference('user', true)
    holdAnswer = true
    const pending = deliverBrowserNotifications(
      'user',
      getBrowserNotificationPreference('user'),
      [item],
      () => true,
    )
    await vi.waitFor(() => expect(answer).toBeDefined())
    setBrowserNotificationPreference('user', false)
    answer?.()
    await pending
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('rejects obsolete sessions, opt-in epochs and another account', async () => {
    setBrowserNotificationPreference('user', true)
    const oldEpoch = getBrowserNotificationPreference('user')
    setBrowserNotificationPreference('user', false)
    setBrowserNotificationPreference('user', true)
    await deliverBrowserNotifications('user', oldEpoch, [item], () => true)
    await deliverBrowserNotifications('other', oldEpoch, [item], () => true)
    await deliverBrowserNotifications(
      'user',
      getBrowserNotificationPreference('user'),
      [item],
      () => false,
    )
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('fails quietly when permission or browser storage is unavailable', async () => {
    setBrowserNotificationPreference('user', true)
    const epoch = getBrowserNotificationPreference('user')
    vi.stubGlobal('Notification', { permission: 'denied' })
    await deliverBrowserNotifications('user', epoch, [item], () => true)
    vi.stubGlobal('Notification', { permission: 'granted' })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked')
    })
    await deliverBrowserNotifications('user', epoch, [item], () => true)
    expect(showNotification).not.toHaveBeenCalled()
  })
})
