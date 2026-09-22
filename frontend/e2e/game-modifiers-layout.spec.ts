import { expect, test, type Page } from '@playwright/test'

const modifiers = Array.from({ length: 18 }, (_, index) => ({
  modifier: {
    id: `modifier-${index + 1}`,
    category: index < 6 ? 'preparation' : index < 12 ? 'round' : 'result',
    name: `Модификатор ${index + 1}`,
    description:
      'Понятное описание эффекта с достаточно длинным текстом для проверки адаптивной компоновки карточки.',
    activationCost: (index % 5) + 1,
    activationLimit: index % 3 === 0 ? { count: 2 } : null,
    conflictingModifierIds: [],
    iconEmoji: index % 2 === 0 ? '⚓' : '🧭',
    activationCommand: null,
    revision: 1,
    normalizedTags: [],
    behaviorV2: {
      schemaVersion: 2,
      kind: 'rule',
      phase: 'round',
      performer: 'activeTeam',
      requiresHostMonitoring: false,
      rule: 'Тестовое правило',
      stackingPolicy: 'aggregateParameters',
      resolution: { type: 'ruleStatus' },
      reward: 'none',
      formulaReference: null,
    },
  },
  isActive: index === 0,
  canActivate: true,
  blockedReason: null,
  activationsCount: index === 0 ? 1 : 0,
  limit: index % 3 === 0 ? 2 : null,
}))

async function mockModifiers(page: Page) {
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
            connectionId: 'modifiers',
            connectionToken: 'modifiers',
            negotiateVersion: 1,
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
          },
        })
      if (route.request().method() !== 'GET') return route.fulfill({ status: 204 })
      if (path === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
            displayName: 'Игрок',
            roles: ['viewer'],
          },
        })
      if (path === '/api/game/modifiers/state')
        return route.fulfill({
          json: {
            availableQuizPoints: 24,
            spentQuizPoints: 9,
            earnedQuizPoints: 33,
            isOrderingOpen: true,
            activeModifiers: [
              {
                activationId: 'activation-1',
                roundId: 'round-1',
                roundVersion: 1,
                modifierId: 'modifier-1',
                modifierName: 'Модификатор 1',
                activatedByUserId: 'player-2',
                activatedByDisplayName: 'Другой игрок',
                activationCost: 1,
                activatedAtUtc: '2026-09-21T18:01:00Z',
              },
            ],
            availableModifiers: modifiers,
          },
        })
      if (path === '/api/game')
        return route.fulfill({
          json: {
            gameId: 'game-1',
            status: 'active',
            title: 'Игра',
            version: 1,
            rows: 1,
            cols: 1,
            rowLabels: ['Сложность'],
            colLabels: ['Категория'],
            cells: [
              {
                id: 'cell-1',
                row: 0,
                col: 0,
                cellType: 'regular',
                title: 'Битва в порту',
                description: null,
                cost: 500,
                state: 'open',
                media: [],
              },
            ],
            enabledModifierIds: modifiers.map((item) => item.modifier.id),
            activeModifiers: [],
            activeTeamId: 'team-1',
          },
        })
      if (path === '/api/game/rounds/active')
        return route.fulfill({
          json: {
            roundId: 'round-1',
            gameId: 'game-1',
            cellId: 'cell-1',
            teamId: 'team-1',
            teamName: 'Морские волки',
            teamSlotIndex: 2,
            status: 'awaiting_modifiers',
            startedAtUtc: '2026-09-21T18:00:00Z',
            finishedAtUtc: null,
            baseScore: 0,
            finalScore: null,
            emptyCardPenaltyApplied: false,
            scoreDetails: {
              baseScore: 0,
              bountyScore: 0,
              modifierScore: 0,
              penaltyTotal: 0,
              finalScore: 0,
            },
            killsCount: 0,
            bountyCount: 0,
            notes: null,
            participants: [
              { userId: 'team-user-1', displayName: 'Капитан Флинт' },
              { userId: 'team-user-2', displayName: 'Энн Бонни' },
            ],
            modifierResults: [],
          },
        })
      return route.fulfill({ status: 204 })
    },
  )
}

for (const size of [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]) {
  test(`modifier lists stay inside the viewport at ${size.width}x${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size)
    await mockModifiers(page)
    await page.goto('/panel/game-modifiers')

    const summary = page.getByRole('region', { name: 'Краткая сводка' })
    const available = page.getByTestId('available-modifiers-section')
    await expect(summary).toBeVisible()
    await expect(available).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('modifiers.png') })
    const search = page.getByRole('textbox', { name: 'Поиск модификаторов' })
    await search.fill('Нет такого модификатора')
    await expect(available.locator('li')).toHaveCount(0)
    await page.getByRole('button', { name: 'Очистить', exact: true }).click()
    await expect(search).toHaveValue('')
    await expect(available.locator('li')).toHaveCount(18)

    const summaryMetrics = await summary.evaluate((element) => ({
      width: element.clientWidth,
      content: element.scrollWidth,
    }))
    expect(summaryMetrics.content).toBeLessThanOrEqual(summaryMetrics.width + 1)

    const listMetrics = await available.evaluate((element) => ({
      height: element.clientHeight,
      content: element.scrollHeight,
      bottom: element.getBoundingClientRect().bottom,
    }))
    expect(listMetrics.content).toBeGreaterThan(listMetrics.height)
    expect(listMetrics.bottom).toBeLessThanOrEqual(size.height)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      size.width,
    )
  })
}

for (const width of [390, 800]) {
  test(`available modifiers come first without horizontal scroll at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await mockModifiers(page)
    await page.goto('/panel/game-modifiers')

    const available = await page.getByTestId('available-modifiers-section').boundingBox()
    const active = await page.getByTestId('active-modifiers-section').boundingBox()
    expect(available).not.toBeNull()
    expect(active).not.toBeNull()
    expect(available!.y).toBeLessThan(active!.y)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
  })
}
