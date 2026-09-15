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
                teamName: 'Ночные странники',
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

for (const width of [320, 390, 768, 1440, 1920]) {
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
    expect(firstCardBox!.y).toBeLessThan(width < 600 ? 350 : 280)
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
    await page.keyboard.press('Escape')
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

test('mobile live round stays discoverable across categories', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockGame(page, 'active', 'viewer')
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({
      json: {
        roundId: 'round-one',
        cellId: 'card-0',
        teamId: 'team-one',
        teamName: 'Ночные странники',
        teamSlotIndex: 1,
        status: 'awaiting_modifiers',
        baseScore: 100,
        version: 1,
      },
    }),
  )
  await page.goto('/panel/game-board')
  await expect(page.locator('[data-cell-id="card-0"]')).toContainText('Текущий раунд')
  await page.getByRole('tab', { name: 'Оружие', exact: true }).click()
  await page.getByRole('button', { name: 'Текущий раунд', exact: true }).click()
  await expect(page.locator('[data-cell-id="card-0"]')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Перейти к модификаторам' })).toBeVisible()
  expect(
    await page
      .locator('[data-cell-id]')
      .evaluateAll((elements) =>
        elements.every((element) => element.getBoundingClientRect().bottom <= innerHeight),
      ),
  ).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '../.tmp/game-board-design/live-round-390.png', fullPage: true })
})
