import { expect, test, type Page } from '@playwright/test'
import { expectUnifiedTypography } from './typography-assertions.ts'

async function openWorkspace(
  page: Page,
  roles = ['admin', 'viewer'],
  full = false,
  gameStatus: 'ready' | 'active' = 'active',
  closedFirst = false,
  pendingFirst = false,
  allConfirmed = false,
) {
  const teams = Array.from({ length: 24 }, (_, index) => ({
    teamId: 'team-' + (index + 1),
    teamSlotIndex: index + 1,
    teamSlotType: 'public',
    name:
      index === 0
        ? 'Ночной дозор'
        : index === 1
          ? 'Очень длинное название команды охотников за сокровищами'
          : 'Команда ' + (index + 1),
    status: allConfirmed || index % 2 ? 'confirmed' : 'forming',
    recruitmentOpen: index === 0 && closedFirst ? false : index % 2 === 0,
    hasOpenedCard: gameStatus === 'active' && (index === 3 || index === 5 || index === 7),
    isPlayed: gameStatus === 'active' && (index === 3 || index === 5),
    isActiveInGame: gameStatus === 'active' && index === 1,
    isReady: index % 2 === 1,
    disbandRequestedAtUtc: gameStatus === 'ready' && index === 5 ? '2026-10-07T10:00:00Z' : null,
    disbandRequestedByDisplayName: gameStatus === 'ready' && index === 5 ? 'Игрок 6' : null,
    pendingInvitations:
      pendingFirst && index === 0
        ? [
            {
              invitationId: 'invitation-first',
              player: {
                userId: 'invited',
                displayName: 'Приглашённый игрок',
                login: 'invited_login',
              },
              invitedByDisplayName: 'Admin',
              createdAtUtc: '2026-10-08T12:00:00Z',
            },
          ]
        : [],
    members: Array.from({ length: index === 5 ? 1 : 2 }, (_, member) => ({
      player: {
        userId: 'member-' + index + '-' + member,
        displayName: 'Игрок ' + (index + 1) + '.' + (member + 1),
        login: 'hunter' + index + member,
      },
      joinedAtUtc: '2026-10-07T10:00:00Z',
      readyAtUtc: member === 0 ? '2026-10-07T10:00:00Z' : null,
    })),
  }))
  const availablePlayers = Array.from({ length: 30 }, (_, index) => ({
    userId: 'free-' + index,
    displayName: 'Свободный игрок ' + (index + 1),
    login: 'free' + index,
  }))
  const slots = teams.map((team) => ({
    teamSlotId: 'slot-' + team.teamSlotIndex,
    teamSlotIndex: team.teamSlotIndex,
    teamSlotType: 'public',
    reservedLabel: null,
    isAvailableForNewTeam: false,
    teamId: team.teamId,
    teamStatus: team.status,
  }))
  const requests: { path: string; body: unknown }[] = []
  let snapshotReads = 0
  let rejectAssignment = true
  let rejectRefresh = false
  await page.addInitScript(() => window.localStorage.setItem('i18nextLng', 'ru'))
  await page.route(
    (url) => url.pathname === '/auth/me' || url.pathname.startsWith('/api/'),
    async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'abf3680b-ac92-43ce-8c4f-c542f806e520',
            displayName: 'Admin',
            roles,
          },
        })
      if (path === '/api/game')
        return route.fulfill({
          json: {
            gameId: '3f93a420-ef68-4cb0-9c39-5fa46c921001',
            title: 'Teams',
            status: gameStatus,
            version: 1,
            rows: 1,
            cols: 1,
            rowLabels: ['A'],
            colLabels: ['1'],
            cells: [],
          },
        })
      if (path === '/api/game/registration/admin') {
        snapshotReads++
        if (rejectRefresh) return route.fulfill({ status: 503, json: { error: 'Unavailable' } })
        return route.fulfill({
          json: {
            gameId: '3f93a420-ef68-4cb0-9c39-5fa46c921001',
            gameStatus,
            minPlayersPerTeam: 1,
            maxPlayersPerTeam: 3,
            launchSummary: {
              canStartGame: false,
              confirmedTeamsCount: 12,
              formingTeamsCount: 12,
              pendingInvitationsCount: 0,
              disbandRequestsCount: gameStatus === 'ready' ? 1 : 0,
              invalidConfirmedRostersCount: 0,
            },
            teams,
            teamSlots: full
              ? slots
              : [
                  ...slots,
                  {
                    teamSlotId: 'slot-free',
                    teamSlotIndex: 25,
                    teamSlotType: 'public',
                    reservedLabel: null,
                    isAvailableForNewTeam: true,
                    teamId: null,
                    teamStatus: null,
                  },
                ],
            availablePlayers,
          },
        })
      }
      if (route.request().method() === 'PATCH' && path.endsWith('/name')) {
        const team = teams.find((team) => path.includes('/' + team.teamId + '/'))!
        const body = route.request().postDataJSON() as { name: string }
        requests.push({ path, body })
        team.name = body.name
        return route.fulfill({ json: team })
      }
      if (route.request().method() === 'PUT' && path.endsWith('/played-state')) {
        const body = route.request().postDataJSON() as { isPlayed: boolean }
        requests.push({ path, body })
        const team = teams.find((team) => path.includes('/' + team.teamId + '/'))!
        team.isPlayed = body.isPlayed
        return route.fulfill({ status: 204 })
      }
      if (route.request().method() === 'POST') {
        requests.push({ path, body: route.request().postDataJSON() })
        if (path === '/api/game/registration/invitations') {
          const body = route.request().postDataJSON() as {
            teamSlotId: string
            invitedUserId: string
          }
          const slot = slots.find((slot) => slot.teamSlotId === body.teamSlotId)!
          return route.fulfill({
            json: {
              invitationId: 'invitation-new',
              teamSlotId: slot.teamSlotId,
              teamSlotIndex: slot.teamSlotIndex,
              teamId: slot.teamId,
              status: 'pending',
              createdAtUtc: '2026-10-08T12:00:00Z',
              invitedByDisplayName: 'Admin',
              invitedUserDisplayName: availablePlayers.find(
                (player) => player.userId === body.invitedUserId,
              )?.displayName,
            },
          })
        }
        if (path.endsWith('/confirm')) {
          const team = teams.find((team) => path.includes('/' + team.teamId + '/'))!
          team.status = 'confirmed'
          return route.fulfill({ json: team })
        }
        if (path.endsWith('/unconfirm')) {
          const team = teams.find((team) => path.includes('/' + team.teamId + '/'))!
          team.status = 'forming'
          return route.fulfill({ json: team })
        }
        if (path.endsWith('/move')) {
          const source = teams.find((team) => path.includes('/' + team.teamId + '/'))!
          const targetSlot = slots.find(
            (slot) => slot.teamSlotId === route.request().postDataJSON().targetTeamSlotId,
          )!
          const sourceSlot = slots.find((slot) => slot.teamId === source.teamId)!
          const target = teams.find((team) => team.teamId === targetSlot.teamId)!
          source.teamSlotIndex = targetSlot.teamSlotIndex
          target.teamSlotIndex = sourceSlot.teamSlotIndex
          sourceSlot.teamId = target.teamId
          targetSlot.teamId = source.teamId
          return route.fulfill({ json: source })
        }
        if (path.endsWith('/assign')) {
          if (rejectAssignment)
            return route.fulfill({
              status: 409,
              json: { error: 'Roster locked', code: 'game_registration.team_roster_locked' },
            })
          const { userId } = route.request().postDataJSON() as { userId: string }
          const playerIndex = availablePlayers.findIndex((player) => player.userId === userId)
          const player = availablePlayers[playerIndex]
          const team = teams.find((team) => path.includes('/' + team.teamId + '/'))
          if (team && player) {
            team.members.push({ player, joinedAtUtc: '2026-10-07T12:00:00Z', readyAtUtc: null })
            availablePlayers.splice(playerIndex, 1)
            return route.fulfill({ json: team })
          }
        }
      }
      return route.fulfill({ status: 204 })
    },
  )
  await page.goto('/panel/team-registrations')
  await expect(
    page.getByRole('button', { name: 'Управление: Ночной дозор', exact: true }),
  ).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  return {
    teams,
    requests,
    reads: () => snapshotReads,
    allowAssignment: () => {
      rejectAssignment = false
    },
    failRefresh: () => {
      rejectRefresh = true
    },
    allowRefresh: () => {
      rejectRefresh = false
    },
  }
}

