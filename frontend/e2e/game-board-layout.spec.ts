import { expect, test, type Locator, type Page } from '@playwright/test'
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
  onGameBoardSocket?: (send: (message: string) => void) => void,
) {
  const writes: string[] = []
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  await page.routeWebSocket(/\/hubs\/game-board/, (socket) => {
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) {
        socket.send('{}\u001e')
        onGameBoardSocket?.((event) => socket.send(event))
      }
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

const activeRoundFixture = {
  roundId: 'round-one',
  gameId: board.gameId,
  cellId: 'card-0',
  cellTitle: 'Следы на болотах',
  cellDescription: 'Описание испытания, доступное после открытия карточки.',
  teamId: 'team-one',
  teamName: 'Ночные странники',
  teamSlotIndex: 1,
  status: 'awaiting_modifiers',
  roundVersion: 1,
  startedAtUtc: '2026-09-01T12:00:00Z',
  serverNowUtc: '2026-09-01T12:00:00Z',
  baseScore: 100,
  participants: [{ userId: 'player-one', displayName: 'Ворон' }],
  modifierResults: [],
  emptyCardPenaltyApplied: false,
  killsCount: 0,
  bountyCount: 0,
  scoreDetails: { finalScore: 0, calculationLines: [] },
}

async function expectHorizontallyCentered(content: Locator, half: Locator) {
  const contentBox = await content.boundingBox()
  const halfBox = await half.boundingBox()
  expect(contentBox).not.toBeNull()
  expect(halfBox).not.toBeNull()
  expect(
    Math.abs(contentBox!.x + contentBox!.width / 2 - halfBox!.x - halfBox!.width / 2),
  ).toBeLessThanOrEqual(2)
}

for (const width of [390, 1440]) {
  test(`current round keeps the board one action away at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const writes = await mockGame(page, 'active', 'viewer')
    let activated = false
    let activationAttempts = 0
    const activation = {
      activationId: 'activation-one',
      roundId: 'round-one',
      roundVersion: 1,
      modifierId: 'modifier-one',
      modifierName: 'Защитный знак',
      activatedByUserId: 'viewer-one',
      activatedByDisplayName: 'Охотник',
      activationCost: 1,
      activatedAtUtc: '2026-09-01T12:01:00Z',
    }
    const modifier = {
      id: 'modifier-one',
      category: 'preparation',
      name: 'Защитный знак',
      description: 'Защищает команду в раунде.',
      activationCost: 1,
      activationLimit: null,
      conflictingModifierIds: [],
      iconEmoji: '🛡️',
      activationCommand: null,
      revision: 1,
      normalizedTags: [],
      behaviorV2: {
        schemaVersion: 2,
        kind: 'rule',
        phase: 'round',
        performer: 'activeTeam',
        requiresHostMonitoring: false,
        rule: 'Защитное правило',
        stackingPolicy: 'aggregateParameters',
        resolution: { type: 'ruleStatus' },
        reward: 'none',
        formulaReference: null,
      },
    }
    await page.route('**/api/game/rounds/active', (route) =>
      route.fulfill({
        json: activeRoundFixture,
      }),
    )
    await page.route('**/api/game/modifiers/state', (route) =>
      route.fulfill({
        json: {
          gameId: board.gameId,
          availableQuizPoints: 10,
          earnedQuizPoints: 10,
          spentQuizPoints: 0,
          isOrderingOpen: true,
          activeModifiers: activated ? [activation] : [],
          availableModifiers: [
            {
              modifier,
              isActive: activated,
              canActivate: !activated,
              blockedReason: activated ? 'limit_reached' : null,
              activationsCount: activated ? 1 : 0,
              limit: activated ? 1 : null,
            },
          ],
        },
      }),
    )
    await page.route('**/api/game/modifiers/modifier-one/activate', (route) => {
      activationAttempts += 1
      if (activationAttempts === 1) return route.fulfill({ status: 500 })
      activated = true
      return route.fulfill({ json: activation })
    })
    await page.goto('/panel/game-round')
    const modifiers = page.getByRole('dialog', { name: 'Модификаторы' })
    await expect(modifiers).toBeVisible()
    await modifiers.getByRole('button', { name: 'Активировать модификатор', exact: true }).click()
    const confirmation = page.getByRole('dialog', { name: 'Активировать этот модификатор?' })
    await confirmation
      .getByRole('button', { name: 'Активировать модификатор', exact: true })
      .click()
    await expect(confirmation.getByRole('alert')).toBeVisible()
    await expect(confirmation).toBeVisible()
    expect(activationAttempts).toBe(1)
    await confirmation
      .getByRole('button', { name: 'Активировать модификатор', exact: true })
      .click()
    await expect(confirmation).not.toBeVisible()
    expect(activationAttempts).toBe(2)
    await expect(modifiers).toContainText('Защитный знак')
    await modifiers.getByRole('button', { name: 'Закрыть модификаторы' }).click()
    const overview = page.getByTestId('current-round-overview')
    await expect(overview).toContainText('Следы на болотах')
    await expect(overview).toContainText('Ночные странники')
    await expect(overview).toContainText('Ворон')
    await expect(overview).toContainText('Защитный знак')
    await page.screenshot({
      path: testInfo.outputPath('current-round.png'),
      animations: 'disabled',
    })
    await page.getByRole('main').getByRole('link', { name: 'Посмотреть доску' }).click()
    await expect(page).toHaveURL(/\/panel\/game-board$/)
    await expect(page.getByTestId('game-board-surface')).toBeVisible()
    await page.getByRole('link', { name: 'Открыть текущий раунд' }).click()
    await expect(page).toHaveURL(/\/panel\/game-round$/)
    expect(writes).toEqual([])
  })
}

for (const role of ['viewer', 'admin']) {
  test(`opening a card keeps ${role === 'viewer' ? 'a player' : 'staff'} on the board`, async ({
    page,
  }) => {
    let sendEvent: ((message: string) => void) | undefined
    let roundOpened = false
    await mockGame(page, 'active', role, 'Ночные странники', (send) => {
      sendEvent = send
    })
    await page.route('**/api/game/rounds/active', (route) =>
      roundOpened
        ? route.fulfill({ json: { ...activeRoundFixture, status: 'preparing' } })
        : route.fulfill({ status: 204 }),
    )
    await page.route('**/api/game/modifiers/state', (route) =>
      route.fulfill({
        json: {
          gameId: board.gameId,
          availableQuizPoints: 10,
          earnedQuizPoints: 10,
          spentQuizPoints: 0,
          isOrderingOpen: false,
          activeModifiers: [],
          availableModifiers: [],
        },
      }),
    )
    const initialRoundResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/game/rounds/active'),
    )
    await page.goto('/panel/game-board')
    await expect(page.getByTestId('game-board-surface')).toBeVisible()
    await initialRoundResponse
    await expect.poll(() => Boolean(sendEvent)).toBe(true)
    roundOpened = true
    sendEvent?.(
      JSON.stringify({
        type: 1,
        target: 'cellOpened',
        arguments: [{ gameId: board.gameId, version: 2, cell: board.cells[0] }],
      }) + '\u001e',
    )
    await expect(page.getByRole('link', { name: 'Открыть текущий раунд' })).toBeVisible()
    await expect(page).toHaveURL(/\/panel\/game-board$/)
  })
}

test('a player can reopen the active round by clicking its card on the board', async ({ page }) => {
  await mockGame(page, 'active', 'viewer')
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'in_progress' } }),
  )
  await page.goto('/panel/game-board')

  const card = page.locator('[data-cell-id="card-0"]')
  await expect(card).toHaveAttribute('aria-label', 'Открыть текущий раунд')
  await card.click()

  await expect(page).toHaveURL(/\/panel\/game-round$/)
})

test('staff also opens the active round from its card', async ({ page }) => {
  await mockGame(page, 'active', 'admin')
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'in_progress' } }),
  )
  await page.goto('/panel/game-board')

  await page.locator('[data-cell-id="card-0"]').click()

  await expect(page).toHaveURL(/\/panel\/game-round$/)
})

test('a question opens on the round screen and accepts an answer without leaving it', async ({
  page,
}) => {
  let selectedOptionId: string | null = null
  const writes = await mockGame(page, 'active', 'viewer')
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'in_progress' } }),
  )
  await page.route('**/api/game/modifiers/state', (route) =>
    route.fulfill({
      json: {
        gameId: board.gameId,
        availableQuizPoints: 10,
        earnedQuizPoints: 10,
        spentQuizPoints: 0,
        isOrderingOpen: false,
        activeModifiers: [],
        availableModifiers: [],
      },
    }),
  )
  await page.route('**/api/game/quiz/current', (route) =>
    route.fulfill({
      json: {
        questionSessionId: 'quiz-one',
        gameId: board.gameId,
        askOrder: 1,
        questionId: 'question-one',
        questionCode: 'Q-1',
        categoryName: 'Охота',
        text: 'Куда ведут следы?',
        options: [
          { optionId: 'option-one', text: 'К болоту', displayOrder: 1 },
          { optionId: 'option-two', text: 'К лесу', displayOrder: 2 },
        ],
        status: selectedOptionId ? 'closed' : 'open',
        correctOptionId: selectedOptionId,
        myIsCorrect: selectedOptionId ? true : null,
        myAwardedPoints: selectedOptionId ? 10 : null,
        reward: 10,
        askedAtUtc: new Date(Date.now() - 1_000).toISOString(),
        closesAtUtc: new Date(Date.now() + 60_000).toISOString(),
        mySelectedOptionId: selectedOptionId,
      },
    }),
  )
  await page.route('**/api/game/quiz/question-sessions/quiz-one/submissions', (route) => {
    selectedOptionId = 'option-one'
    return route.fulfill({
      json: {
        submissionId: 'submission-one',
        questionSessionId: 'quiz-one',
        userId: 'player-one',
        selectedOptionId,
        submittedAtUtc: new Date().toISOString(),
        isExisting: false,
      },
    })
  })
  await page.goto('/panel/game-round')
  const question = page.getByRole('dialog', { name: 'Текущий вопрос' })
  await expect(question).toBeVisible()
  await expect(question).toContainText('Куда ведут следы?')
  await question.getByRole('button', { name: 'К болоту' }).click()
  await expect(question).toBeVisible()
  await expect(question.locator('[data-quiz-result="correct"]')).toContainText('К болоту')
  await expect(question.getByRole('button', { name: /К болоту/ })).toBeDisabled()
  await question.getByRole('button', { name: 'Закрыть вопрос' }).click()
  await page.getByRole('button', { name: 'Открыть вопрос' }).click()
  await expect(question.locator('[data-quiz-result="correct"]')).toBeVisible()
  await expect(page).toHaveURL(/\/panel\/game-round$/)
  expect(writes).toEqual([])
})

test('round refresh errors preserve content and ordering takes priority over the quiz', async ({
  page,
}) => {
  let sendEvent: ((message: string) => void) | undefined
  let phase = 'in_progress'
  let refreshFails = false
  await mockGame(page, 'active', 'viewer', 'Ночные странники', (send) => {
    sendEvent = send
  })
  await page.route('**/api/game/rounds/active', (route) =>
    refreshFails
      ? route.fulfill({ status: 500 })
      : route.fulfill({ json: { ...activeRoundFixture, status: phase } }),
  )
  await page.route('**/api/game/modifiers/state', (route) =>
    route.fulfill({
      json: {
        gameId: board.gameId,
        availableQuizPoints: 10,
        earnedQuizPoints: 10,
        spentQuizPoints: 0,
        isOrderingOpen: phase === 'awaiting_modifiers',
        activeModifiers: [],
        availableModifiers: [],
      },
    }),
  )
  await page.route('**/api/game/quiz/current', (route) =>
    route.fulfill({
      json: {
        questionSessionId: 'quiz-priority',
        gameId: board.gameId,
        askOrder: 1,
        questionId: 'question-priority',
        questionCode: 'Q-3',
        categoryName: 'Охота',
        text: 'Какой путь выбрать?',
        options: [{ optionId: 'one', text: 'К берегу', displayOrder: 1 }],
        status: 'open',
        askedAtUtc: new Date().toISOString(),
        closesAtUtc: new Date(Date.now() + 60_000).toISOString(),
      },
    }),
  )
  const update = () =>
    sendEvent?.(
      JSON.stringify({ type: 1, target: 'roundStateChanged', arguments: [{}] }) + '\u001e',
    )
  await page.goto('/panel/game-round')
  const question = page.getByRole('dialog', { name: 'Текущий вопрос' })
  const modifiers = page.getByRole('dialog', { name: 'Модификаторы', exact: true })
  await expect(question).toBeVisible()
  await expect.poll(() => Boolean(sendEvent)).toBe(true)
  phase = 'awaiting_modifiers'
  update()
  await expect(modifiers).toBeVisible()
  await expect(question).not.toBeVisible()
  await modifiers.getByRole('button', { name: 'Закрыть модификаторы' }).click()
  refreshFails = true
  update()
  const overview = page.getByTestId('current-round-overview')
  await expect(
    page.getByRole('main').getByRole('button', { name: 'Повторить', exact: true }),
  ).toBeVisible()
  await expect(overview).toContainText('Следы на болотах')
  await expect(question).not.toBeVisible()
  refreshFails = false
  phase = 'in_progress'
  await page.getByRole('main').getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(question).toBeVisible()
  await expect(modifiers).not.toBeVisible()
  await expect(page).toHaveURL(/\/panel\/game-round$/)
})

test('a question also reaches a player on the board between rounds', async ({ page }) => {
  await mockGame(page, 'active', 'viewer')
  await page.route('**/api/game/quiz/current', (route) =>
    route.fulfill({
      json: {
        questionSessionId: 'quiz-between-rounds',
        gameId: board.gameId,
        askOrder: 1,
        questionId: 'question-between-rounds',
        questionCode: 'Q-2',
        categoryName: 'Охота',
        text: 'Какой путь выбрать?',
        options: [{ optionId: 'option-one', text: 'К берегу', displayOrder: 1 }],
        status: 'open',
        askedAtUtc: new Date(Date.now() - 1_000).toISOString(),
        closesAtUtc: new Date(Date.now() + 60_000).toISOString(),
      },
    }),
  )
  await page.goto('/panel/game-board')
  const question = page.getByRole('dialog', { name: 'Текущий вопрос' })
  await expect(question).toContainText('Какой путь выбрать?')
  await question.getByRole('button', { name: 'Закрыть вопрос' }).click()
  await expect(page.getByTestId('game-board-surface')).toBeVisible()
  await page.getByRole('button', { name: 'Открыть вопрос' }).click()
  await expect(question).toBeVisible()
  await expect(page).toHaveURL(/\/panel\/game-board$/)
})

for (const touch of [false, true]) {
  test(`active team roster tooltip works with ${touch ? 'touch' : 'mouse and keyboard'}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: touch ? 390 : 1440, height: 900 },
      hasTouch: touch,
    })
    const page = await context.newPage()
    const writes = await mockGame(page)
    await page.goto('/panel/game-board')
    const team = page.getByRole('button', { name: 'Ночные странники', exact: true })
    await expect(team).toBeVisible()
    const status = page.getByTestId('game-board-context')
    const statusBefore = await status.boundingBox()
    const card = page.locator('[data-cell-id="card-0"]')
    const cardBefore = await card.boundingBox()
    if (touch) await team.tap()
    else await team.hover()
    const tooltip = page.getByRole('tooltip')
    await expect(tooltip).toContainText('Искатель приключений')
    await expect(tooltip).toContainText('Ворон')
    await expect(tooltip).not.toContainText('Ночные странники')
    await expect(tooltip).not.toContainText('Стрелок')
    const tooltipBox = await tooltip.boundingBox()
    expect(tooltipBox!.x).toBeGreaterThanOrEqual(0)
    expect(tooltipBox!.x + tooltipBox!.width).toBeLessThanOrEqual(touch ? 390 : 1440)
    expect(await status.boundingBox()).toEqual(statusBefore)
    expect(await card.boundingBox()).toEqual(cardBefore)
    if (touch) {
      await page.locator('body').tap({ position: { x: 5, y: 400 } })
    } else {
      await page.mouse.move(5, 400)
    }
    await expect(tooltip).not.toBeVisible()
    if (!touch) {
      await team.focus()
      await expect(tooltip).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(tooltip).not.toBeVisible()
    }
    expect(writes).toEqual([])
    await context.close()
  })
}

