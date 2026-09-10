import { expect, test, type Page } from '@playwright/test'

async function openTeamManagement(page: Page, state: 'eligible' | 'active' | 'stale') {
  const teamId = '76528fbb-cd51-492f-b8e6-a4330c2528ba'
  const gameId = '3f93a420-ef68-4cb0-9c39-5fa46c921001'
  let disbanded = false
  let disbandRequests = 0
  await page.addInitScript(() => window.localStorage.setItem('i18nextLng', 'en'))
  await page.route(
    (url) => url.pathname === '/auth/me' || url.pathname.startsWith('/api/'),
    async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/auth/me') {
        await route.fulfill({
          status: 200,
          json: {
            userId: 'abf3680b-ac92-43ce-8c4f-c542f806e520',
            displayName: 'Admin',
            roles: ['admin', 'viewer'],
          },
        })
      } else if (path === '/api/game') {
        await route.fulfill({
          status: 200,
          json: {
            gameId,
            title: 'Registration review',
            status: 'active',
            version: 1,
            rows: 1,
            cols: 1,
            rowLabels: ['A'],
            colLabels: ['1'],
            cells: [],
          },
        })
      } else if (path === '/api/game/registration/admin') {
        await route.fulfill({
          status: 200,
          json: {
            gameId,
            gameStatus: 'active',
            minPlayersPerTeam: 1,
            maxPlayersPerTeam: 3,
            launchSummary: {
              canStartGame: false,
              confirmedTeamsCount: disbanded ? 0 : 1,
              formingTeamsCount: 0,
              pendingInvitationsCount: 0,
              disbandRequestsCount: 0,
              invalidConfirmedRostersCount: 0,
            },
            teamSlots: [
              {
                teamSlotId: 'slot-1',
                teamSlotIndex: 1,
                teamSlotType: 'public',
                reservedLabel: null,
                isAvailableForNewTeam: disbanded,
                teamId: disbanded ? null : teamId,
                teamStatus: disbanded ? null : 'confirmed',
              },
            ],
            teams: disbanded
              ? []
              : [
                  {
                    teamId,
                    name: 'Review team',
                    teamSlotIndex: 1,
                    teamSlotType: 'public',
                    recruitmentOpen: false,
                    status: 'confirmed',
                    isPlayed: false,
                    isActiveInGame: state === 'active',
                    pendingInvitations: [],
                    members: [
                      {
                        joinedAtUtc: '2026-09-10T12:00:00Z',
                        player: {
                          userId: 'player-1',
                          login: 'player',
                          displayName: 'Review player',
                        },
                      },
                    ],
                  },
                ],
            availablePlayers: [],
          },
        })
      } else if (path === `/api/game/registration/teams/${teamId}/disband`) {
        disbandRequests += 1
        if (state === 'stale') {
          await route.fulfill({
            status: 409,
            json: {
              error: 'A team that has opened a card or is marked as played cannot be disbanded.',
              code: 'game_registration.team_already_played',
            },
          })
        } else {
          disbanded = true
          await route.fulfill({ status: 204 })
        }
      } else {
        await route.fulfill({ status: 204 })
      }
    },
  )
  await page.goto('/panel/team-registrations')
  await expect(page.getByText('Review player', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'More team actions', exact: true }).click()
  await page.getByRole('button', { name: 'Disband', exact: true }).click()
  return () => disbandRequests
}

test('disbands an eligible confirmed team and refreshes the roster', async ({ page }) => {
  const requests = await openTeamManagement(page, 'eligible')
  await page.getByRole('dialog').getByRole('button', { name: 'Disband team', exact: true }).click()
  await expect(page.getByText('Review player', { exact: true })).toHaveCount(0)
  expect(requests()).toBe(1)
})

test('shows the reason when an active team cannot be disbanded', async ({ page }) => {
  const requests = await openTeamManagement(page, 'active')
  await expect(page.getByRole('alert')).toContainText('active team cannot be disbanded')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(requests()).toBe(0)
})

test('shows a server refusal when the team opened a card after the snapshot loaded', async ({
  page,
}) => {
  const requests = await openTeamManagement(page, 'stale')
  await page.getByRole('dialog').getByRole('button', { name: 'Disband team', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('opened a card')
  await expect(page.getByText('Review player', { exact: true })).toBeVisible()
  expect(requests()).toBe(1)
})