test.afterEach(async ({ page }) => {
  await expectUnifiedTypography(page)
})

for (const size of [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 740 },
  { width: 1440, height: 480 },
]) {
  test(
    'teams and free players scroll internally at ' + size.width + 'x' + size.height,
    async ({ page }, testInfo) => {
      await page.setViewportSize(size)
      await openWorkspace(page)
      const region = page.getByRole('region', { name: 'Список команд', exact: true })
      await expect(region).toBeVisible()
      expect(
        await page.evaluate(() => ({
          w: document.documentElement.scrollWidth - innerWidth,
          h: document.documentElement.scrollHeight - innerHeight,
        })),
      ).toEqual({ w: 0, h: 0 })
      expect(await region.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
      const names = page.getByTestId('admin-slot-1').getByRole('listitem')
      await expect(names).toHaveCount(2)
      const first = await names.nth(0).boundingBox()
      const second = await names.nth(1).boundingBox()
      expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height - 1)
      expect(Math.abs(first!.x - second!.x)).toBeLessThanOrEqual(1)
      const nameBox = await page
        .getByTestId('admin-slot-1')
        .getByText('Ночной дозор', { exact: true })
        .boundingBox()
      expect(
        Math.abs(first!.x + first!.width / 2 - nameBox!.x - nameBox!.width / 2),
      ).toBeLessThanOrEqual(1)
      const numberBox = await page
        .getByTestId('admin-slot-1')
        .getByLabel('Команда 1', { exact: true })
        .boundingBox()
      const countBox = await page
        .getByTestId('admin-slot-1')
        .getByLabel('Состав: 2 / 3', { exact: true })
        .boundingBox()
      expect(Math.abs(numberBox!.y - nameBox!.y)).toBeLessThanOrEqual(1)
      expect(Math.abs(countBox!.y - nameBox!.y)).toBeLessThanOrEqual(1)
      expect(numberBox!.x).toBeLessThan(nameBox!.x)
      expect(countBox!.x).toBeGreaterThan(nameBox!.x)
      const statuses = page
        .getByTestId('admin-slot-6')
        .getByRole('group', { name: 'Статус', exact: true })
      await expect(statuses.getByText('Подтверждена', { exact: true })).toBeVisible()
      await expect(statuses.getByText('Отыграла', { exact: true })).toBeVisible()
      await expect(statuses.getByText('Запрос на роспуск', { exact: true })).toHaveCount(0)
      const positions = await statuses.locator('.MuiChip-root').evaluateAll((chips) =>
        chips.map((chip) => {
          const box = chip.getBoundingClientRect()
          return { y: box.y, bottom: box.bottom }
        }),
      )
      expect(positions).toHaveLength(2)
      expect(positions[1]!.y - positions[0]!.bottom).toBeGreaterThanOrEqual(4)
      expect((await statuses.boundingBox())!.height).toBe(52)
      const heights = await region
        .locator('[data-testid^="admin-slot-"]')
        .evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height))
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1)
      await expect(
        page.getByTestId('admin-slot-4').getByText('Отыграла', { exact: true }),
      ).toBeVisible()
      const search = page.getByRole('textbox', { name: 'Поиск команд и игроков' })
      const before = await search.boundingBox()
      await region.evaluate((el) => {
        el.scrollTop = el.scrollHeight
      })
      expect(await search.boundingBox()).toEqual(before)
      await region.evaluate((el) => {
        el.scrollTop = 0
      })
      if (size.width === 1440 && size.height === 900) {
        const visibleRows = await region.locator('[data-testid^="admin-slot-"]').evaluateAll(
          (rows) =>
            rows.filter((row) => {
              const r = row.getBoundingClientRect()
              const p = row.parentElement?.parentElement?.getBoundingClientRect()
              return p && r.top >= p.top && r.bottom <= p.bottom
            }).length,
        )
        expect(visibleRows).toBeGreaterThanOrEqual(6)
        expect((await page.getByTestId('admin-slot-1').boundingBox())!.height).toBeLessThanOrEqual(
          90,
        )
        const columns = await page.locator('[id$="-teams-panel"]').boundingBox()
        const details = await page.locator('[id$="-detail-panel"]').boundingBox()
        expect(
          Math.abs((columns!.x + columns!.width + details!.x) / 2 - size.width / 2),
        ).toBeLessThanOrEqual(2)
      }
      await page.screenshot({ path: testInfo.outputPath('teams.png'), animations: 'disabled' })
      if (size.width < 900) {
        await page.getByRole('tab', { name: 'Команда', exact: true }).click()
        await page.getByRole('button', { name: 'Создать команду', exact: true }).click()
        await expect(
          page.getByRole('menuitem', { name: 'Создать открытую команду', exact: true }),
        ).toBeVisible()
        await expect(
          page.getByRole('menuitem', { name: 'Создать закрытую команду', exact: true }),
        ).toBeVisible()
        await page.keyboard.press('Escape')
      }
      await page.getByRole('tab', { name: 'Игроки (30)', exact: true }).click()
      const players = page.getByRole('region', { name: 'Свободные игроки', exact: true })
      await expect(players).toBeVisible()
      expect(await players.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
      await page.getByRole('textbox', { name: 'Поиск игрока', exact: true }).fill('free29')
      await expect(page.getByText('Свободный игрок 30', { exact: true })).toBeVisible()
      await page
        .getByRole('button', { name: 'Добавить Свободный игрок 30 в команду', exact: true })
        .click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath('assign.png'), animations: 'disabled' })
    },
  )
}

