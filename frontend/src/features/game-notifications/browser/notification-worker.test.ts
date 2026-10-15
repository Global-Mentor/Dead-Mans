import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

function workerHarness(foreground: boolean, hasClient = true) {
  const focused = { focus: vi.fn(async () => {}) }
  const client = {
    url: 'https://deadmans.test/panel/settings',
    focused: foreground,
    visibilityState: foreground ? 'visible' : 'hidden',
    navigate: vi.fn(async () => focused),
  }
  const openWindow = vi.fn(async () => {})
  const handlers = new Map<string, (event: object) => void>()
  runInNewContext(readFileSync('public/browser-notifications.js', 'utf8'), {
    URL,
    self: {
      addEventListener: (name: string, handler: (event: object) => void) =>
        handlers.set(name, handler),
      clients: {
        get: async () => (hasClient ? client : null),
        matchAll: async () => (hasClient ? [client] : []),
        openWindow,
      },
    },
  })
  return {
    client,
    focused,
    openWindow,
    async dispatch(name: string, data: object) {
      let pending = Promise.resolve()
      handlers.get(name)?.({
        ...data,
        waitUntil: (work: Promise<void>) => {
          pending = work
        },
      })
      await pending
    },
  }
}

describe('notification worker', () => {
  it.each([true, false])(
    'only allows delivery when no app window is focused (%s)',
    async (foreground) => {
      const worker = workerHarness(foreground)
      const postMessage = vi.fn()
      await worker.dispatch('message', {
        data: { type: 'deadmans:notification-background' },
        source: { id: 'tab' },
        ports: [{ postMessage }],
      })
      expect(postMessage).toHaveBeenCalledWith(!foreground)
    },
  )

  it('rejects a delivery request whose source tab has closed', async () => {
    const worker = workerHarness(false, false)
    const postMessage = vi.fn()
    await worker.dispatch('message', {
      data: { type: 'deadmans:notification-background' },
      source: { id: 'closed-tab' },
      ports: [{ postMessage }],
    })
    expect(postMessage).toHaveBeenCalledWith(false)
  })

  it('focuses the navigated app window on click without marking a notification read', async () => {
    const worker = workerHarness(false)
    const close = vi.fn()
    await worker.dispatch('notificationclick', {
      notification: { close, data: { path: '/panel/game-application' } },
    })
    expect(close).toHaveBeenCalledOnce()
    expect(worker.client.navigate).toHaveBeenCalledWith('/panel/game-application')
    expect(worker.focused.focus).toHaveBeenCalledOnce()
    expect(worker.openWindow).not.toHaveBeenCalled()
  })

  it('opens the target when no app tab remains and refuses arbitrary URLs', async () => {
    const worker = workerHarness(false, false)
    await worker.dispatch('notificationclick', {
      notification: { close: vi.fn(), data: { path: 'https://other.test/' } },
    })
    expect(worker.openWindow).not.toHaveBeenCalled()
    await worker.dispatch('notificationclick', {
      notification: { close: vi.fn(), data: { path: '/panel/game-modifiers' } },
    })
    expect(worker.openWindow).toHaveBeenCalledExactlyOnceWith('/panel/game-modifiers')
  })
})
