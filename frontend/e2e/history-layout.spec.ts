import { expect, test, type Page } from '@playwright/test'

const date = '2026-09-21T12:00:00Z'
const games = Array.from({ length: 25 }, (_, index) => ({
  gameId: `game-${index}`,
  gameTitle: `Архивная игра ${index + 1}`,
  gameStatus: 'finished',
  createdAtUtc: date,
  startedAtUtc: date,
  finishedAtUtc: date,
  mainGameRoundCount: 8,
  quizQuestionCount: 12,
  uniquePlayerCount: 6,
}))
const modifiers = Array.from({ length: 20 }, (_, index) => ({
  modifierId: `modifier-${index}`,
  name: `Модификатор ${index + 1}`,
  iconEmoji: '⚓',
  currentRevision: 10,
  category: 'round',
  activationCost: 5,
  isArchived: index % 2 === 0,
  createdAtUtc: date,
  versionCount: 10,
  gamesCount: 3,
  activationsCount: 4,
}))

async function mockHistory(page: Page) {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  await page.routeWebSocket(/\/hubs\//, (socket) =>
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) socket.send('{}\u001e')
    }),
  )
  await page.route(
    (url) =>
      url.pathname === '/auth/me' ||
      url.pathname.startsWith('/api/') ||
      url.pathname.includes('/negotiate'),
    async (route) => {
      const url = new URL(route.request().url())
      const path = url.pathname
      if (path.includes('/negotiate'))
        return route.fulfill({
          json: {
            connectionId: 'history',
            connectionToken: 'history',
            negotiateVersion: 1,
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
          },
        })
      if (route.request().method() !== 'GET') return route.fulfill({ status: 204 })
      if (path === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
            displayName: 'Читатель',
            roles: ['viewer'],
          },
        })
      if (path === '/api/game') return route.fulfill({ status: 204 })
      if (path === '/api/game/history/games') return route.fulfill({ json: games })
      const game = games.find((item) => path === `/api/game/history/games/${item.gameId}`)
      if (game)
        return route.fulfill({
          json: {
            ...game,
            mainGame: { teamStats: [], playerStats: [], rounds: [], modifierActivations: [] },
            quiz: { totalPoints: 35, playerStats: [], questionSessions: [], manualAwards: [] },
            modifierSnapshotStatus: 'complete',
            modifierSnapshots: [],
            finalResult: {
              finishedAtUtc: date,
              finishedByDisplayName: 'Ведущий',
              publicNote: 'Спасибо всем участникам!',
              teams: Array.from({ length: 3 }, (_, index) => ({
                teamId: `team-${index}`,
                teamSlotIndex: index + 1,
                teamName: `Команда с длинным названием ${index + 1}`,
                placement: index + 1,
                participantNames: ['Капитан Флинт', 'Энн Бонни'],
                finalScore: 100 - index * 10,
                bestScore: 100,
                penaltyTotal: index * 10,
              })),
            },
          },
        })
      if (path === '/api/game/modifiers/history') {
        const search = (url.searchParams.get('search') ?? '').toLocaleLowerCase()
        const status = url.searchParams.get('status')
        return route.fulfill({
          json: {
            items: modifiers.filter(
              (item) =>
                item.name.toLocaleLowerCase().includes(search) &&
                (status === 'all' || (status === 'archived') === item.isArchived),
            ),
            nextCursor: null,
          },
        })
      }
      const match = path.match(
        /\/api\/game\/modifiers\/(modifier-\d+)\/versions(?:\/(\d+))?(\/games)?$/,
      )
      if (match) {
        const modifier = modifiers.find((item) => item.modifierId === match[1])!
        const revision = Number(match[2])
        if (match[3])
          return route.fulfill({
            json: {
              items: games.slice(0, 3).map((game, index) => ({
                ...game,
                gameStatus: index === 2 ? 'active' : game.gameStatus,
                successfulActivationsCount: 3,
                cancelledActivationsCount: 0,
                resultsCount: 3,
                isEmergencyDisabled: false,
              })),
              nextCursor: null,
            },
          })
        const version = (value: number) => ({
          ...modifier,
          versionId: `version-${value}`,
          revision: value,
          createdByDisplayName: 'Администратор',
          changeType: 'edited',
          changeNote: 'Уточнили правило и стоимость.',
          changedFields: ['activationCost'],
          activationCost: value,
        })
        if (!revision)
          return route.fulfill({
            json: {
              items: Array.from({ length: 10 }, (_, index) => version(10 - index)),
              nextCursor: null,
            },
          })
        return route.fulfill({
          json: {
            ...version(revision),
            isCurrent: revision === 10,
            description:
              'Дополнительное правило для активной команды. Итог определяется результатом раунда.',
            activationCommand: '!rule',
            activationLimit: { count: 3 },
            normalizedTags: ['команда'],
            conflicts: [],
            behaviorV2: {
              schemaVersion: 2,
              kind: 'rule',
              phase: 'round',
              performer: 'activeTeam',
              requiresHostMonitoring: false,
              rule: 'Не менять оружие во время раунда.',
              stackingPolicy: 'aggregateParameters',
              resolution: { type: 'ruleStatus' },
              reward: 'none',
              formulaReference: null,
            },
          },
        })
      }
      return route.fulfill({ status: 204 })
    },
  )
}

