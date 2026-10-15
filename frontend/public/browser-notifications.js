// Supports notifications requested by an open page; no push subscription or request caching.
const allowedPaths = new Set([
  '/panel/game-application',
  '/panel/game-modifiers',
  '/panel/team-registrations',
])

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'deadmans:notification-background' || !event.ports[0]) return
  event.waitUntil(
    (async () => {
      const source = event.source?.id ? await self.clients.get(event.source.id) : null
      if (!source || !new URL(source.url).pathname.startsWith('/panel/')) {
        event.ports[0].postMessage(false)
        return
      }
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      event.ports[0].postMessage(
        !windows.some(
          (client) =>
            new URL(client.url).pathname.startsWith('/panel/') &&
            client.visibilityState === 'visible' &&
            client.focused,
        ),
      )
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { path } = event.notification.data ?? {}
  if (!allowedPaths.has(path)) return
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const source = windows.find((client) => new URL(client.url).pathname.startsWith('/panel/'))
      if (source) {
        const navigated = await source.navigate(path)
        await navigated?.focus()
      } else {
        await self.clients.openWindow(path)
      }
    })(),
  )
})