for (const width of [320, 390, 768, 1024, 1200, 1440, 1920, 2560]) {
  test(`game board is readable and operable at ${width}px`, async ({ page }) => {
    const height =
      width === 320
        ? 700
        : width === 390
          ? 844
          : width === 768
            ? 800
            : width === 1440
              ? 900
              : width === 2560
                ? 1440
                : 1080
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
    if (width >= 1200) {
      expect((await page.getByRole('banner').boundingBox())!.height).toBe(58)
      expect(statusBox!.width).toBeLessThanOrEqual(541)
    }
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
      expect(teamsBox!.height).toBe(130)
      expect(managementBox!.height).toBe(130)
      expect(Math.abs(teamsBox!.y + teamsBox!.height / 2 - height / 2)).toBeLessThan(1)
      expect(teamsBox!.x + teamsBox!.width).toBeLessThan(firstCardBox!.x)
      const lastCard = await region.locator('[data-cell-id="card-4"]').boundingBox()
      expect(managementBox!.x).toBeGreaterThan(lastCard!.x + lastCard!.width)
      expect(Math.abs(managementBox!.y - teamsBox!.y)).toBeLessThan(1)
    } else {
      expect(teamsBox!.x + teamsBox!.width).toBeLessThanOrEqual(managementBox!.x - 4)
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
      expect(cell.width).toBeGreaterThanOrEqual(width < 600 ? 111 : 79)
      expect(Math.abs(cell.height - cell.width * 1.5)).toBeLessThan(1)
      expect(cell.scroll).toBeLessThanOrEqual(cell.client + 1)
      if (width >= 1024) expect(cell.bottom).toBeLessThanOrEqual(height)
    }
    if (width === 1920 || width === 2560) {
      const valueSize = await region
        .locator('[data-cell-id="card-2"] [data-card-value]')
        .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
      if (width === 1920) expect(valueSize).toBeLessThanOrEqual(20)
      else expect(valueSize).toBeGreaterThanOrEqual(24)
      const statusSize = await page
        .getByTestId('game-board-status-title')
        .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
      expect(statusSize).toBe(14.4)
    }
    if (width >= 1024) {
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
      ).toBe(true)
    }
    await page.screenshot({ path: `../.tmp/game-board-design/board-${width}.png`, fullPage: true })
    await expect(page.getByRole('button', { name: 'Открыть очередь команд' })).toBeVisible()
    await page.getByRole('button', { name: 'Открыть очередь команд' }).click()
    await expect(page.getByRole('complementary', { name: 'Очередь команд' })).toBeVisible()
    const queue = page.getByRole('complementary', { name: 'Очередь команд' })
    await expect.poll(async () => (await page.getByRole('dialog').boundingBox())!.x).toBe(0)
    expect(
      (await queue.getByRole('heading', { name: 'Очередь команд' }).boundingBox())!.y,
    ).toBeGreaterThanOrEqual(16)
    await page.screenshot({
      path: `../.tmp/game-board-design/teams-${width}.png`,
    })
    expect(
      (await queue.getByRole('heading', { name: 'Очередь команд' }).boundingBox())!.y,
    ).toBeGreaterThanOrEqual(16)
    await queue.getByRole('textbox', { name: 'Найти команду или игрока' }).fill('ворон')
    await expect(queue.getByRole('heading', { name: 'Ночные странники' })).toBeVisible()
    await expect(queue.getByRole('heading', { name: 'Последний рубеж' })).toHaveCount(0)
    await queue
      .getByRole('textbox', { name: 'Найти команду или игрока' })
      .fill('несуществующая команда')
    await expect(queue.getByRole('status')).toContainText('Команды не найдены')
    await queue.getByRole('button', { name: 'Очистить поиск команд' }).click()
    await expect(queue.getByRole('heading', { name: 'Последний рубеж' })).toBeVisible()
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
    const management = page.getByTestId('game-management-tool')
    await expect(management.getByText('Фаза раунда', { exact: true })).toHaveCount(0)
    await expect(management.getByRole('heading', { name: 'Ассистент раунда' })).toBeVisible()
    await expect(management.getByRole('heading', { name: 'Активная команда' })).toBeVisible()
    for (const section of ['round', 'team', 'manual-quiz', 'finish-game']) {
      const block = management.getByTestId(`management-${section}-section`)
      await expect(block).toBeVisible()
      if (section === 'manual-quiz' || section === 'finish-game') {
        const trigger = block.getByRole('button').first()
        await expect(trigger).toHaveAttribute('aria-expanded', /true|false/)
        await expect(trigger).toHaveAttribute('aria-controls', /.+/)
      } else {
        expect(
          await block.evaluate((element) => parseFloat(getComputedStyle(element).borderTopWidth)),
        ).toBeGreaterThanOrEqual(1)
      }
    }
    const assistantBounds = await management.getByTestId('management-round-section').boundingBox()
    const teamBounds = await management.getByTestId('management-team-section').boundingBox()
    expect(teamBounds!.y - assistantBounds!.y - assistantBounds!.height).toBeGreaterThanOrEqual(15)
    for (const label of ['Снять активную команду', 'Отметить как отыгравшую']) {
      const action = management.getByRole('button', { name: label, exact: true })
      await expect(action).toHaveClass(/MuiButton-outlinedPrimary/)
      await expect(action).toBeEnabled()
    }
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
              elements.every((element) => element.getBoundingClientRect().width >= 79),
            ),
        )
        .toBe(true)
      await region.locator('[data-cell-id]').last().scrollIntoViewIfNeeded()
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
      await expect(region.locator('[data-cell-id]').last()).toBeInViewport()
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
  const management = page.getByRole('button', { name: 'Управление игрой', exact: true })
  const teamsBox = await teams.boundingBox()
  const managementBox = await management.boundingBox()
  expect(teamsBox!.y + teamsBox!.height / 2).toBe(450)
  expect(managementBox!.y + managementBox!.height / 2).toBe(450)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('complementary', { name: 'Очередь команд' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(teams).toBeFocused()
})

