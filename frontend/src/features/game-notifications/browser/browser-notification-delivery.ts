import {
  getBrowserNotificationPreference,
  supportsBrowserNotifications,
} from './browser-notification-preferences.ts'

export interface BrowserNotificationItem {
  id: string
  title: string
  body: string
  path: string
}

export async function prepareBrowserNotifications() {
  const registration = await navigator.serviceWorker.register('/browser-notifications.js', {
    scope: '/panel/',
  })
  if (registration.active) return registration
  const worker = registration.installing ?? registration.waiting
  if (!worker) throw new Error('Notification worker unavailable')
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(
      () => finish(new Error('Notification worker activation timed out')),
      10_000,
    )
    const check = () => {
      if (worker.state === 'activated') finish()
      else if (worker.state === 'redundant')
        finish(new Error('Notification worker activation failed'))
    }
    function finish(error?: Error) {
      clearTimeout(timer)
      worker?.removeEventListener('statechange', check)
      if (error) reject(error)
      else resolve()
    }
    worker.addEventListener('statechange', check)
    check()
  })
  return registration
}

export async function closeBrowserNotifications(userId: string) {
  if (!supportsBrowserNotifications()) return
  const registration = await navigator.serviceWorker.getRegistration('/panel/')
  const notifications = (await registration?.getNotifications()) ?? []
  for (const notification of notifications) {
    if (notification.tag.startsWith(`deadmans:${userId}:`)) notification.close()
  }
}

function canNotifyInBackground(worker: ServiceWorker) {
  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel()
    const finish = (allowed: boolean) => {
      clearTimeout(timer)
      channel.port1.close()
      resolve(allowed)
    }
    const timer = window.setTimeout(() => finish(false), 2_000)
    channel.port1.onmessage = (event: MessageEvent<unknown>) => finish(event.data === true)
    worker.postMessage({ type: 'deadmans:notification-background' }, [channel.port2])
  })
}

export async function deliverBrowserNotifications(
  userId: string,
  epoch: string | null,
  items: BrowserNotificationItem[],
  isCurrent: () => boolean,
) {
  if (!epoch || !supportsBrowserNotifications() || items.length === 0) return
  try {
    await navigator.locks.request(`deadmans:notifications:${userId}`, async () => {
      const allowed = () =>
        isCurrent() &&
        Notification.permission === 'granted' &&
        getBrowserNotificationPreference(userId) === epoch
      if (!allowed()) return
      const registration = await navigator.serviceWorker.getRegistration('/panel/')
      if (!registration?.active || !allowed()) return
      // Only event identities are retained, never notification text or team names.
      const key = `deadmans:notification-receipts:${userId}`
      const raw: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
      const receipts = Array.isArray(raw)
        ? raw.filter((id): id is string => typeof id === 'string')
        : []
      for (const item of items) {
        if (!allowed() || receipts.includes(item.id)) continue
        receipts.push(item.id)
        localStorage.setItem(key, JSON.stringify(receipts.slice(-1000)))
        if (!(await canNotifyInBackground(registration.active)) || !allowed()) continue
        const tag = `deadmans:${userId}:${item.id}`
        await registration.showNotification(item.title, {
          body: item.body,
          tag,
          silent: true,
          data: { path: item.path },
        })
        if (!allowed()) {
          for (const notification of await registration.getNotifications({ tag }))
            notification.close()
        }
      }
    })
  } catch {
    // Browser delivery is optional. The authoritative unread list remains available.
  }
}