for (const width of [390, 800, 1366, 2560]) {
  test(`game archive search and selection at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width > 2000 ? 1440 : 900 })
    await mockHistory(page)
    await page.goto('/panel/game-history')
    await expect(page.getByRole('heading', { name: 'Архивная игра 1', exact: true })).toBeVisible()
    const picker = page.locator('details').first()
    if (width < 1000) {
      await expect(picker).not.toHaveAttribute('open', '')
      await picker.locator('summary').click()
    }
    await page.getByRole('textbox', { name: 'Поиск игр' }).fill('игра 25')
    await picker.getByRole('button', { name: /Архивная игра 25/ }).click()
    await expect(page.getByRole('heading', { name: 'Архивная игра 25', exact: true })).toBeVisible()
    if (width < 1000) await expect(picker).not.toHaveAttribute('open', '')
    await expect(page).toHaveURL(/gameId=game-24/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    await page.screenshot({ path: testInfo.outputPath('game-history.png'), animations: 'disabled' })
  })

  test(`modifier archive revisions and related games at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width > 2000 ? 1440 : 900 })
    await mockHistory(page)
    await page.goto('/panel/modifier-history?modifierId=modifier-0&revision=10')
    const detail = page.getByRole('heading', { name: '⚓ Модификатор 1', exact: true, level: 2 })
    await expect(detail).toBeVisible()
    const revisions = page
      .locator('details')
      .filter({ has: page.locator('summary').filter({ hasText: 'Таймлайн редакций' }) })
    await revisions.locator('summary').click()
    await revisions.getByRole('button', { name: /Редакция 10 / }).focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/revision=9/)
    await expect(page.getByText('Было: 8', { exact: true })).toBeVisible()
    await expect(page.getByText('Стало: 9', { exact: true })).toBeVisible()
    await revisions.locator('summary').click()
    const behavior = page
      .locator('details')
      .filter({ has: page.locator('summary').filter({ hasText: /^Поведение$/ }) })
    await expect(behavior).not.toHaveAttribute('open', '')
    await behavior.locator('summary').click()
    await expect(page.getByText('Не менять оружие во время раунда.', { exact: true })).toBeVisible()
    await behavior.locator('summary').click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    await page
      .getByRole('heading', { name: 'История модификаторов', exact: true })
      .scrollIntoViewIfNeeded()
    await page.screenshot({
      path: testInfo.outputPath('modifier-history.png'),
      animations: 'disabled',
    })
    await expect(page.getByRole('link', { name: 'Архивная игра 3', exact: true })).toHaveAttribute(
      'href',
      '/panel/game-leaderboard',
    )
    await page.getByRole('link', { name: 'Архивная игра 1', exact: true }).click()
    await expect(page).toHaveURL(/game-history\?gameId=game-0/)
    await expect(page.getByRole('heading', { name: 'Архивная игра 1', exact: true })).toBeVisible()
  })
}

for (const width of [390, 1366]) {
  test(`modifier selection and search preserve readable details at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockHistory(page)
    await page.goto('/panel/modifier-history')
    const picker = page.locator('details').first()
    const search = page.getByRole('textbox', { name: 'Поиск модификаторов' })
    await search.fill('Модификатор 20')
    await picker.getByRole('button', { name: /Модификатор 20/ }).click()
    await expect(page).toHaveURL(/modifierId=modifier-19&revision=10/)
    await expect(
      page.getByRole('heading', { name: '⚓ Модификатор 20', level: 2, exact: true }),
    ).toBeVisible()
    if (width < 1000) {
      await expect(picker).not.toHaveAttribute('open', '')
      await picker.locator('summary').click()
    }
    await search.fill('Несуществующий')
    await expect(page.getByText('По фильтрам ничего не найдено.')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: '⚓ Модификатор 20', level: 2, exact: true }),
    ).toBeVisible()
    await search.fill('Модификатор 2')
    await picker.getByRole('button', { name: /^⚓ Модификатор 2 Редакция/ }).click()
    await expect(page).toHaveURL(/modifierId=modifier-1&revision=10/)
    if (width < 1000) await expect(picker).not.toHaveAttribute('open', '')
  })
}