for (const status of ['ready', 'finished'] as const) {
  for (const width of [320, 390, 1440]) {
    test(`shows ${status} state and highlighted player actions at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await mockGame(page, status, 'viewer')
      await page.goto('/panel/game-board')
      await expect(page.getByRole('heading', { name: 'Последняя охота' })).toBeVisible()
      const actionLabel = status === 'ready' ? 'Подать заявку' : 'Открыть результаты'
      const action = page.getByTestId('game-board-context').getByRole('link', { name: actionLabel })
      await expect(action).toBeVisible()
      await expect(action).toHaveClass(/MuiButton-containedPrimary/)
      const label = action.getByTitle(actionLabel)
      const typography = (element: Element) => {
        const style = getComputedStyle(element)
        return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight]
      }
      expect(await label.evaluate(typography)).toEqual(
        await page.getByTestId('game-board-status-title').evaluate(typography),
      )
      expect(
        await label.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
      ).toBe(true)
      await action.focus()
      await expect(action).toBeFocused()
      await page.screenshot({ path: `../.tmp/game-board-design/${status}-${width}.png` })
      await expect(page.getByRole('button', { name: 'Управление игрой' })).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    })
  }
}

for (const width of [320, 1440]) {
  test(`management highlights the round action at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    const writes = await mockGame(page)
    await page.route('**/api/game/rounds/active', (route) =>
      route.fulfill({
        json: {
          ...activeRoundFixture,
          cellId: 'card-0',
          teamId: 'team-one',
          teamName: 'Ночные странники',
          teamSlotIndex: 1,
          status: 'awaiting_modifiers',
          baseScore: 100,
          roundVersion: 1,
        },
      }),
    )
    await page.goto('/panel/game-board')
    await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
    const assistant = page.getByTestId('management-round-section')
    await expect(assistant.getByRole('button')).toBeVisible()
    await expect(assistant.getByRole('button')).toBeEnabled()
    await assistant.locator('summary').click()
    const steps = assistant.getByRole('list', { name: 'Фаза раунда' })
    await expect(steps.getByRole('listitem')).toHaveCount(6)
    await expect(steps.locator('[aria-current="step"]')).toContainText('Активировать модификаторы')
    await assistant.locator('summary').click()
    await expect(page.getByTestId('management-team-section')).toContainText('Ворон')
    for (const label of ['Снять активную команду', 'Отметить как отыгравшую']) {
      const action = page
        .getByTestId('management-team-section')
        .getByRole('button', { name: label, exact: true })
      await expect(action).toHaveClass(/MuiButton-outlinedPrimary/)
      await expect(action).toBeDisabled()
    }
    expect(
      await page
        .getByTestId('admin-tool-drawer-scroll-body')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
    await page.screenshot({
      path: `../.tmp/game-board-design/management-round-${width}.png`,
      animations: 'disabled',
    })
    expect(writes).toEqual([])
  })
}

for (const width of [320, 390, 1440]) {
  test(`live round actions stay visible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 })
    const teamName =
      width === 320 ? 'ОченьДлинноеНазваниеКомандыБезПробеловДляПроверки' : 'Ночные странники'
    await mockGame(page, 'active', 'viewer', teamName)
    await page.route('**/api/game', (route) =>
      route.fulfill({
        json: {
          ...board,
          cells: board.cells.map((cell, index) =>
            index === 0 ? { ...cell, media: [{ url: '/media/cards/current-round.svg' }] } : cell,
          ),
        },
      }),
    )
    await page.route('**/media/cards/current-round.svg', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="120"><rect width="80" height="120" fill="gold"/></svg>',
      }),
    )
    let roundStatus = 'awaiting_modifiers'
    await page.route('**/api/game/rounds/active', (route) =>
      route.fulfill({
        json: {
          ...activeRoundFixture,
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
    const currentCard = page.locator('[data-cell-id="card-0"]')
    await expect(currentCard).toHaveText('Текущий раунд')
    await expect(currentCard.locator('img')).toBeVisible()
    expect(
      await currentCard.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth),
    ).toBe(80)
    if (width < 600) {
      await page.getByRole('tab', { name: 'Оружие', exact: true }).click()
      await page.getByRole('button', { name: 'Текущий раунд', exact: true }).click()
    }
    await expect(page.locator('[data-cell-id="card-0"]')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Открыть текущий раунд' })).toBeVisible()
    const modifierAction = page.getByTestId('game-board-context').getByRole('link', {
      name: 'Открыть текущий раунд',
    })
    await expect(modifierAction).toHaveClass(/MuiButton-containedPrimary/)
    const modifierLabel = modifierAction.getByTitle('Активировать модификаторы')
    const teamValue = page.getByTestId('game-board-status-title')
    const typography = (element: Element) => {
      const style = getComputedStyle(element)
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight]
    }
    expect(await modifierLabel.evaluate(typography)).toEqual(await teamValue.evaluate(typography))
    expect(
      await modifierLabel.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
    ).toBe(true)
    await expect(page.getByTestId('game-board-context')).toContainText(teamName)
    await expect(page.getByTestId('game-board-context')).toContainText('Активная команда')
    await expect(page.getByTestId('game-board-context')).toContainText('Фаза раунда')
    const actionBox = await modifierAction.boundingBox()
    const statusBox = await page.getByTestId('game-board-context').boundingBox()
    const phaseCaptionBox = await modifierAction.getByTitle('Фаза раунда').boundingBox()
    const teamCaptionBox = await page
      .getByTestId('game-board-context')
      .getByTitle('Активная команда')
      .boundingBox()
    const contextHalves = page.getByTestId('game-board-context').locator(':scope > div > *')
    await expectHorizontallyCentered(
      page.getByTestId('game-board-context').getByTitle('Активная команда').locator('..'),
      contextHalves.nth(0),
    )
    await expectHorizontallyCentered(
      page.getByTestId('game-board-status-title'),
      contextHalves.nth(0),
    )
    await expectHorizontallyCentered(
      modifierAction.getByTitle('Фаза раунда').locator('..'),
      contextHalves.nth(1),
    )
    await expectHorizontallyCentered(modifierLabel, contextHalves.nth(1))
    expect(phaseCaptionBox!.y - actionBox!.y).toBeGreaterThanOrEqual(7)
    expect(Math.abs(phaseCaptionBox!.y - teamCaptionBox!.y)).toBeLessThanOrEqual(2)
    expect(actionBox!.height).toBeGreaterThanOrEqual(44)
    expect(statusBox!.height).toBeLessThanOrEqual(76)
    expect(statusBox!.height).toBe(58)
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
    // A phase change keeps the round action and board geometry stable.
    const teamBoxBefore = await page
      .getByTestId('game-board-context')
      .getByTestId('game-board-status-title')
      .boundingBox()
    const cardBoxBefore = await page.locator('[data-cell-id="card-0"]').boundingBox()
    roundStatus = 'in_progress'
    await page.reload()
    await expect(page.getByTestId('game-board-context')).toContainText('Провести игру')
    await expect(page.getByRole('link', { name: 'Открыть текущий раунд' })).toBeVisible()
    expect(
      await page.getByTestId('game-board-context').getByTitle('Провести игру').evaluate(typography),
    ).toEqual(await teamValue.evaluate(typography))
    await expectHorizontallyCentered(
      page.getByTestId('game-board-context').getByTitle('Фаза раунда').locator('..'),
      page.getByTestId('game-board-context').locator(':scope > div > *').nth(1),
    )
    const teamBoxAfter = await page
      .getByTestId('game-board-context')
      .getByTestId('game-board-status-title')
      .boundingBox()
    const cardBoxAfter = await page.locator('[data-cell-id="card-0"]').boundingBox()
    expect(await page.getByTestId('game-board-context').boundingBox()).toEqual(statusBox)
    expect(teamBoxAfter).toEqual(teamBoxBefore)
    expect(cardBoxAfter).toEqual(cardBoxBefore)
  })
}

test('side panels honour reduced motion and expose modal semantics', async ({ page }) => {
  await mockGame(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 640 })
  await page.goto('/panel/game-board')
  const opener = page.getByRole('button', { name: 'Открыть очередь команд' })
  await opener.click()
  const panel = page.getByRole('dialog', { name: 'Очередь команд' })
  await expect(panel).toBeVisible()
  await expect(panel).toHaveAttribute('aria-modal', 'true')
  await expect(panel).toHaveCSS('transition-duration', '0s')
  await page.keyboard.press('Escape')
  await expect(opener).toBeFocused()
  await expect(opener).toHaveCSS('transition-duration', '0s')
})

for (const viewport of [
  { width: 844, height: 390 },
  { width: 390, height: 500 },
]) {
  test(`short viewport preserves readable cards and native keyboard actions at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    const writes = await mockGame(page)
    await page.goto('/panel/game-board')
    const cards = page.locator('[data-cell-id]')
    await expect(cards.first()).toBeVisible()
    const sizes = await cards.evaluateAll((elements) =>
      elements.map((element) => ({
        width: element.getBoundingClientRect().width,
        scroll: element.scrollHeight,
        client: element.clientHeight,
        tag: element.tagName,
      })),
    )
    for (const card of sizes) {
      expect(card.width).toBeGreaterThanOrEqual(viewport.width < 600 ? 111 : 79)
      expect(card.scroll).toBeLessThanOrEqual(card.client + 1)
      expect(card.tag).toBe('BUTTON')
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const last = cards.last()
    await last.scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await expect(last).toBeInViewport()
    await page.locator('[data-cell-id="card-0"]').focus()
    await page.keyboard.press('Space')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-cell-id="card-0"]')).toBeFocused()
    expect(writes).toEqual([])
  })
}