for (const width of [1440, 768, 390, 320]) {
  test(
    'team actions are directly available and name controls align at ' + width + 'px',
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      const fixture = await openWorkspace(page)
      await page.getByRole('button', { name: 'Управление: Ночной дозор', exact: true }).click()
      const details = page.getByTestId('admin-team-details')
      const actions = details.getByRole('group', { name: 'Действия', exact: true })
      for (const label of ['Готово: Подтвердить', 'Распустить'])
        await expect(actions.getByRole('button', { name: label, exact: true })).toBeVisible()
      await expect(details.getByRole('button', { name: 'Другие действия' })).toHaveCount(0)
      const actionsBox = await actions.boundingBox()
      const headingBox = await details
        .getByRole('heading', { name: 'Ночной дозор', exact: true })
        .boundingBox()
      expect(actionsBox!.y + actionsBox!.height).toBeLessThanOrEqual(headingBox!.y)
      const field = details.getByRole('textbox', { name: 'Название команды' })
      await field.fill('Новый состав')
      const save = details.getByRole('button', { name: 'Сохранить', exact: true })
      await expect(save).toBeEnabled()
      const inputBox = await field.locator('..').boundingBox()
      const saveBox = await save.boundingBox()
      expect(Math.abs(inputBox!.height - saveBox!.height)).toBeLessThanOrEqual(1)
      if (width >= 600) expect(Math.abs(inputBox!.y - saveBox!.y)).toBeLessThanOrEqual(1)
      else expect(Math.abs(inputBox!.width - saveBox!.width)).toBeLessThanOrEqual(1)
      await page.screenshot({
        path: testInfo.outputPath('team-details.png'),
        animations: 'disabled',
      })
      await actions.scrollIntoViewIfNeeded()
      await page.screenshot({
        path: testInfo.outputPath('team-actions.png'),
        animations: 'disabled',
      })
      await save.click()
      await expect(save).toBeDisabled()
      await expect(
        details.getByRole('heading', { name: 'Новый состав', exact: true }),
      ).toBeVisible()
      expect(fixture.requests).toEqual([
        {
          path: '/api/game/registration/admin/teams/team-1/name',
          body: { name: 'Новый состав' },
        },
      ])
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
    },
  )
}

for (const width of [1440, 390]) {
  test(
    'registration request fits the two-row status block at ' + width + 'px',
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await openWorkspace(page, ['admin', 'viewer'], false, 'ready')
      await page.getByRole('textbox', { name: 'Поиск команд и игроков' }).fill('hunter5')
      const statuses = page
        .getByTestId('admin-slot-6')
        .getByRole('group', { name: 'Статус', exact: true })
      await expect(statuses.getByText('Подтверждена', { exact: true })).toBeVisible()
      await expect(statuses.getByText('Запрос на роспуск', { exact: true })).toBeVisible()
      await expect(statuses.locator('.MuiChip-root')).toHaveCount(2)
      expect((await statuses.boundingBox())!.height).toBe(52)
      await expect(page.getByText('Активная команда', { exact: true })).toHaveCount(0)
      await expect(
        page
          .getByRole('region', { name: 'Список команд', exact: true })
          .getByText('Отыграла', { exact: true }),
      ).toHaveCount(0)
      await page.screenshot({
        path: testInfo.outputPath('registration-statuses.png'),
        animations: 'disabled',
      })
    },
  )
}

test('local filters preserve the real queue order and reset an empty search', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const fixture = await openWorkspace(page, ['admin', 'viewer'], false, 'ready')
  const reads = fixture.reads()
  const search = page.getByRole('textbox', { name: 'Поиск команд и игроков' })
  await search.fill('hunter20')
  await expect(page.getByTestId('admin-slot-3')).toBeVisible()
  await expect(page.getByTestId('admin-slot-1')).toHaveCount(0)
  await search.fill('hunter')
  await page
    .getByTestId('admin-slot-3')
    .getByRole('button', { name: /^Порядок:/ })
    .dragTo(page.getByTestId('admin-slot-2'))
  await expect.poll(() => fixture.requests.length).toBe(1)
  expect(fixture.requests[0]).toMatchObject({
    path: '/api/game/registration/admin/teams/team-3/move',
    body: { targetTeamSlotId: 'slot-2' },
  })
  await search.fill('нет совпадений')
  await expect(page.getByText('По этим фильтрам команды не найдены.')).toBeVisible()
  await page.getByRole('button', { name: 'Сбросить фильтры' }).click()
  await expect(search).toHaveValue('')
  const afterMoveReads = fixture.reads()
  await page.getByRole('combobox', { name: /^Статус/ }).click()
  await page.getByRole('option', { name: 'Запросы на роспуск (1)', exact: true }).click()
  await expect(page.getByTestId('admin-slot-6')).toBeVisible()
  await expect(page.getByTestId('admin-slot-1')).toHaveCount(0)
  expect(fixture.reads()).toBe(afterMoveReads)
  expect(afterMoveReads).toBeGreaterThan(reads)
})

test('reset clears both searches and status without discarding the selected team draft', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const fixture = await openWorkspace(page)
  await page.getByRole('textbox', { name: 'Название команды', exact: true }).fill('Новый состав')
  await page.getByRole('textbox', { name: 'Поиск команд и игроков' }).fill('Команда')
  await page.getByRole('combobox', { name: /^Статус/ }).click()
  await page.getByRole('option', { name: 'Подтверждены', exact: true }).click()
  await page.getByRole('tab', { name: 'Игроки (30)', exact: true }).click()
  await page.getByRole('textbox', { name: 'Поиск игрока', exact: true }).fill('free29')
  const reads = fixture.reads()
  await page.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Поиск команд и игроков' })).toHaveValue('')
  await expect(page.getByRole('textbox', { name: 'Поиск игрока', exact: true })).toHaveValue('')
  await expect(page.getByRole('combobox', { name: /^Статус/ })).toContainText('Все команды')
  await expect(
    page.getByRole('region', { name: 'Свободные игроки', exact: true }).getByRole('listitem'),
  ).toHaveCount(30)
  await expect(page.locator('[data-testid^="admin-slot-"]')).toHaveCount(24)
  await page.getByRole('tab', { name: 'Команды', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Название команды', exact: true })).toHaveValue(
    'Новый состав',
  )
  await expect(page.getByText(/Показано:/)).toHaveCount(0)
  await expect(page.getByText('Очередь / Команда', { exact: true })).toHaveCount(0)
  expect(fixture.reads()).toBe(reads)
})

test('assignment keeps its target after failure, blocks duplicate submissions and refreshes on success', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const fixture = await openWorkspace(page)
  await page.getByRole('tab', { name: 'Игроки (30)', exact: true }).click()
  await page
    .getByRole('button', { name: 'Добавить Свободный игрок 1 в команду', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'В команду', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog.getByRole('combobox', { name: /^Команда/ })).toContainText('Ночной дозор')
  fixture.allowAssignment()
  let release: () => void = () => {}
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/game/registration/admin/teams/team-1/assign', async (route) => {
    await pending
    await route.fallback()
  })
  await dialog.getByRole('button', { name: 'В команду', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'В команду', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Отмена', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  release()
  await expect(dialog).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Добавить Свободный игрок 1 в команду', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('tab', { name: 'Команды (24)', exact: true }).click()
  await expect(page.getByTestId('admin-slot-1').getByText(/Свободный игрок 1/)).toBeVisible()
  expect(fixture.requests.filter((request) => request.path.endsWith('/assign'))).toHaveLength(2)
})

