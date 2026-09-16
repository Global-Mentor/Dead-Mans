import { expect, test, type Page } from '@playwright/test'
import type { GameBoardSnapshot } from '../src/shared/api/contracts/index.ts'

const categories = ['Охота', 'Оружие', 'Легенды', 'Болота', 'Контракты']
const board: GameBoardSnapshot = {
  gameId: 'board-layout',
  title: 'Последняя охота',
  description: 'Пять территорий. Один шанс вернуться с наградой.',
  status: 'active',
  version: 1,
  rows: 5,
  cols: 5,
  rowLabels: ['100', '200', '300', '400', '500'],
  colLabels: categories,
  activeTeamId: 'team-one',
  enabledModifierIds: [],
  activeModifiers: [],
  cells: Array.from({ length: 25 }, (_, index) => ({
    id: `card-${index}`,
    row: Math.floor(index / 5),
    col: index % 5,
    title: index === 0 ? 'Следы на болотах' : `Испытание ${index + 1}`,
    description: 'Описание испытания, доступное после открытия карточки.',
    cost: (Math.floor(index / 5) + 1) * 100,
    type: 'question',
    state: index === 0 ? 'open' : index === 1 ? 'cancelled' : 'closed',
    media: [],
  })),
}

async function mockGame(
  page: Page,
  status: 'active' | 'ready' | 'finished' = 'active',
  role = 'admin',
  teamName = 'Ночные странники',
) {
  const writes: string[] = []
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  await page.routeWebSocket(/\/hubs\/game-board/, (socket) => {
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) socket.send('{}\u001e')
    })
  })
  await page.route(
    (url) =>
      url.pathname === '/auth/me' ||
      url.pathname.startsWith('/api/') ||
      url.pathname.includes('/negotiate'),
    async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path.includes('/negotiate'))
        return route.fulfill({
          json: {
            connectionId: 'layout',
            connectionToken: 'layout',
            negotiateVersion: 1,
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
          },
        })
      if (route.request().method() !== 'GET') {
        writes.push(path)
        return route.fulfill({ status: 409 })
      }
      if (path === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
            displayName: 'Охотник',
            roles: [role, 'viewer'],
          },
        })
      if (path === '/api/game') return route.fulfill({ json: { ...board, status } })
      if (path === '/api/game/team-queue')
        return route.fulfill({
          json: {
            teams: [
              {
                teamId: 'team-one',
                teamName,
                teamSlotIndex: 1,
                isPlayed: false,
                participants: [
                  { userId: 'player-one', displayName: 'Искатель приключений' },
                  { userId: 'player-two', displayName: 'Ворон' },
                ],
              },
              {
                teamId: 'team-two',
                teamName: 'Последний рубеж',
                teamSlotIndex: 2,
                isPlayed: true,
                participants: [{ userId: 'player-three', displayName: 'Стрелок' }],
              },
            ],
            summary: { totalTeams: 2, playedTeams: 1, remainingTeams: 1 },
          },
        })
      if (path === '/api/game/history/games/board-layout')
        return route.fulfill({ json: { mainGame: { rounds: [] } } })
      if (path.includes('manual-quiz') || path.includes('/players'))
        return route.fulfill({ json: [] })
      return route.fulfill({ status: 204 })
    },
  )
  return writes
}

