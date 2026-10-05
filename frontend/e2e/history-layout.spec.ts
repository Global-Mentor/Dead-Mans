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

const archiveRound = {
  roundId: 'archived-round',
  teamId: 'team-0',
  teamName: 'Команда с длинным названием 1',
  teamSlotIndex: 1,
  status: 'completed',
  roundVersion: 1,
  startedAtUtc: date,
  finishedAtUtc: date,
  baseScore: 100,
  finalScore: 100,
  emptyCardPenaltyApplied: false,
  scoreDetails: {
    scoreUnit: 100,
    killsScore: 100,
    bountyScore: 0,
    modifierKillDelta: 0,
    modifierKillScore: 0,
    modifierScoreDelta: 0,
    emptyCardPenaltyApplied: false,
    emptyCardPenaltyScore: 0,
    penaltyTotal: 0,
    bonusDelta: 0,
    totalKillCount: 1,
    finalScore: 100,
    calculationLines: [],
  },
  killsCount: 1,
  bountyCount: 0,
  cellId: 'archived-cell-0',
  cellRowIndex: 0,
  cellColIndex: 0,
  cellType: 'regular',
  cellCost: 100,
  cellTitle: 'Сохранённая карточка',
  cellDescription: 'Описание из прошлой игры',
  cellMedia: [{ url: '/history-test-card.svg' }],
  purchasesRefunded: false,
  modifiers: [],
  participants: [],
}

function savedBoard(game: (typeof games)[number]) {
  return {
    gameId: game.gameId,
    title: game.gameTitle,
    status: 'finished',
    version: 7,
    rows: 5,
    cols: 5,
    rowLabels: ['100', '200', '300', '400', '500'],
    colLabels: ['Дробовики', 'Винтовки', 'Пистолеты', 'Луки', 'Особые'],
    enabledModifierIds: [],
    activeModifiers: [],
    activeTeamId: null,
    cells: Array.from({ length: 25 }, (_, index) => ({
      id: 'archived-cell-' + index,
      row: Math.floor(index / 5),
      col: index % 5,
      cellType: 'regular',
      cost: (Math.floor(index / 5) + 1) * 100,
      state: index === 0 ? 'open' : index === 1 ? 'cancelled' : 'closed',
      title: index === 0 ? 'Сохранённая карточка' : null,
      description: index === 0 ? 'Описание из прошлой игры' : null,
      media: index === 0 ? [{ url: '/history-test-card.svg' }] : [],
    })),
  }
}