test('resizing preserves an unfinished team name and free-player search', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openWorkspace(page)
  await page.getByRole('button', { name: 'Управление: Ночной дозор', exact: true }).click()
  const name = page.getByRole('textbox', { name: 'Название команды' })
  await name.fill('Новый состав')
  await page.getByRole('tab', { name: 'Игроки (30)', exact: true }).click()
  await page.getByRole('textbox', { name: 'Поиск игрока', exact: true }).fill('free29')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('tab', { name: 'Команда', exact: true }).click()
  await expect(name).toHaveValue('Новый состав')
  await page.getByRole('tab', { name: 'Игроки (30)', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Поиск игрока', exact: true })).toHaveValue(
    'free29',
  )
})

test('refresh errors preserve teams, filters and unfinished names', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const fixture = await openWorkspace(page)
  const search = page.getByRole('textbox', { name: 'Поиск команд и игроков' })
  await search.fill('hunter')
  await page.getByRole('button', { name: 'Управление: Ночной дозор', exact: true }).click()
  const name = page.getByRole('textbox', { name: 'Название команды' })
  await name.fill('Новый состав')
  fixture.failRefresh()
  await page
    .getByTestId('admin-slot-1')
    .getByRole('button', { name: /^Порядок:/ })
    .dragTo(page.getByTestId('admin-slot-2'))
  await expect(page.getByRole('alert')).toContainText('Не удалось загрузить команды.', {
    timeout: 15000,
  })
  await expect(name).toHaveValue('Новый состав')
  await expect(search).toHaveValue('hunter')
  fixture.allowRefresh()
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(name).toHaveValue('Новый состав')
})