for (const width of [320, 390, 768, 1024, 1200, 1440, 1920]) {
  test(`game board is readable and operable at ${width}px`, async ({ page }) => {
    const height =
      width === 320 ? 700 : width === 390 ? 844 : width === 768 ? 800 : width === 1440 ? 900 : 1080
    await page.setViewportSize({ width, height })
    const writes = await mockGame(page)
    await page.goto('/panel/game-board')
    await expect(page.getByRole('heading', { name: 'Последняя охота' })).toBeVisible()
    await expect(page.getByRole('progressbar')).toHaveCount(0)
    const region = page.getByRole('region', { name: 'Последняя охота' })
    // Keep the board close to the top, especially on phones.
    const firstCardBox = await region.locator('[data-cell-id="card-0"]').boundingBox()
    expect(firstCardBox!.y).toBeLessThan(width < 1200 ? 280 : 210)
    const statusBox = await page.getByTestId('game-board-context').boundingBox()
    expect(statusBox!.height).toBeLessThanOrEqual(76)
    const rightCardBox = await region
      .locator(`[data-cell-id="${width < 600 ? 'card-5' : 'card-4'}"]`)
      .boundingBox()
    const cardsCenter = (firstCardBox!.x + rightCardBox!.x + rightCardBox!.width) / 2
    expect(Math.abs(statusBox!.x + statusBox!.width / 2 - cardsCenter)).toBeLessThan(1)
    const teamsBox = await page
      .getByRole('button', { name: 'Открыть очередь команд' })
      .boundingBox()
    const managementBox = await page
      .getByRole('button', { name: 'Управление игрой', exact: true })
      .boundingBox()
    if (width >= 1200) {
      expect(teamsBox!.x).toBe(0)
      expect(managementBox!.x + managementBox!.width).toBe(width)
      expect(teamsBox!.width).toBe(44)
      expect(managementBox!.width).toBe(44)
      expect(Math.abs(teamsBox!.y + teamsBox!.height / 2 - height / 2)).toBeLessThan(1)
      expect(teamsBox!.x + teamsBox!.width).toBeLessThan(firstCardBox!.x)
      const lastCard = await region.locator('[data-cell-id="card-4"]').boundingBox()
      expect(managementBox!.x).toBeGreaterThan(lastCard!.x + lastCard!.width)
      expect(Math.abs(managementBox!.y - teamsBox!.y)).toBeLessThan(1)
    } else {
      expect(teamsBox!.height).toBe(44)
      expect(managementBox!.height).toBe(44)
      expect(teamsBox!.y + teamsBox!.height).toBeLessThan(firstCardBox!.y)
      expect(managementBox!.y + managementBox!.height).toBeLessThan(firstCardBox!.y)
    }
    if (width < 600) {
      await expect(page.getByRole('tab', { name: 'Охота', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      await expect(region.locator('[data-cell-id]')).toHaveCount(5)
      await page.getByRole('tab', { name: 'Оружие', exact: true }).click()
      await expect(page.getByRole('tabpanel')).toHaveAccessibleName('Оружие')
      await page.getByRole('tab', { name: 'Охота', exact: true }).click()
    } else {
      await expect(region.locator('[data-cell-id]')).toHaveCount(25)
      await expect(page.getByRole('columnheader')).toHaveCount(5)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const cells = await region.locator('[data-cell-id]').evaluateAll((elements) =>
      elements.map((el) => ({
        client: el.clientHeight,
        scroll: el.scrollHeight,
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
        bottom: el.getBoundingClientRect().bottom,
      })),
    )
    for (const cell of cells) {
      expect(cell.width).toBeGreaterThanOrEqual(44)
      expect(cell.bottom).toBeLessThanOrEqual(height)
      expect(Math.abs(cell.height - cell.width * 1.5)).toBeLessThan(1)
      expect(cell.scroll).toBeLessThanOrEqual(cell.client + 1)
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
    ).toBe(true)
    await page.screenshot({ path: `../.tmp/game-board-design/board-${width}.png`, fullPage: true })
    await expect(page.getByRole('button', { name: 'Открыть очередь команд' })).toBeVisible()
    await page.getByRole('button', { name: 'Открыть очередь команд' }).click()
    await expect(page.getByRole('complementary', { name: 'Очередь команд' })).toBeVisible()
    await page.getByRole('button', { name: 'Закрыть очередь команд' }).click()
    await expect(page.getByRole('button', { name: 'Открыть очередь команд' })).toBeFocused()
    await page
      .getByRole('button', { name: 'Открыть карточку Следы на болотах', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    const unopened = region.locator('[data-cell-id="card-5"]')
    await unopened.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Отмена' }).click()
    await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
    await expect(page.getByTestId('game-management-tool')).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Управление игрой' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Управление модификаторами' })).toBeVisible()
    await expect
      .poll(async () => {
        const box = await page.getByRole('dialog').boundingBox()
        return Math.round(box!.x + box!.width)
      })
      .toBe(width)
    await page.screenshot({
      path: `../.tmp/game-board-design/management-${width}.png`,
      animations: 'disabled',
    })
    expect(
      await page
        .getByTestId('admin-tool-drawer-scroll-body')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
    await page.getByTestId('admin-tool-drawer-scroll-body').evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    await expect(
      page.getByRole('button', { name: 'Закрыть инструменты управления' }),
    ).toBeInViewport()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Управление игрой', exact: true })).toBeFocused()
    expect(writes).toEqual([])
    if (width === 1440) {
      await page.setViewportSize({ width, height: 700 })
      await expect
        .poll(async () =>
          region
            .locator('[data-cell-id]')
            .evaluateAll((elements) =>
              elements.every((element) => element.getBoundingClientRect().bottom <= innerHeight),
            ),
        )
        .toBe(true)
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
      ).toBe(true)
    }
  })
}

test('edge tabs adapt to mobile without losing the open panel or focus', async ({ page }) => {
  await mockGame(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/panel/game-board')
  const teams = page.getByRole('button', { name: 'Открыть очередь команд' })
  await teams.click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('complementary', { name: 'Очередь команд' })).toBeVisible()
  await page.getByRole('button', { name: 'Закрыть очередь команд' }).click()
  await expect(teams).toBeFocused()
  expect((await teams.boundingBox())!.height).toBe(44)
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect.poll(async () => (await teams.boundingBox())!.x).toBe(0)
  expect((await teams.boundingBox())!.width).toBe(44)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('complementary', { name: 'Очередь команд' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(teams).toBeFocused()
})

for (const status of ['ready', 'finished'] as const) {
  test(`shows ${status} state and player actions on a phone`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockGame(page, status, 'viewer')
    await page.goto('/panel/game-board')
    await expect(page.getByRole('heading', { name: 'Последняя охота' })).toBeVisible()
    await expect(
      page.getByRole('link', { name: status === 'ready' ? 'Подать заявку' : 'Открыть результаты' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Управление игрой' })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

for (const width of [320, 390, 1440]) {
  test(`live round actions stay visible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 })
    const teamName =
      width === 320 ? 'ОченьДлинноеНазваниеКомандыБезПробеловДляПроверки' : 'Ночные странники'
    await mockGame(page, 'active', 'viewer', teamName)
    let roundStatus = 'awaiting_modifiers'
    await page.route('**/api/game/rounds/active', (route) =>
      route.fulfill({
        json: {
          roundId: 'round-one',
          cellId: 'card-0',
          teamId: 'team-one',
          teamName: 'Ночные странники',
          teamSlotIndex: 1,
          status: roundStatus,
          baseScore: 100,
          version: 1,
        },
      }),
    )
    await page.goto('/panel/game-board')
    await expect(page.locator('[data-cell-id="card-0"]')).toContainText('Текущий раунд')
    if (width < 600) {
      await page.getByRole('tab', { name: 'Оружие', exact: true }).click()
      await page.getByRole('button', { name: 'Текущий раунд', exact: true }).click()
    }
    await expect(page.locator('[data-cell-id="card-0"]')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Перейти к модификаторам' })).toBeVisible()
    await expect(page.getByTestId('game-board-context')).toContainText(teamName)
    await expect(page.getByTestId('game-board-context')).toContainText('Активная команда')
    await expect(page.getByTestId('game-board-context')).toContainText('Фаза раунда')
    const actionBox = await page
      .getByRole('link', { name: 'Перейти к модификаторам' })
      .boundingBox()
    const statusBox = await page.getByTestId('game-board-context').boundingBox()
    expect(actionBox!.height).toBeGreaterThanOrEqual(44)
    expect(statusBox!.height).toBeLessThanOrEqual(76)
    expect(statusBox!.height).toBe(64)
    expect(actionBox!.x + actionBox!.width).toBeLessThanOrEqual(statusBox!.x + statusBox!.width)
    await expect(page.getByRole('button', { name: 'Меню игры' })).toHaveCount(0)
    expect(
      await page
        .locator('[data-cell-id]')
        .evaluateAll((elements) =>
          elements.every((element) => element.getBoundingClientRect().bottom <= innerHeight),
        ),
    ).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: `../.tmp/game-board-design/live-round-${width}.png`,
      fullPage: true,
    })
    // Switching between an action and a passive phase must not move the team or cards.
    const teamBoxBefore = await page
      .getByTestId('game-board-context')
      .getByTitle(teamName)
      .boundingBox()
    const cardBoxBefore = await page.locator('[data-cell-id="card-0"]').boundingBox()
    roundStatus = 'in_progress'
    await page.reload()
    await expect(page.getByTestId('game-board-context')).toContainText('Провести игру')
    await expect(page.getByRole('link', { name: 'Перейти к модификаторам' })).toHaveCount(0)
    const teamBoxAfter = await page
      .getByTestId('game-board-context')
      .getByTitle(teamName)
      .boundingBox()
    const cardBoxAfter = await page.locator('[data-cell-id="card-0"]').boundingBox()
    expect(await page.getByTestId('game-board-context').boundingBox()).toEqual(statusBox)
    expect(teamBoxAfter).toEqual(teamBoxBefore)
    expect(cardBoxAfter).toEqual(cardBoxBefore)
  })
}