async function mockHistory(page: Page, publicNote = 'Спасибо всем участникам!') {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  await page.route('**/history-test-card.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#464438"/></svg>',
    }),
  )
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
            board: savedBoard(game),
            mainGame: {
              teamStats: [],
              playerStats: [],
              rounds: [archiveRound],
              modifierActivations:
                game.gameId === 'game-0'
                  ? ['consumed', 'cancelled'].map((status, index) => ({
                      activationId: 'activation-' + index,
                      modifierId: 'saved-modifier',
                      modifierName: 'Архивный модификатор',
                      activatedByUserId: 'captain',
                      activatedByDisplayName: 'Капитан',
                      activatedAtUtc: date,
                      status,
                      refundAmount: status === 'cancelled' ? 5 : 0,
                    }))
                  : [],
            },
            quiz: {
              totalPoints: 35,
              playerStats: [
                {
                  userId: '10000000-0000-4000-8000-000000000001',
                  displayName: 'Архивный знаток',
                  points: 25,
                  spentPoints: 10,
                  availablePoints: 15,
                  attempts: 4,
                  correctAnswers: 3,
                  lastActivityAtUtc: date,
                },
                {
                  userId: '10000000-0000-4000-8000-000000000002',
                  displayName: 'Второй архивный знаток',
                  points: 10,
                  spentPoints: 0,
                  availablePoints: 10,
                  attempts: 3,
                  correctAnswers: 1,
                  lastActivityAtUtc: date,
                },
              ],
              questionSessions: [],
              manualAwards: [],
            },
            modifierSnapshotStatus: 'complete',
            modifierSnapshots: [],
            finalResult: {
              finishedAtUtc: date,
              finishedByDisplayName: 'Ведущий',
              publicNote,
              teams: Array.from({ length: 3 }, (_, index) => ({
                teamId: `team-${index}`,
                teamSlotIndex: index + 1,
                teamName: `Команда с длинным названием ${index + 1}`,
                placement: index + 1,
                roundsPlayed: 2,
                totalScore: 150,
                totalBonusDelta: 0,
                totalKills: 5,
                totalBounties: 2,
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

async function assertBounded(page: Page, width: number, height: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
    height,
  )
}

for (const width of [390, 768, 1440, 2560]) {
  const height = width > 2000 ? 1440 : 900
  test('game archive search and selection at ' + width + 'px', async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height })
    await mockHistory(page)
    await page.goto('/panel/game-history')
    await expect(page.getByRole('heading', { name: 'Архивная игра 1', exact: true })).toBeVisible()
    const picker = page.getByRole('region', { name: 'Завершённые игры', exact: true })
    if (width < 1000) {
      await expect(page.locator('details').first()).not.toHaveAttribute('open', '')
      await page.locator('details').first().locator('summary').click()
    }
    await page.getByRole('textbox', { name: 'Поиск игр' }).fill('игра 25')
    const gameRow = picker.getByRole('button', { name: /Архивная игра 25/ })
    const rowBox = await gameRow.boundingBox()
    const searchBox = await page
      .getByRole('textbox', { name: 'Поиск игр' })
      .evaluate((input) => input.closest('.MuiFormControl-root')!.getBoundingClientRect().toJSON())
    expect(Math.abs(rowBox!.x - searchBox.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(rowBox!.width - searchBox.width)).toBeLessThanOrEqual(1)
    await gameRow.click()
    await expect(page.getByRole('heading', { name: 'Архивная игра 25', exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Игра', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(
      page.getByRole('tablist', { name: 'История завершённых игр' }).getByRole('tab'),
    ).toHaveText(['Игра', 'Викторина', 'Модификаторы', 'Статистика'])
    await page.getByRole('tab', { name: 'Игра', exact: true }).click()
    await expect(page.getByRole('table', { name: 'Таблица команд' })).toBeVisible()
    const teamRow = page.getByRole('row', { name: 'Команда с длинным названием 2', exact: true })
    await expect(teamRow.getByRole('cell').last()).toHaveText('90')
    await teamRow.click()
    const teamDetails = page.getByTestId('current-leaderboard-team-details')
    await expect(teamDetails.getByRole('heading', { name: 'Итоги команды' })).toBeVisible()
    await expect(
      teamDetails.getByRole('heading', { name: 'Команда с длинным названием 2', exact: true }),
    ).toBeVisible()
    if (width < 1400)
      await page.getByRole('button', { name: 'Закрыть', exact: true }).last().click()
    await expect(page.getByText('Спасибо всем участникам!')).toBeHidden()
    const comment = page.getByRole('button', { name: 'Комментарий к игре', exact: true })
    await comment.click()
    const commentDialog = page.getByRole('dialog', { name: 'Комментарий к игре', exact: true })
    await expect(commentDialog.getByText('Спасибо всем участникам!')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('game-comment.png'), animations: 'disabled' })
    await page.keyboard.press('Escape')
    await expect(commentDialog).toBeHidden()
    await expect(comment).toBeFocused()
    const finishMeta = page.getByText(/^Завершил: Ведущий ·/)
    await expect(finishMeta).toHaveCount(1)
    const metaBox = await finishMeta.boundingBox()
    const tabsBox = await page
      .getByRole('tablist', { name: 'История завершённых игр' })
      .boundingBox()
    expect(metaBox!.y + metaBox!.height).toBeLessThanOrEqual(tabsBox!.y)
    const boardButton = await page
      .getByRole('button', { name: 'Посмотреть доску', exact: true })
      .boundingBox()
    const titleBox = await page
      .getByRole('heading', { name: 'Архивная игра 25', exact: true })
      .boundingBox()
    expect(boardButton!.x + boardButton!.width).toBeLessThanOrEqual(titleBox!.x)
    if (width >= 1440) {
      const commentBox = await comment.boundingBox()
      expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(commentBox!.x)
    }
    await assertBounded(page, width, height)
    await page.screenshot({ path: testInfo.outputPath('game-history.png'), animations: 'disabled' })
    await page.getByRole('tab', { name: 'Викторина', exact: true }).click()
    const quiz = page.getByTestId('quiz-leaderboard')
    await expect(quiz.getByText('Архивный знаток', { exact: true })).toBeVisible()
    await expect(quiz.getByText('25 очк.')).toBeVisible()
    await page.getByRole('tab', { name: 'Статистика', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Статистика игры' })).toBeVisible()
    await assertBounded(page, width, height)
    await page.getByRole('tab', { name: 'Модификаторы', exact: true }).click()
    await expect(page.getByText('Активаций и результатов модификаторов пока нет.')).toBeVisible()
    await assertBounded(page, width, height)
    await expect(page).toHaveURL(/gameId=game-24/)
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
    await expect(
      page.getByRole('heading', { name: 'История модификаторов', exact: true }),
    ).toHaveCount(0)
    await page.getByRole('main').scrollIntoViewIfNeeded()
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

for (const width of [390, 768, 1440]) {
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

test('saved modifier activations remain accessible inside modifier results', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockHistory(page)
  await page.goto('/panel/game-history?gameId=game-0')
  await page.getByRole('tab', { name: 'Модификаторы', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Активации', exact: true })).toHaveCount(0)
  const journal = page.getByRole('button', { name: 'История модификаторов', exact: true })
  await journal.click()
  await expect(journal).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('Архивный модификатор', { exact: true })).toHaveCount(2)
  await expect(page.getByText('Активировал: Капитан', { exact: false }).first()).toBeVisible()
  await assertBounded(page, 1440, 900)
})

for (const width of [390, 768, 1440]) {
  test(
    'archived board opens at full width and preserves results at ' + width + 'px',
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await mockHistory(page)
      const mutations: string[] = []
      page.on('request', (request) => {
        if (request.method() !== 'GET' && request.url().includes('/api/game/'))
          mutations.push(request.url())
      })
      await page.goto('/panel/game-history?gameId=game-24')
      await expect(page.getByRole('tab', { name: 'Игра', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      await page.getByRole('tab', { name: 'Викторина', exact: true }).click()
      await page.getByRole('button', { name: 'Посмотреть доску', exact: true }).click()
      await expect.poll(() => new URL(page.url()).searchParams.get('view')).toBe('board')
      await expect.poll(() => new URL(page.url()).searchParams.get('gameId')).toBe('game-24')
      const board = page.getByTestId('history-board-view')
      await expect(
        page.getByRole('heading', { name: 'Архивная игра 25', exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('region', { name: 'Завершённые игры', exact: true }),
      ).not.toBeVisible()
      const bounds = await board.boundingBox()
      expect(bounds!.width).toBeGreaterThan(width * 0.85)
      const context = board.getByTestId('game-board-context')
      await expect(
        context.getByRole('heading', { name: 'Архивная игра 25', exact: true }),
      ).toBeVisible()
      const contextBox = await context.boundingBox()
      const fieldBox = await board.locator('[data-board-field]').boundingBox()
      if (width >= 1440) {
        expect(contextBox!.x + contextBox!.width).toBeLessThan(fieldBox!.x)
        expect(Math.abs(contextBox!.y - fieldBox!.y)).toBeLessThanOrEqual(1)
      } else {
        expect(contextBox!.y + contextBox!.height).toBeLessThanOrEqual(fieldBox!.y)
      }
      expect(
        await board.evaluate((element) => element.scrollWidth - element.clientWidth),
      ).toBeLessThanOrEqual(1)
      const open = board.locator('[data-cell-id="archived-cell-0"]')
      await expect(open).toBeEnabled()
      await expect(board.locator('[data-cell-id="archived-cell-20"]')).toBeDisabled()
      await assertBounded(page, width, 900)
      await page.screenshot({
        path: testInfo.outputPath('history-board.png'),
        animations: 'disabled',
      })
      await open.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByText('Описание из прошлой игры', { exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await page.getByRole('button', { name: 'Вернуться к каталогу игры', exact: true }).click()
      await expect.poll(() => new URL(page.url()).searchParams.get('view')).toBeNull()
      await expect.poll(() => new URL(page.url()).searchParams.get('gameId')).toBe('game-24')
      await expect(page.getByRole('tab', { name: 'Викторина', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      expect(mutations).toEqual([])
      await page.getByRole('button', { name: 'Посмотреть доску', exact: true }).click()
      await page.reload()
      await expect(
        page.getByRole('heading', { name: 'Архивная игра 25', exact: true }),
      ).toBeVisible()
      await assertBounded(page, width, 900)
    },
  )
}

test('a game without a public comment leaves no empty action or comment panel', async ({
  page,
}) => {
  await mockHistory(page, '   ')
  await page.goto('/panel/game-history?gameId=game-0')
  await expect(page.getByRole('heading', { name: 'Архивная игра 1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Комментарий к игре', exact: true })).toHaveCount(0)
  await expect(page.getByText('Публичный комментарий', { exact: true })).toHaveCount(0)
})

test('archived statistics show only the completed game summary', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockHistory(page)
  await page.goto('/panel/game-history?gameId=game-0')
  await page.getByRole('tab', { name: 'Статистика', exact: true }).click()
  const stats = page.getByTestId('current-game-statistics')
  await expect(stats.getByRole('group', { name: 'Завершено раундов', exact: true })).toContainText(
    '1',
  )
  await expect(stats.getByRole('group', { name: 'Сыгравших команд', exact: true })).toContainText(
    '1',
  )
  await expect(stats.getByRole('group')).toHaveCount(16)
  await expect(stats.getByRole('region', { name: 'Время игры', exact: true })).toHaveCount(0)
  await assertBounded(page, 1440, 900)
  await page.screenshot({
    path: testInfo.outputPath('archived-statistics.png'),
    animations: 'disabled',
  })
})

for (const width of [390, 1440]) {
  test(
    'long game comment keeps its close action visible at ' + width + 'px',
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      const note = 'Длинный комментарий с итогами игры.\n'.repeat(100)
      await mockHistory(page, note)
      await page.goto('/panel/game-history?gameId=game-0')
      const trigger = page.getByRole('button', { name: 'Комментарий к игре', exact: true })
      await trigger.click()
      const dialog = page.getByRole('dialog', { name: 'Комментарий к игре', exact: true })
      await expect(dialog.getByText(note.trim(), { exact: true })).toBeVisible()
      const close = dialog.getByRole('button', { name: 'Закрыть', exact: true })
      await expect(close).toBeInViewport()
      expect(
        await dialog
          .locator('.MuiDialogContent-root')
          .evaluate((element) => element.scrollHeight > element.clientHeight),
      ).toBe(true)
      await assertBounded(page, width, 900)
      await page.screenshot({
        path: testInfo.outputPath('long-comment.png'),
        animations: 'disabled',
      })
      await close.click()
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
    },
  )
}

test('game archive retains tab and selected team while restoring games and search', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockHistory(page)
  await page.goto('/panel/game-history?gameId=game-0')
  await page.getByRole('row', { name: 'Команда с длинным названием 2', exact: true }).click()
  await page.getByRole('tab', { name: 'Викторина', exact: true }).click()
  const original = page.url()
  await page
    .getByRole('region', { name: 'Завершённые игры', exact: true })
    .getByRole('button', { name: /Архивная игра 2 / })
    .click()
  await expect(page.getByRole('heading', { name: 'Архивная игра 2', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Викторина', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect.poll(() => new URL(page.url()).searchParams.get('teamId')).toBeNull()
  await page.goBack()
  await expect(page).toHaveURL(original)
  await expect(page.getByRole('tab', { name: 'Викторина', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.reload()
  await expect(page.getByRole('tab', { name: 'Викторина', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('tab', { name: 'Игра', exact: true }).click()
  await expect(
    page.getByRole('row', { name: 'Команда с длинным названием 2', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  const picker = page.getByRole('region', { name: 'Завершённые игры', exact: true })
  const rows = picker.getByRole('button')
  const backgrounds = await rows.evaluateAll((elements) =>
    elements.slice(0, 3).map((el) => getComputedStyle(el).backgroundImage),
  )
  expect(backgrounds[0]).not.toEqual(backgrounds[1])
  expect(backgrounds[0]).toEqual(backgrounds[2])
  await page.screenshot({
    path: testInfo.outputPath('game-picker-centered.png'),
    animations: 'disabled',
  })
  await page.getByRole('textbox', { name: 'Поиск игр' }).fill('игра 25')
  await picker.getByRole('button', { name: /Архивная игра 25/ }).click()
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Поиск игр' })).toHaveValue('игра 25')
  await expect(page.getByRole('heading', { name: 'Архивная игра 25', exact: true })).toBeVisible()
})