test('a twelve-column board uses categories when its container cannot keep cards readable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 })
  await mockGame(page)
  const largeBoard = {
    ...board,
    cols: 12,
    colLabels: Array.from({ length: 12 }, (_, index) => `Категория ${index + 1}`),
    cells: Array.from({ length: 60 }, (_, index) => ({
      ...board.cells[index % 25]!,
      id: `large-${index}`,
      row: Math.floor(index / 12),
      col: index % 12,
    })),
  }
  await page.route('**/api/game', (route) => route.fulfill({ json: largeBoard }))
  await page.goto('/panel/game-board')
  const categories = page.getByRole('tablist', { name: 'Категории поля' })
  await expect(categories).toBeVisible()
  await expect(page.locator('[data-cell-id]')).toHaveCount(5)
  await page.getByRole('tab', { name: 'Категория 2', exact: true }).click()
  await expect(page.getByRole('tabpanel')).toHaveAccessibleName('Категория 2')
  const status = await page.getByTestId('game-board-context').boundingBox()
  const first = await page.locator('[data-cell-id="large-1"]').boundingBox()
  const second = await page.locator('[data-cell-id="large-13"]').boundingBox()
  expect(
    Math.abs(status!.x + status!.width / 2 - (first!.x + second!.x + second!.width) / 2),
  ).toBeLessThan(1)
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.locator('[data-cell-id]')).toHaveCount(60)
  expect(
    await page
      .locator('[data-cell-id]')
      .evaluateAll((elements) =>
        elements.every((element) => element.getBoundingClientRect().width >= 79),
      ),
  ).toBe(true)
  await page.setViewportSize({ width: 768, height: 900 })
  await expect(page.getByRole('tabpanel')).toHaveAccessibleName('Категория 2')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