test('switching teams protects an unfinished name and selects the requested team', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openWorkspace(page)
  await page.getByRole('textbox', { name: 'Название команды' }).fill('Новый состав')
  await page
    .getByTestId('admin-slot-3')
    .getByRole('button', { name: 'Управление: Команда 3', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Название команды' })).toHaveValue('Новый состав')
  await page
    .getByTestId('admin-slot-3')
    .getByRole('button', { name: 'Управление: Команда 3', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Отменить изменения', exact: true })
    .click()
  await expect(
    page.getByTestId('admin-team-details').getByRole('heading', { name: 'Команда 3', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Название команды' })).toHaveValue('Команда 3')
})

test('a roster player can be moved using the player menu without choosing the current team', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openWorkspace(page)
  await page.getByRole('button', { name: 'Управление: Ночной дозор', exact: true }).click()
  await page.getByTestId('admin-player-member-0-0').scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('roster-mobile.png'), animations: 'disabled' })
  await page.getByRole('button', { name: 'Действия игрока Игрок 1.1', exact: true }).click()
  await page
    .getByRole('menuitem', {
      name: 'Переместить Игрок 1.1 в другую команду',
      exact: true,
    })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('combobox').click()
  await expect(page.getByRole('option', { name: /Ночной дозор/ })).toHaveCount(0)
  await expect(page.getByRole('option', { name: /Команда 3$/ })).toBeVisible()
})

test('team statuses stay visible and only team order is draggable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openWorkspace(page)
  await expect(
    page.getByTestId('admin-slot-1').getByText('Формирование', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByTestId('admin-slot-2').getByText('Подтверждена', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByTestId('admin-slot-2').getByText('Активная команда', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('[draggable="true"]')).toHaveCount(24)
  await page.getByRole('tab', { name: 'Игроки (30)', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Свободные игроки', exact: true })
      .locator('[draggable="true"]'),
  ).toHaveCount(0)
})

test('team handle drags only the order and preserves the selected editor', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const fixture = await openWorkspace(page)
  const name = page.getByRole('textbox', { name: 'Название команды' })
  await name.fill('Новый состав')
  await expect(page.getByRole('button', { name: 'Изменить порядок', exact: true })).toHaveCount(0)
  const source = page.getByTestId('admin-slot-1').getByRole('button', { name: /^Порядок:/ })
  await source.dragTo(page.getByTestId('admin-slot-3'))
  await expect.poll(() => fixture.requests.length).toBe(1)
  expect(fixture.requests[0]).toMatchObject({
    path: '/api/game/registration/admin/teams/team-1/move',
    body: { targetTeamSlotId: 'slot-3' },
  })
  await expect(
    page.getByTestId('admin-slot-3').getByText('Ночной дозор', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByTestId('admin-slot-1').getByText('Команда 3', { exact: true }),
  ).toBeVisible()
  await expect(name).toHaveValue('Новый состав')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const handle = page.getByTestId('admin-slot-3').getByRole('button', { name: /^Порядок:/ })
  await handle.dragTo(page.getByTestId('admin-slot-3'))
  expect(fixture.requests).toHaveLength(1)
})

test('order handle has no hover or click UI and blocks drag while pending or after failure', async ({
  page,
}) => {
  const fixture = await openWorkspace(page)
  let release = () => {}
  await page.route('**/api/game/registration/admin/teams/team-1/move', async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve
    })
    await route.fulfill({ status: 409, json: { code: 'game_registration.team_roster_locked' } })
  })
  const handle = page.getByTestId('admin-slot-1').getByRole('button', { name: /^Порядок:/ })
  await handle.hover()
  await expect(handle).not.toHaveAttribute('aria-describedby')
  await handle.click()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await handle.dragTo(page.getByTestId('admin-slot-2'))
  await expect(handle).toBeDisabled()
  await expect(page.locator('[draggable="true"]')).toHaveCount(0)
  release()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(handle).toBeEnabled()
  await expect(
    page.getByTestId('admin-slot-1').getByText('Ночной дозор', { exact: true }),
  ).toBeVisible()
  expect(fixture.requests).toHaveLength(0)
})

for (const role of ['admin', 'superadmin', 'moderator']) {
  test(role + ' creation capability when every configured slot is full', async ({ page }) => {
    await openWorkspace(page, [role, 'viewer'], true)
    const create = page.getByRole('button', { name: 'Создать команду', exact: true })
    if (role === 'moderator') await expect(create).toBeDisabled()
    else {
      await expect(create).toBeEnabled()
      await create.click()
      await expect(
        page.getByRole('menuitem', { name: 'Создать открытую команду', exact: true }),
      ).toBeEnabled()
      await expect(
        page.getByRole('menuitem', { name: 'Создать закрытую команду', exact: true }),
      ).toBeEnabled()
      const sent = page.waitForRequest(
        (request) =>
          request.method() === 'POST' &&
          new URL(request.url()).pathname === '/api/game/registration/admin/teams',
      )
      await page.getByRole('menuitem', { name: 'Создать открытую команду', exact: true }).click()
      expect((await sent).postDataJSON()).toMatchObject({ recruitmentOpen: true })
    }
  })
}

test('opened cards gate played state and disband errors stay inside the dialog', async ({
  page,
}, testInfo) => {
  const fixture = await openWorkspace(page)
  const details = page.getByTestId('admin-team-details')
  await page
    .getByTestId('admin-slot-2')
    .getByRole('button', { name: /^Управление:/ })
    .click()
  await expect(details.getByRole('button', { name: 'Отыграла', exact: true })).toBeDisabled()
  await expect(details.getByRole('img', { name: 'Закрытая команда', exact: true })).toBeVisible()
  await page
    .getByTestId('admin-slot-10')
    .getByRole('button', { name: /^Управление:/ })
    .click()
  await expect(details.getByRole('button', { name: 'Отыграла', exact: true })).toBeDisabled()
  await page
    .getByTestId('admin-slot-8')
    .getByRole('button', { name: /^Управление:/ })
    .click()
  await expect(details.getByRole('button', { name: 'Отыграла', exact: true })).toBeEnabled()
  await details.getByRole('button', { name: 'Отыграла', exact: true }).click()
  const playedDialog = page.getByRole('dialog')
  await expect(playedDialog).toContainText('Отметить команду как отыгравшую?')
  expect(fixture.requests).toHaveLength(0)
  await playedDialog.getByRole('button', { name: 'Отмена', exact: true }).click()
  expect(fixture.requests).toHaveLength(0)
  await details.getByRole('button', { name: 'Отыграла', exact: true }).click()
  await playedDialog.getByRole('button', { name: 'Отыграла', exact: true }).click()
  await expect(
    details.getByRole('button', { name: 'Вернуть в очередь', exact: true }),
  ).toBeEnabled()
  expect(fixture.requests[0]).toEqual({
    path: '/api/game/teams/team-8/played-state',
    body: { isPlayed: true },
  })
  await details.getByRole('button', { name: 'Вернуть в очередь', exact: true }).click()
  await expect(playedDialog).toContainText('Вернуть команду в очередь?')
  expect(fixture.requests).toHaveLength(1)
  await playedDialog.getByRole('button', { name: 'Вернуть в очередь', exact: true }).click()
  await expect(details.getByRole('button', { name: 'Отыграла', exact: true })).toBeEnabled()
  await expect(page.getByRole('alert')).toHaveCount(0, { timeout: 6000 })
  await expect(details.getByRole('button', { name: 'Распустить', exact: true })).toBeDisabled()
  await details.getByRole('button', { name: 'Распустить', exact: true }).locator('..').hover()
  await expect(page.getByRole('tooltip')).toContainText('Команда уже открывала карточку')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.screenshot({
    path: testInfo.outputPath('disband-blocked.png'),
    animations: 'disabled',
  })
})

test('team refusal is shown once and confirmation help stays in the tooltip', async ({
  page,
}, testInfo) => {
  await openWorkspace(page)
  await page.route('**/api/game/registration/teams/team-1/disband', (route) =>
    route.fulfill({
      status: 409,
      json: { error: 'Changed concurrently', code: 'game_registration.team_already_played' },
    }),
  )
  const details = page.getByTestId('admin-team-details')
  await expect(details.getByText('Команду можно подтвердить.', { exact: false })).toHaveCount(0)
  await details.getByRole('button', { name: 'Готово: Подтвердить', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText(
    'Допустить команду к игре и закрепить состав',
  )
  await expect(details.getByText(/@hunter/)).toHaveCount(0)
  await expect(details.getByText(/Очередь.*Набор/)).toHaveCount(0)
  await details.getByRole('button', { name: 'Распустить', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Ночной дозор', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Распустить команду', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Команда уже открывала карточку')
  await expect(page.getByRole('alert')).toHaveCount(1)
  await page.screenshot({
    path: testInfo.outputPath('disband-refused.png'),
    animations: 'disabled',
  })
})

test('assignment shows only the display name and a numbered team name', async ({ page }) => {
  await openWorkspace(page)
  await page.getByRole('tab', { name: 'Игроки (30)', exact: true }).click()
  await expect(
    page.getByRole('region', { name: 'Свободные игроки', exact: true }).getByText(/@free/),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Добавить Свободный игрок 1 в команду', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Свободный игрок 1', { exact: true })).toBeVisible()
  await expect(dialog.getByText(/@free/)).toHaveCount(0)
  await dialog.getByRole('combobox').click()
  await expect(
    page.getByRole('option', { name: 'Команда 1: Ночной дозор', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('option', { name: /Очередь/ })).toHaveCount(0)
})

for (const played of [false, true]) {
  test(
    'played confirmation retains errors and blocks duplicate submissions: ' + played,
    async ({ page }, testInfo) => {
      await openWorkspace(page)
      const teamNumber = played ? 6 : 8
      const label = played ? 'Вернуть в очередь' : 'Отыграла'
      await page
        .getByTestId('admin-slot-' + teamNumber)
        .getByRole('button', { name: /^Управление:/ })
        .click()
      let requests = 0
      let release: () => void = () => {}
      const hold = new Promise<void>((resolve) => {
        release = resolve
      })
      await page.route('**/api/game/teams/team-' + teamNumber + '/played-state', async (route) => {
        requests++
        if (requests > 1) return route.fallback()
        await hold
        await route.fulfill({
          status: 409,
          json: { error: 'Changed concurrently', code: 'game_board.team_played_state_active_team' },
        })
      })
      await page
        .getByTestId('admin-team-details')
        .getByRole('button', { name: label, exact: true })
        .click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByText('Команда ' + teamNumber, { exact: true })).toBeVisible()
      const confirm = dialog.getByRole('button', { name: label, exact: true })
      await confirm.dblclick()
      await expect(confirm).toBeDisabled()
      await expect(dialog.getByRole('button', { name: 'Отмена', exact: true })).toBeDisabled()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeVisible()
      expect(requests).toBe(1)
      release()
      await expect(dialog.getByRole('alert')).toContainText('активную команду')
      await expect(page.getByRole('alert')).toHaveCount(1)
      await expect(confirm).toBeEnabled()
      await page.screenshot({
        path: testInfo.outputPath('played-error.png'),
        animations: 'disabled',
      })
      await confirm.click()
      await expect(dialog).toHaveCount(0)
      await expect(page.getByRole('alert')).toHaveCount(0)
      expect(requests).toBe(2)
    },
  )
}

for (const width of [1440, 768, 390, 320]) {
  test(
    'inspector title and compact roster align at ' + width + 'px',
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await openWorkspace(page)
      await page
        .getByTestId('admin-slot-6')
        .getByRole('button', { name: /^Управление:/ })
        .click()
      const details = page.getByTestId('admin-team-details')
      const heading = details.getByRole('heading', { name: 'Команда 6', exact: true })
      const nameBox = await heading.boundingBox()
      const header = await heading.locator('..').boundingBox()
      const countBox = await details.getByLabel('Состав: 1 / 3', { exact: true }).boundingBox()
      expect(
        Math.abs(nameBox!.x + nameBox!.width / 2 - header!.x - header!.width / 2),
      ).toBeLessThanOrEqual(1)
      expect(Math.abs(nameBox!.y - countBox!.y)).toBeLessThanOrEqual(1)
      const player = details.getByTestId('admin-player-member-5-0')
      const playerBox = await player.boundingBox()
      expect(playerBox!.height).toBeLessThanOrEqual(70)
      await expect(player.getByText('Игрок 6.1', { exact: true })).toBeVisible()
      await expect(player.getByText('Готов', { exact: true })).toHaveCount(0)
      await expect(player.getByRole('button')).toHaveCount(0)
      await page.screenshot({
        path: testInfo.outputPath('compact-confirmed.png'),
        animations: 'disabled',
      })
      if (width < 1200) await page.getByRole('tab', { name: /^Команды/ }).click()
      await page
        .getByTestId('admin-slot-2')
        .getByRole('button', { name: /^Управление:/ })
        .click()
      const longName = details.getByRole('heading', { level: 3 })
      const longBox = await longName.boundingBox()
      const longHeader = await longName.locator('..').boundingBox()
      expect(
        Math.abs(longBox!.x + longBox!.width / 2 - longHeader!.x - longHeader!.width / 2),
      ).toBeLessThanOrEqual(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
    },
  )
}

test('confirmation can be cancelled before play and locked actions explain why', async ({
  page,
}, testInfo) => {
  const fixture = await openWorkspace(page)
  const details = page.getByTestId('admin-team-details')
  for (const slot of [2, 4, 8]) {
    await page
      .getByTestId('admin-slot-' + slot)
      .getByRole('button', { name: /^Управление:/ })
      .click()
    await expect(details.getByRole('button', { name: 'Распустить', exact: true })).toBeDisabled()
    await expect(
      details.getByRole('button', { name: 'Не готово: Отменить подтверждение', exact: true }),
    ).toBeDisabled()
    await details
      .getByRole('button', { name: 'Не готово: Отменить подтверждение', exact: true })
      .locator('..')
      .hover()
    await expect(
      page.getByRole('tooltip', {
        name: slot === 2 ? /Команда сейчас активна/ : /Команда уже открывала/,
      }),
    ).toBeVisible()
    await page.mouse.move(0, 0)
  }
  await page
    .getByTestId('admin-slot-10')
    .getByRole('button', { name: /^Управление:/ })
    .click()
  await details
    .getByRole('button', { name: 'Не готово: Отменить подтверждение', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Состав и готовность игроков сохранятся')
  expect(fixture.requests).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Снять', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(
    details.getByRole('button', { name: 'Готово: Подтвердить', exact: true }),
  ).toBeVisible()
  await expect(details.getByText('Игрок 10.1', { exact: true })).toBeVisible()
  await expect(details.getByText('Готов', { exact: true })).toBeVisible()
  expect(fixture.requests[0]!.path).toBe('/api/game/registration/teams/team-10/unconfirm')
  await page.screenshot({ path: testInfo.outputPath('unconfirmed.png'), animations: 'disabled' })
})

test('unconfirm failure stays in the confirmation dialog', async ({ page }) => {
  await openWorkspace(page)
  await page.route('**/api/game/registration/teams/team-10/unconfirm', (route) =>
    route.fulfill({
      status: 409,
      json: { code: 'game_registration.team_active_in_game', error: 'Changed' },
    }),
  )
  await page
    .getByTestId('admin-slot-10')
    .getByRole('button', { name: /^Управление:/ })
    .click()
  await page
    .getByTestId('admin-team-details')
    .getByRole('button', { name: 'Не готово: Отменить подтверждение', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Снять', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('активна')
  await expect(page.getByRole('alert')).toHaveCount(1)
})

for (const size of [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 740 },
  { width: 390, height: 480 },
]) {
  for (const invite of [false, true]) {
    test(
      'stable player picker at ' + size.width + 'x' + size.height + ', invite: ' + invite,
      async ({ page }, testInfo) => {
        await page.setViewportSize(size)
        const fixture = await openWorkspace(page, ['admin', 'viewer'], false, 'active', invite)
        await page
          .getByTestId('admin-slot-1')
          .getByRole('button', { name: /^Управление:/ })
          .click()
        await page
          .getByTestId('admin-team-details')
          .getByRole('button', {
            name: invite ? 'Пригласить игрока' : 'Добавить игрока',
            exact: true,
          })
          .click()
        const dialog = page.getByRole('dialog')
        const search = dialog.getByRole('textbox')
        const action = dialog.getByRole('button', {
          name: invite ? 'Пригласить' : 'Добавить игрока',
          exact: true,
        })
        const initial = {
          modal: (await dialog.boundingBox())!,
          button: (await action.boundingBox())!,
          field: (await search.boundingBox())!,
        }
        for (const query of ['неттакогоигрока', 'free1', '']) {
          await search.fill(query)
          const current = {
            modal: (await dialog.boundingBox())!,
            button: (await action.boundingBox())!,
            field: (await search.boundingBox())!,
          }
          for (const part of ['modal', 'button', 'field'] as const)
            for (const dimension of ['x', 'y', 'width', 'height'] as const)
              expect(
                Math.abs(current[part][dimension] - initial[part][dimension]),
              ).toBeLessThanOrEqual(1)
        }
        await expect(action).toBeDisabled()
        await search.fill('free1')
        await dialog.getByRole('button', { name: 'Свободный игрок 2', exact: true }).click()
        await expect(action).toBeEnabled()
        await page.screenshot({
          path: testInfo.outputPath('player-picker.png'),
          animations: 'disabled',
        })
        if (!invite) {
          await action.click()
          await expect(dialog.getByRole('alert')).toContainText(
            'Состав подтверждённой команды менять нельзя',
          )
          await expect(
            dialog.getByRole('button', { name: 'Свободный игрок 2', exact: true }),
          ).toHaveAttribute('aria-pressed', 'true')
          const errorButton = (await action.boundingBox())!
          expect(Math.abs(errorButton.y - initial.button.y)).toBeLessThanOrEqual(1)
          fixture.allowAssignment()
        }
        await action.click()
        await expect(dialog).toHaveCount(0)
        const command = fixture.requests[0]!
        expect(command.path).toBe(
          invite
            ? '/api/game/registration/invitations'
            : '/api/game/registration/admin/teams/team-1/assign',
        )
        expect(command.body).toMatchObject(
          invite ? { invitedUserId: 'free-1' } : { userId: 'free-1' },
        )
      },
    )
  }
}

for (const width of [1440, 768, 390, 320]) {
  test(
    'stable team action grid and inline player states at ' + width + 'px',
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await openWorkspace(page, ['admin', 'viewer'], false, 'active', true, true)
      await page
        .getByTestId('admin-slot-1')
        .getByRole('button', { name: /^Управление:/ })
        .click()
      const details = page.getByTestId('admin-team-details')
      const member = details.getByTestId('admin-player-member-0-0')
      const nick = member.getByText('Игрок 1.1', { exact: true })
      const menu = member.getByRole('button', { name: 'Действия игрока Игрок 1.1', exact: true })
      const state = member.getByText('Готов', { exact: true })
      const [rowBox, nickBox, menuBox, stateBox] = await Promise.all([
        member.boundingBox(),
        nick.boundingBox(),
        menu.boundingBox(),
        state.boundingBox(),
      ])
      expect(
        Math.abs(nickBox!.x + nickBox!.width / 2 - rowBox!.x - rowBox!.width / 2),
      ).toBeLessThanOrEqual(1)
      expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(nickBox!.x)
      expect(stateBox!.x).toBeGreaterThan(nickBox!.x + nickBox!.width / 2)
      expect(
        Math.abs(stateBox!.y + stateBox!.height / 2 - nickBox!.y - nickBox!.height / 2),
      ).toBeLessThanOrEqual(1)
      const invited = details.getByTestId('admin-invitation-invitation-first')
      const invitationName = await invited
        .getByText('Приглашённый игрок', { exact: true })
        .boundingBox()
      const invitationState = await invited
        .getByLabel('Ожидает подтверждения', { exact: true })
        .boundingBox()
      const cancel = await invited
        .getByRole('button', { name: 'Отменить приглашение', exact: true })
        .boundingBox()
      const invitedBox = (await invited.boundingBox())!
      expect(
        Math.abs(
          invitationName!.x + invitationName!.width / 2 - invitedBox.x - invitedBox.width / 2,
        ),
      ).toBeLessThanOrEqual(1)
      expect(invitationState!.x).toBeGreaterThan(invitationName!.x + invitationName!.width / 2)
      expect(cancel!.y).toBeGreaterThanOrEqual(
        Math.max(
          invitationName!.y + invitationName!.height,
          invitationState!.y + invitationState!.height,
        ),
      )
      const actions = details.getByRole('group', { name: 'Действия', exact: true })
      await actions.scrollIntoViewIfNeeded()
      const first = (await actions.getByRole('button').all()).map(
        async (button) => (await button.boundingBox())!,
      )
      const initial = await Promise.all(first)
      expect(initial).toHaveLength(4)
      for (const rectangle of initial)
        expect(rectangle.height).toBeLessThanOrEqual(width >= 600 ? 37 : 45)
      if (width === 1440 || width === 768) {
        for (const rectangle of initial)
          expect(Math.abs(rectangle.y - initial[0]!.y)).toBeLessThanOrEqual(1)
        expect((await actions.boundingBox())!.width).toBeGreaterThan(500)
      }
      for (const slot of [2, 4, 6, 8, 10]) {
        if (width < 1200) await page.getByRole('tab', { name: /^Команды/ }).click()
        await page
          .getByTestId('admin-slot-' + slot)
          .getByRole('button', { name: /^Управление:/ })
          .click()
        await actions.scrollIntoViewIfNeeded()
        const rectangles = await Promise.all(
          (await actions.getByRole('button').all()).map(
            async (button) => (await button.boundingBox())!,
          ),
        )
        expect(rectangles).toHaveLength(4)
        for (let index = 0; index < rectangles.length; index++) {
          for (const key of ['x', 'y', 'width', 'height'] as const)
            expect(Math.abs(rectangles[index]![key] - initial[index]![key])).toBeLessThanOrEqual(1)
        }
        await expect(details.getByText(/^(Готов|Не готов)$/)).toHaveCount(0)
      }
      if (width < 1200) await page.getByRole('tab', { name: /^Команды/ }).click()
      await page
        .getByTestId('admin-slot-1')
        .getByRole('button', { name: /^Управление:/ })
        .click()
      await invited
        .getByRole('button', { name: 'Отменить приглашение', exact: true })
        .scrollIntoViewIfNeeded()
      await page.screenshot({
        path: testInfo.outputPath('inline-roster.png'),
        animations: 'disabled',
      })
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
    },
  )
}

for (const width of [1440, 390]) {
  test(
    'assignment empty state uses centered separate lines at ' + width + 'px',
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await openWorkspace(page, ['admin', 'viewer'], false, 'active', false, false, true)
      await page.getByRole('tab', { name: /^Игроки/ }).click()
      await page
        .getByRole('button', { name: 'Добавить Свободный игрок 1 в команду', exact: true })
        .click()
      const dialog = page.getByRole('dialog')
      const nick = dialog.getByText('Свободный игрок 1', { exact: true })
      const first = dialog.getByText('Нет формирующихся команд со свободными местами.', {
        exact: true,
      })
      const second = dialog.getByText('Сначала создайте команду или освободите место.', {
        exact: true,
      })
      for (const paragraph of [nick, first, second])
        expect(await paragraph.evaluate((el) => getComputedStyle(el).textAlign)).toBe('center')
      expect(
        Number(await nick.evaluate((el) => getComputedStyle(el).fontWeight)),
      ).toBeGreaterThanOrEqual(700)
      const firstBox = (await first.boundingBox())!,
        secondBox = (await second.boundingBox())!
      expect(secondBox.y).toBeGreaterThanOrEqual(firstBox.y + firstBox.height)
      await expect(dialog.getByRole('button', { name: 'В команду', exact: true })).toBeDisabled()
      await page.screenshot({
        path: testInfo.outputPath('assignment-empty.png'),
        animations: 'disabled',
      })
    },
  )
}

for (const width of [1440, 1200, 768, 390, 320]) {
  test(
    'team workspace alignment and confirmation dialogs at ' + width + 'px',
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      const fixture = await openWorkspace(page)
      await page
        .getByTestId('admin-slot-1')
        .getByRole('button', { name: /^Управление:/ })
        .click()
      const details = page.getByTestId('admin-team-details')
      const actions = details.getByRole('group', { name: 'Действия', exact: true })
      await expect(actions.getByRole('button')).toHaveText([
        'Готово',
        'Отыграла',
        'Распустить',
        'Отклонить',
      ])
      const header = (await actions.locator('..').boundingBox())!
      for (const component of [actions.locator('..'), page.getByTestId('admin-team-briefing')]) {
        const box = (await component.boundingBox())!
        expect(Math.abs(box.x - header.x)).toBeLessThanOrEqual(1)
        expect(Math.abs(box.width - header.width)).toBeLessThanOrEqual(1)
      }
      const create = (await page
        .getByRole('button', { name: 'Создать команду', exact: true })
        .boundingBox())!
      const toolbar = (await page.getByTestId('admin-registration-toolbar').boundingBox())!
      expect(Math.abs(create.x + create.width - (toolbar.x + toolbar.width))).toBeLessThanOrEqual(1)
      expect(Math.abs(create.x + create.width - (header.x + header.width))).toBeLessThanOrEqual(1)
      if (width >= 1200) {
        const teamRow = (await page.getByTestId('admin-slot-1').boundingBox())!
        expect(Math.abs(teamRow.x - toolbar.x)).toBeLessThanOrEqual(1)
        expect(Math.abs(teamRow.width - header.width)).toBeLessThanOrEqual(1)
        expect(Math.abs(teamRow.y - create.y)).toBeLessThanOrEqual(1)
        expect(
          Math.abs((teamRow.x + teamRow.width + header.x) / 2 - width / 2),
        ).toBeLessThanOrEqual(1)
      } else {
        expect(Math.abs(header.x - toolbar.x)).toBeLessThanOrEqual(1)
        expect(Math.abs(header.width - toolbar.width)).toBeLessThanOrEqual(1)
      }
      if (width < 1200) {
        const tabs = (await page
          .getByRole('tablist', { name: 'Управление командами', exact: true })
          .boundingBox())!
        expect(Math.abs(tabs.y - (toolbar.y + toolbar.height) - 8)).toBeLessThanOrEqual(1)
        expect(
          Math.abs(tabs.x + tabs.width / 2 - (header.x + header.width / 2)),
        ).toBeLessThanOrEqual(1)
      }
      if (width >= 1200) {
        const tabs = page.getByTestId('admin-team-workspace-header').getByRole('tablist')
        const tabBox = (await tabs.boundingBox())!
        expect(Math.abs(tabBox.x - header.x)).toBeLessThanOrEqual(1)
        for (const tab of await tabs.getByRole('tab').all()) {
          const box = (await tab.boundingBox())!
          expect(Math.abs(box.width - create.width)).toBeLessThanOrEqual(1)
          expect(Math.abs(box.height - create.height)).toBeLessThanOrEqual(1)
        }
        expect(tabBox.x + tabBox.width).toBeLessThan(create.x)
        expect(Math.abs(tabBox.y + tabBox.height - (create.y + create.height))).toBeLessThanOrEqual(
          1,
        )
        const content = details.locator('..').locator('..')
        expect(await content.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('none')
        const contentFrame = (await content.boundingBox())!
        expect(Math.abs(contentFrame.y - (tabBox.y + tabBox.height) - 8)).toBeLessThanOrEqual(1)
        for (const tab of await tabs.getByRole('tab').all()) {
          expect(
            Number(await tab.evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth))),
          ).toBeGreaterThan(0)
        }
      }
      await page.mouse.move(0, 0)
      await page.screenshot({
        path: testInfo.outputPath('aligned-workspace.png'),
        animations: 'disabled',
      })
      await actions.getByRole('button', { name: 'Готово: Подтвердить', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toHaveAccessibleName('Подтвердить команду?')
      expect(fixture.requests).toHaveLength(0)
      for (const paragraph of await dialog.locator('p').all())
        expect(await paragraph.evaluate((el) => getComputedStyle(el).textAlign)).toBe('center')
      await page.screenshot({
        path: testInfo.outputPath('confirm-team.png'),
        animations: 'disabled',
      })
      await dialog.getByRole('button', { name: 'Отмена', exact: true }).click()
      expect(fixture.requests).toHaveLength(0)
      await actions.getByRole('button', { name: 'Готово: Подтвердить', exact: true }).click()
      await dialog.getByRole('button', { name: 'Подтвердить', exact: true }).click()
      await expect(dialog).toHaveCount(0)
      await expect(
        actions.getByRole('button', { name: 'Не готово: Отменить подтверждение', exact: true }),
      ).toHaveText('Не готово')
      expect(fixture.requests[0]!.path).toBe('/api/game/registration/teams/team-1/confirm')
      await actions
        .getByRole('button', { name: 'Не готово: Отменить подтверждение', exact: true })
        .click()
      await expect(dialog).toHaveAccessibleName('Отменить подтверждение команды?')
      const modalButtons = await Promise.all(
        (await dialog.getByRole('button').all()).map((button) => button.boundingBox()),
      )
      expect(Math.abs(modalButtons[0]!.height - modalButtons[1]!.height)).toBeLessThanOrEqual(1)
      expect(Math.abs(modalButtons[0]!.width - modalButtons[1]!.width)).toBeLessThanOrEqual(1)
      await page.screenshot({
        path: testInfo.outputPath('unconfirm-team.png'),
        animations: 'disabled',
      })
      await dialog.getByRole('button', { name: 'Отмена', exact: true }).click()
      await actions.getByRole('button', { name: 'Распустить', exact: true }).click()
      for (const paragraph of await dialog.locator('p').all())
        expect(await paragraph.evaluate((el) => getComputedStyle(el).textAlign)).toBe('center')
      const disbandButtons = await Promise.all(
        (await dialog.getByRole('button').all()).map((button) => button.boundingBox()),
      )
      expect(Math.abs(disbandButtons[0]!.height - disbandButtons[1]!.height)).toBeLessThanOrEqual(1)
      expect(Math.abs(disbandButtons[0]!.width - disbandButtons[1]!.width)).toBeLessThanOrEqual(1)
      await page.screenshot({
        path: testInfo.outputPath('disband-team.png'),
        animations: 'disabled',
      })
    },
  )
}

test('team confirmation retains an inline error and blocks duplicate submissions', async ({
  page,
}) => {
  const fixture = await openWorkspace(page)
  let release: (() => void) | undefined
  let requestCount = 0
  const confirmPath = '**/api/game/registration/teams/team-1/confirm'
  await page.route(confirmPath, async (route) => {
    requestCount++
    await new Promise<void>((resolve) => {
      release = resolve
    })
    await route.fulfill({
      status: 409,
      json: { code: 'game_registration.pending_outgoing_invitation', error: 'Changed' },
    })
  })
  await page
    .getByTestId('admin-slot-1')
    .getByRole('button', { name: /^Управление:/ })
    .click()
  await page
    .getByTestId('admin-team-details')
    .getByRole('button', { name: 'Готово: Подтвердить', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  const confirm = dialog.getByRole('button', { name: 'Подтвердить', exact: true })
  await confirm.click()
  await expect(confirm).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Отмена', exact: true })).toBeDisabled()
  await confirm.click({ force: true })
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  expect(requestCount).toBe(1)
  release!()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(1)
  await expect(confirm).toBeEnabled()
  await expect(dialog).toContainText('Ночной дозор')
  await page.unroute(confirmPath)
  await confirm.click()
  await expect(dialog).toHaveCount(0)
  expect(fixture.requests).toHaveLength(1)
})

test('ready-team refusal confirms, keeps failures inline and centers informative tooltips', async ({
  page,
}, testInfo) => {
  const fixture = await openWorkspace(page, ['admin', 'viewer'], false, 'ready')
  const team = fixture.teams[0]!
  team.isReady = true
  team.members.push({
    player: { userId: 'member-extra', displayName: 'Игрок 1.3', login: 'extra' },
    joinedAtUtc: '2026-10-08T10:00:00Z',
    readyAtUtc: null,
  })
  team.members.forEach((member) => {
    member.readyAtUtc = '2026-10-08T10:00:00Z'
  })
  await page.reload()
  await page
    .getByTestId('admin-slot-1')
    .getByRole('button', { name: /^Управление:/ })
    .click()
  const actions = page
    .getByTestId('admin-team-details')
    .getByRole('group', { name: 'Действия', exact: true })
  const reject = actions.getByRole('button', { name: 'Отклонить', exact: true })
  await expect(reject).toBeEnabled()
  await reject.hover()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toContainText('Отказать готовой команде в допуске к игре')
  await expect(tooltip.locator('.MuiTooltip-tooltip')).toHaveCSS('text-align', 'center')
  await reject.click()
  const dialog = page.getByRole('dialog', { name: 'Отказать команде в допуске?' })
  expect(fixture.requests).toHaveLength(0)
  await expect(dialog).toContainText('Каждый участник получит уведомление')
  await page.route('**/api/game/registration/teams/team-1/reject', (route) =>
    route.fulfill({
      status: 409,
      json: { code: 'game_registration.team_not_ready', error: 'Readiness changed' },
    }),
  )
  await dialog.getByRole('button', { name: 'Отклонить', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('готовностью всех игроков')
  await expect(page.getByRole('alert')).toHaveCount(1)
  await page.screenshot({
    path: testInfo.outputPath('refusal-inline-error.png'),
    animations: 'disabled',
  })
  await dialog.getByRole('button', { name: 'Отмена', exact: true }).click()
  await page.unroute('**/api/game/registration/teams/team-1/reject')
  await reject.click()
  await dialog.getByRole('button', { name: 'Отклонить', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(fixture.requests.at(-1)!.path).toBe('/api/game/registration/teams/team-1/reject')
})
