import { expect, test, type Page } from '@playwright/test'
import { expectUnifiedTypography } from './typography-assertions.ts'

test.afterEach(async ({ page }) => {
  await expectUnifiedTypography(page)
})

async function openTeamManagement(
  page: Page,
  state: 'eligible' | 'active' | 'stale' | 'editable',
  role: 'admin' | 'moderator' = 'admin',
) {
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
            roles: [role, 'viewer'],
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
        const snapshot = {
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
        }
        if (state === 'editable') {
          const firstSlot = snapshot.teamSlots[0]!
          const firstTeam = snapshot.teams[0]!
          snapshot.teamSlots.push(
            { ...firstSlot, teamSlotId: 'slot-2', teamSlotIndex: 2, teamId: 'team-2' },
            {
              ...firstSlot,
              teamSlotId: 'slot-3',
              teamSlotIndex: 3,
              teamId: null,
              teamStatus: null,
              isAvailableForNewTeam: true,
            },
          )
          snapshot.teams.push({
            ...firstTeam,
            teamId: 'team-2',
            name: 'Second team',
            teamSlotIndex: 2,
            members: [],
          })
        }
        await route.fulfill({ status: 200, json: snapshot })
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
  if (state === 'editable') return () => disbandRequests
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

test('admin can create and reorder teams after game start', async ({ page }) => {
  await openTeamManagement(page, 'editable')
  await page.route('**/api/game/registration/admin/teams**', (route) =>
    route.fulfill({ status: 409, json: { code: 'test.conflict' } }),
  )
  const create = page.getByRole('button', { name: 'Create open team', exact: true })
  await expect(create).toBeEnabled()
  const creationRequest = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/admin/teams'),
  )
  await create.click()
  expect((await creationRequest).postDataJSON()).toMatchObject({ recruitmentOpen: true })
  const down = page.getByTestId('admin-slot-1').getByRole('button', { name: 'Down', exact: true })
  await expect(down).toBeEnabled()
  const moveRequest = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/move'),
  )
  await down.click()
  expect((await moveRequest).postDataJSON()).toMatchObject({ targetTeamSlotId: 'slot-2' })
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

for (const width of [1440, 768, 390, 320]) {
  for (const role of ['admin', 'moderator'] as const) {
    test(`${role} reviews a populated team and confirms disband at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 })
      const requests = await openTeamManagement(page, 'eligible', role)
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('button', { name: 'Disband team', exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.screenshot({
        path: info.outputPath('team-management-confirm.png'),
        fullPage: true,
        animations: 'disabled',
      })
      await dialog.getByRole('button', { name: 'Disband team', exact: true }).click()
      await expect(page.getByText('Review player', { exact: true })).toHaveCount(0)
      expect(requests()).toBe(1)
    })
  }
}