for (const width of [320, 1440]) {
  test(`round result counters preserve a draft across resize at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const writes = await mockGame(page)
    const score = {
      scoreUnit: 100,
      killsScore: 0,
      bountyScore: 0,
      modifierKillDelta: 0,
      modifierKillScore: 0,
      modifierScoreDelta: 0,
      emptyCardPenaltyApplied: false,
      emptyCardPenaltyScore: 0,
      penaltyTotal: 0,
      bonusDelta: 0,
      totalKillCount: 0,
      finalScore: 0,
      calculationLines: [],
    }
    await page.route('**/api/game/rounds/active', (route) =>
      route.fulfill({
        json: {
          roundId: 'round-one',
          gameId: 'board-layout',
          cellId: 'card-0',
          cellTitle: 'Следы на болотах',
          teamId: 'team-one',
          teamName: 'Ночные странники',
          teamSlotIndex: 1,
          status: 'reviewing_results',
          baseScore: 100,
          roundVersion: 1,
          startedAtUtc: '2026-09-01T12:00:00Z',
          gameplayStartedAtUtc: '2026-09-01T12:00:00Z',
          reviewedAtUtc: '2026-09-01T12:02:00Z',
          serverNowUtc: '2026-09-01T12:02:00Z',
          participants: [],
          modifierResults: [],
          killsCount: 0,
          bountyCount: 0,
          emptyCardPenaltyApplied: false,
          scoreDetails: score,
        },
      }),
    )
    await page.route('**/api/game/rounds/round-one/score-preview', (route) =>
      route.fulfill({
        json: {
          scoreDetails: score,
          modifierResults: [],
          roundVersion: 1,
          normalizedInputHash: 'preview-hash',
          calculationTrace: [],
        },
      }),
    )
    await page.goto('/panel/game-board')
    await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
    await page.getByRole('button', { name: 'Заполнить итоги раунда', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Итоги раунда', exact: true })
    const kills = dialog.getByRole('spinbutton', { name: 'Убитые враги', exact: true })
    const plus = dialog.getByRole('button', { name: 'Увеличить: Убитые враги', exact: true })
    const minus = dialog.getByRole('button', { name: 'Уменьшить: Убитые враги', exact: true })
    await expect(minus).toBeDisabled()
    await plus.focus()
    await page.keyboard.press('Space')
    await expect(kills).toHaveValue('1')
    const buttonBox = await plus.boundingBox()
    expect(buttonBox!.width).toBeGreaterThanOrEqual(44)
    expect(buttonBox!.height).toBeGreaterThanOrEqual(44)
    await kills.fill('7')
    await page.setViewportSize({ width: width === 320 ? 1440 : 320, height: 900 })
    await expect(kills).toHaveValue('7')
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    )
    await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click()
    const confirmation = page.getByRole('dialog', { name: 'Закрыть итоги без сохранения?' })
    await confirmation.getByRole('button', { name: 'Продолжить редактирование' }).click()
    await expect(kills).toHaveValue('7')
    await page.setViewportSize({ width, height: 900 })
    await kills.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: testInfo.outputPath('result-form.png'),
      animations: 'disabled',
    })
    expect(writes).toEqual([])
  })
}

test('card background and preview load through the shared image component', async ({ page }) => {
  const writes = await mockGame(page)
  await page.route('**/media/cards/ui-check.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="120"><rect width="80" height="120" fill="gold"/></svg>',
    }),
  )
  await page.route('**/api/game', (route) =>
    route.fulfill({
      json: {
        ...board,
        cells: board.cells.map((cell, index) =>
          index === 0 ? { ...cell, media: [{ url: '/media/cards/ui-check.svg' }] } : cell,
        ),
      },
    }),
  )
  await page.goto('/panel/game-board')
  const card = page.locator('[data-cell-id="card-0"]')
  await expect(card.locator('img')).toBeVisible()
  expect(await card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(
    80,
  )
  await card.click()
  const dialog = page.getByRole('dialog', { name: 'Следы на болотах', exact: true })
  await expect(dialog.getByRole('img', { name: 'Следы на болотах' })).toBeVisible()
  expect(writes).toEqual([])
})

for (const width of [390, 768, 1440]) {
  test(`played card keeps its two-line result readable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 768 ? 800 : 900 })
    const writes = await mockGame(page)
    const finalScore = width === 1440 ? 1234 : 145
    await page.route('**/api/game/history/games/board-layout', (route) =>
      route.fulfill({
        json: {
          mainGame: {
            rounds: [
              {
                roundId: 'played-round',
                cellId: 'card-0',
                cellTitle: 'Следы на болотах',
                cellDescription: '',
                cellCost: 100,
                cellMedia: [],
                teamName: 'Ночные призраки',
                teamSlotIndex: 1,
                finalScore,
                baseScore: 100,
                emptyCardPenaltyApplied: false,
                scoreDetails: {
                  scoreUnit: 100,
                  killsScore: 100,
                  bountyScore: 0,
                  modifierKillDelta: 0,
                  modifierKillScore: 0,
                  modifierScoreDelta: finalScore - 100,
                  emptyCardPenaltyApplied: false,
                  emptyCardPenaltyScore: 0,
                  penaltyTotal: 0,
                  bonusDelta: finalScore - 100,
                  totalKillCount: 1,
                  finalScore,
                  calculationLines: [],
                },
                killsCount: 1,
                bountyCount: 0,
                status: 'completed',
                finishedAtUtc: '2026-09-01T12:00:00Z',
                modifiers: [],
                participants: [
                  { userId: 'p1', displayName: 'Александр Неверовский' },
                  { userId: 'p2', displayName: 'Екатерина Савельева' },
                  { userId: 'p3', displayName: 'Игрок с длинным именем' },
                ],
              },
            ],
          },
        },
      }),
    )
    await page.goto('/panel/game-board')
    const card = page.locator('[data-cell-id="card-0"]')
    const label = card.getByTestId('played-cell-result-label')
    const points = card.getByTestId('played-cell-result-points')
    await expect(label).toHaveText('Итог')
    await expect(points).toHaveText(`${finalScore} очк.`)
    await expect(card).not.toContainText('Ночные призраки')
    await expect(card).not.toContainText('Александр Неверовский')
    const labelBox = await label.boundingBox()
    const pointsBox = await points.boundingBox()
    expect(labelBox!.y + labelBox!.height).toBeLessThan(pointsBox!.y)
    await expect(label).toHaveCSS('white-space', 'nowrap')
    await expect(points).toHaveCSS('white-space', 'nowrap')
    expect(await label.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    )
    expect(await points.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    )
    expect(await card.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(
      true,
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width >= 768) {
      const last = await page.locator('[data-cell-id="card-24"]').boundingBox()
      if (width === 1440) expect(last!.y + last!.height).toBeLessThanOrEqual(900)
      const bounds = await card.boundingBox()
      expect(bounds!.width).toBeGreaterThanOrEqual(width === 768 ? 79 : 80)
    }
    await page.screenshot({ path: testInfo.outputPath('played-board.png'), fullPage: true })
    expect(writes).toEqual([])
  })
}
