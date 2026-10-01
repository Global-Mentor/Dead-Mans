import { expect, test } from '@playwright/test'
import type {
  GameRegistrationSnapshot,
  RegistrationTeam,
  RegistrationInvitation,
} from '../src/shared/api/contracts/index.ts'

for (const width of [1440, 768, 390, 320]) {
  test(`application invitation flow works at ${width}px`, async ({ page }, testInfo) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.setViewportSize({ width, height: 1000 })
    await page.clock.setFixedTime(new Date('2026-09-23T12:00:00Z'))
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
    const userId = 'a518e557-2910-4111-97fb-86eb7a079101'
    const team: RegistrationTeam = {
      teamId: 'mine',
      name: 'Night watch',
      teamSlotIndex: 1,
      teamSlotType: 'public',
      recruitmentOpen: false,
      status: 'forming',
      isPlayed: false,
      isActiveInGame: false,
      isReady: false,
      members: [
        {
          player: { userId, login: 'raven', displayName: 'Raven' },
          joinedAtUtc: '2026-09-13T00:00:00Z',
        },
      ],
      pendingInvitations: [],
    }
    const invitation: RegistrationInvitation = {
      invitationId: 'invitation',
      teamId: 'mine',
      teamSlotId: 'slot',
      teamSlotIndex: 1,
      status: 'pending',
      createdAtUtc: '2026-09-23T10:00:00Z',
      invitedByDisplayName: 'Raven',
      invitedUserDisplayName: 'Ivan Petrov',
    }
    const state: GameRegistrationSnapshot = {
      gameId: 'game',
      gameStatus: 'ready',
      minPlayersPerTeam: 1,
      maxPlayersPerTeam: 2,
      teamSlots: [
        {
          teamSlotId: 'slot',
          teamSlotIndex: 1,
          teamSlotType: 'public',
          isAvailableForNewTeam: false,
        },
      ],
      teams: [team],
      myTeam: team,
      canInvitePlayersToMyTeam: true,
      invitablePlayers: [{ userId: 'candidate', login: 'ivan', displayName: 'Ivan Petrov' }],
      myOutgoingInvitations: [],
      myPendingInvitations: [],
    }
    await page.routeWebSocket(/\/hubs\//, (socket) =>
      socket.onMessage((message) => {
        if (message.toString().includes('"protocol"')) socket.send('{}\u001e')
      }),
    )
    await page.route(
      (url) =>
        url.pathname === '/auth/me' ||
        url.pathname.startsWith('/api/') ||
        url.pathname.endsWith('/negotiate'),
      async (route) => {
        const path = new URL(route.request().url()).pathname
        if (path === '/auth/me')
          return route.fulfill({ json: { userId, displayName: 'Raven', roles: ['viewer'] } })
        if (path.endsWith('/negotiate'))
          return route.fulfill({
            json: {
              negotiateVersion: 1,
              connectionId: 'invitations',
              connectionToken: 'invitations',
              availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }],
            },
          })
        if (path === '/api/game')
          return route.fulfill({
            json: {
              gameId: 'game',
              title: 'September game',
              status: 'ready',
              version: 1,
              rows: 1,
              cols: 1,
              rowLabels: ['A'],
              colLabels: ['1'],
              cells: [],
            },
          })
        if (path === '/api/game/registration') return route.fulfill({ json: state })
        return route.fulfill({ status: 204 })
      },
    )
    await page.goto('/panel/game-application')
    const search = page.getByRole('textbox', { name: 'Player', exact: true })
    await expect(search).toBeVisible()
    await search.fill('zzzz')
    await expect(page.getByText('Ivan Petrov', { exact: true })).toHaveCount(0)
    await search.fill('ivan')
    await expect(page.getByText('Ivan Petrov', { exact: true })).toBeVisible()
    state.canInvitePlayersToMyTeam = false
    state.myOutgoingInvitations = [invitation]
    team.pendingInvitations = [
      {
        invitationId: invitation.invitationId,
        createdAtUtc: invitation.createdAtUtc,
        player: state.invitablePlayers[0]!,
      },
    ]
    await page.reload()
    await expect(page.getByText(/Ivan Petrov was invited/)).toBeVisible()
    state.myTeam = null
    state.myOutgoingInvitations = []
    state.myPendingInvitations = [invitation]
    await page.reload()
    await expect(page.getByRole('button', { name: 'Accept', exact: true })).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath('incoming-invitation.png'),
      fullPage: true,
      animations: 'disabled',
    })
    expect(pageErrors).toEqual([])
  })
}
