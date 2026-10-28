import { expect, type Page, type WebSocketRoute } from '@playwright/test'
import type { GameUserNotification } from '../../src/shared/api/contracts/index.ts'

export async function setupNotificationFixture(page: Page, locale = 'ru') {
  await page.addInitScript((language) => localStorage.setItem('i18nextLng', language), locale)
  let notifications: GameUserNotification[] = []
  let socket: WebSocketRoute | undefined
  let connected = false
  let reads = 0
  await page.routeWebSocket(/\/hubs\/game-board(?:\?|$)/, (ws) => {
    socket = ws
    ws.onMessage((message) => {
      if (message.toString().includes('"protocol"')) {
        ws.send('{}\u001e')
        connected = true
      }
    })
  })
  await page.route(
    (url) =>
      url.pathname === '/auth/me' ||
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/hubs/'),
    async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'a518e557-2910-4111-97fb-86eb7a079101',
            displayName: 'Hunter',
            roles: ['viewer'],
          },
        })
      if (path.endsWith('/negotiate'))
        return route.fulfill({
          json: {
            negotiateVersion: 1,
            connectionId: 'notifications',
            connectionToken: 'notifications',
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }],
          },
        })
      if (path === '/api/game')
        return route.fulfill({
          json: {
            gameId: 'game',
            title: 'Game',
            status: 'ready',
            version: 1,
            rows: 1,
            cols: 1,
            cells: [],
            rowLabels: ['A'],
            colLabels: ['1'],
          },
        })
      if (path === '/api/game/registration')
        return route.fulfill({
          json: {
            gameId: 'game',
            gameStatus: 'ready',
            minPlayersPerTeam: 1,
            maxPlayersPerTeam: 2,
            teams: [],
            teamSlots: [],
            myTeam: null,
            myPendingInvitations: [],
            myOutgoingInvitations: [],
            canInvitePlayersToMyTeam: false,
            invitablePlayers: [],
          },
        })
      if (path === '/api/game/notifications') {
        reads++
        return route.fulfill({ json: notifications })
      }
      if (path === '/api/game/notifications/read') {
        notifications = []
        return route.fulfill({ status: 204 })
      }
      return route.fulfill({ status: 204 })
    },
  )
  return {
    get connected() {
      return connected
    },
    get reads() {
      return reads
    },
    get notifications() {
      return notifications
    },
    set notifications(value: GameUserNotification[]) {
      notifications = value
    },
    async emit(event = 'registrationChanged') {
      await expect.poll(() => connected).toBe(true)
      const before = reads
      socket?.send(JSON.stringify({ type: 1, target: event, arguments: [] }) + '\u001e')
      await expect.poll(() => reads).toBeGreaterThan(before)
    },
    disconnect() {
      socket?.close()
    },
  }
}
