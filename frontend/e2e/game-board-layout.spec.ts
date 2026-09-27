import { expect, test, type Page } from '@playwright/test'
import type { GameBoardSnapshot } from '../src/shared/api/contracts/index.ts'
import { realtimeHubs } from '../src/shared/realtime/generated.ts'

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
  queueSize = 2,
  playedScore: number | null = 75,
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
            gameId: board.gameId,
            teams: [
              {
                teamId: 'team-one',
                teamName,
                teamSlotIndex: 1,
                isPlayed: false,
                playedAtUtc: null,
                finalScore: null,
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
                playedAtUtc: '2026-09-01T10:00:00Z',
                finalScore: playedScore,
                participants: [{ userId: 'player-three', displayName: 'Стрелок' }],
              },
              ...Array.from({ length: Math.max(0, queueSize - 2) }, (_, index) => ({
                teamId: `extra-${index}`,
                teamName: `Команда ${index + 3}`,
                teamSlotIndex: index + 3,
                isPlayed: false,
                playedAtUtc: null,
                finalScore: null,
                participants: [{ userId: `extra-player-${index}`, displayName: `Игрок ${index}` }],
              })),
            ],
            summary: { totalTeams: queueSize, playedTeams: 1, remainingTeams: queueSize - 1 },
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

async function expandProgress(page: Page) {
  const toggle = page.getByTestId('game-board-phase-toggle')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const detailsId = await toggle.getAttribute('aria-controls')
  await expect(page.locator(`[id="${detailsId}"]`)).toHaveClass(/MuiCollapse-entered/)
  await page.evaluate(() => document.fonts.ready)
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

for (const width of [390, 1440]) {
  test(`current round keeps the board one action away at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const writes = await mockGame(page, 'active', 'viewer')
    let activated = false
    let activationAttempts = 0
    let modifierEnabled = true
    let cancellationAttempts = 0
    const activation = {
      activationId: 'activation-one',
      roundId: 'round-one',
      roundVersion: 1,
      modifierId: 'modifier-one',
      modifierName: 'Защитный знак',
      activatedByUserId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
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
          availableModifiers: modifierEnabled
            ? [
                {
                  modifier,
                  isActive: activated,
                  canActivate: !activated,
                  blockedReason: activated ? 'limit_reached' : null,
                  activationsCount: activated ? 1 : 0,
                  limit: activated ? 1 : null,
                },
              ]
            : [],
        },
      }),
    )
    await page.route('**/api/game/modifiers/modifier-one/activate', (route) => {
      activationAttempts += 1
      if (activationAttempts === 1) return route.fulfill({ status: 500 })
      activated = true
      return route.fulfill({ status: 204 })
    })
    await page.route('**/api/game/modifiers/activations/activation-one/self-cancel', (route) => {
      expect(route.request().postDataJSON()).toEqual({ expectedRoundVersion: 1 })
      cancellationAttempts += 1
      if (cancellationAttempts === 1) return route.fulfill({ status: 500 })
      activated = false
      return route.fulfill({ status: 204 })
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
    await expect(page.getByText('Не удалось активировать модификатор.')).toHaveCount(0)
    await expect(modifiers).toContainText('Защитный знак')
    await modifiers
      .getByRole('listitem', { name: 'Защитный знак' })
      .getByRole('button', { name: 'Подробнее' })
      .click()
    const details = page.getByRole('dialog', { name: 'Защитный знак' })
    await expect(details).toContainText('Защищает команду в раунде.')
    const cancelPurchase = details.getByRole('button', { name: /Отменить мою покупку/ })
    await cancelPurchase.click()
    const cancelConfirmation = page.getByRole('dialog', { name: 'Отменить покупку модификатора?' })
    await expect(cancelConfirmation).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(cancelConfirmation).not.toBeVisible()
    await expect(details).toBeVisible()
    await expect(cancelPurchase).toBeFocused()
    await details.getByRole('button', { name: 'Закрыть' }).click()
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
    modifierEnabled = false
    await page.getByRole('link', { name: 'Открыть текущий раунд' }).click()
    await expect(page).toHaveURL(/\/panel\/game-round$/)
    await modifiers
      .getByRole('listitem', { name: 'Защитный знак' })
      .getByRole('button', { name: 'Подробнее' })
      .click()
    await expect(details).toContainText('Этот модификатор больше не включён для текущей игры.')
    await cancelPurchase.click()
    await expect(
      cancelConfirmation.getByRole('button', { name: 'Отмена', exact: true }),
    ).toBeVisible()
    const confirmCancellation = cancelConfirmation.getByRole('button', {
      name: 'Отменить покупку и вернуть очки',
    })
    await confirmCancellation.click()
    await expect(cancelConfirmation.getByRole('alert')).toBeVisible()
    await confirmCancellation.click()
    await expect(cancelConfirmation).not.toBeVisible()
    await expect(details).not.toBeVisible()
    await expect(modifiers.getByRole('listitem')).toHaveCount(0)
    expect(cancellationAttempts).toBe(2)
    expect(writes).toEqual([])
  })
}

for (const { width, height } of [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`round modifier catalog fits without scrolling at ${width}px`, async ({
    page,
  }, testInfo) => {
    await mockGame(page, 'active', 'viewer')
    await page.setViewportSize({ width, height })
    const names = [
      'Чирик',
      'Жажда',
      'Расходник',
      'Трупы',
      'Навыки',
      'Патрон',
      'Проказник',
      'Диарея',
      'Менторбайт',
      'Кэп',
      'Фейерверк',
      'Крыса',
      'Шот',
      'Подъём',
      'Хард75',
    ]
    const costs = [3, 3, 4, 4, 4, 4, 6, 7, 8, 10, 11, 12, 13, 14, 18]
    await page.route('**/api/game/rounds/active', (route) =>
      route.fulfill({ json: activeRoundFixture }),
    )
    await page.route('**/api/game/modifiers/state', (route) =>
      route.fulfill({
        json: {
          gameId: board.gameId,
          availableQuizPoints: 12,
          earnedQuizPoints: 12,
          spentQuizPoints: 0,
          isOrderingOpen: true,
          activeModifiers: [],
          availableModifiers: names.map((name, index) => ({
            modifier: {
              id: `modifier-${index}`,
              category: index < 5 ? 'preparation' : index < 10 ? 'round' : 'result',
              name,
              description: `Описание модификатора «${name}».`,
              activationCost: costs[index],
              activationLimit: null,
              conflictingModifierIds: [],
              iconEmoji: null,
              activationCommand: null,
              revision: 1,
              normalizedTags: [],
              behaviorV2: {
                schemaVersion: 2,
                kind: 'rule',
                phase: 'round',
                performer: 'activeTeam',
                requiresHostMonitoring: false,
                rule: 'Правило',
                stackingPolicy: 'aggregateParameters',
                resolution: { type: 'ruleStatus' },
                reward: 'none',
                formulaReference: null,
              },
            },
            isActive: false,
            canActivate: true,
            blockedReason: null,
            activationsCount: 0,
            limit: null,
          })),
        },
      }),
    )
    await page.goto('/panel/game-round')
    const panel = page.getByRole('dialog', { name: 'Модификаторы' })
    await expect(panel).toBeVisible()
    const list = panel.getByTestId('round-modifier-list')
    await expect(list.getByRole('listitem')).toHaveCount(names.length)
    const body = panel.getByTestId('round-modifier-scroll-body')
    expect(await body.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(
      true,
    )
    await list
      .getByRole('listitem', { name: 'Чирик' })
      .getByRole('button', { name: 'Подробнее' })
      .click()
    const details = page.getByRole('dialog', { name: 'Чирик' })
    await expect(details).toContainText('Описание модификатора «Чирик».')
    await page.screenshot({
      path: testInfo.outputPath('round-modifier-details.png'),
      animations: 'disabled',
    })
    await details.getByRole('button', { name: 'Закрыть' }).click()
    if (width === 390) {
      await page.setViewportSize({ width, height: 640 })
      expect(await body.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
        true,
      )
      const lastModifier = list.getByRole('listitem', { name: 'Хард75' })
      await lastModifier.scrollIntoViewIfNeeded()
      await expect(lastModifier.getByRole('button', { name: 'Подробнее' })).toBeVisible()
      await page.setViewportSize({ width, height })
    }
    await page.screenshot({
      path: testInfo.outputPath('round-modifiers.png'),
      animations: 'disabled',
    })
    if (width === 320) {
      names[1] = 'МодификаторСОченьДлиннымНазваниеБезПробелов'
      await page.reload()
      const longRow = page.getByRole('listitem', { name: names[1] })
      await expect(longRow).toBeVisible()
      expect(await longRow.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      )
      await expect(longRow.getByRole('button', { name: 'Подробнее' })).toBeInViewport()
    }
  })
}

for (const role of ['viewer', 'admin']) {
  test(`remote card opening keeps ${role === 'viewer' ? 'a player' : 'staff'} on the board`, async ({
    page,
  }) => {
    let sendEvent: ((message: string) => void) | undefined
    let roundOpened = false
    await mockGame(page, 'active', role, 'Ночные странники', (send) => {
      sendEvent = send
    })
    await page.route('**/api/game', (route) =>
      route.fulfill({
        json: {
          ...board,
          version: roundOpened ? 2 : board.version,
          cells: board.cells.map((cell) =>
            cell.id === 'card-2' && roundOpened ? { ...cell, state: 'open' } : cell,
          ),
        },
      }),
    )
    await page.route('**/api/game/rounds/active', (route) =>
      roundOpened
        ? route.fulfill({
            json: { ...activeRoundFixture, cellId: 'card-2', status: 'preparing' },
          })
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
        arguments: [
          { gameId: board.gameId, version: 2, cell: { ...board.cells[2], state: 'open' } },
        ],
      }) + '\u001e',
    )
    await expect(page.getByRole('link', { name: 'Открыть текущий раунд' })).toBeVisible()
    await expect(page).toHaveURL(/\/panel\/game-board$/)
    await expect(page.locator('[data-cell-id="card-2"]')).toHaveAttribute(
      'aria-label',
      'Открыть текущий раунд',
    )
    await expect(page).toHaveURL(/\/panel\/game-board$/)
  })
}

test('the administrator who opens a new card goes straight to the current round', async ({
  page,
}, testInfo) => {
  await mockGame(page, 'active', 'admin')
  let roundOpened = false
  await page.route('**/api/game', (route) =>
    route.fulfill({
      json: {
        ...board,
        version: roundOpened ? 2 : board.version,
        cells: board.cells.map((cell) =>
          cell.id === 'card-2' && roundOpened ? { ...cell, state: 'open' } : cell,
        ),
      },
    }),
  )
  await page.route('**/api/game/rounds/active', (route) =>
    roundOpened
      ? route.fulfill({
          json: {
            ...activeRoundFixture,
            cellId: 'card-2',
            cellTitle: 'Испытание 3',
            status: 'preparing',
          },
        })
      : route.fulfill({ status: 204 }),
  )
  await page.route('**/api/game/cells/card-2/open', (route) => {
    roundOpened = true
    return route.fulfill({ status: 204 })
  })

  await page.goto('/panel/game-board')
  await page.locator('[data-cell-id="card-2"]').click()
  const confirmation = page.getByRole('dialog')
  await expect(confirmation).toContainText('Испытание 3')
  await confirmation.getByRole('button', { name: 'Открыть', exact: true }).click()

  await expect(page).toHaveURL(/\/panel\/game-round$/)
  await expect(page.getByTestId('current-round-screen')).toContainText('Испытание 3')
  await expect(page.getByRole('dialog', { name: 'Испытание 3' })).toHaveCount(0)
  await page.screenshot({
    path: testInfo.outputPath('opened-card-round.png'),
    animations: 'disabled',
  })
})

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
}, testInfo) => {
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
        status: 'open',
        correctOptionId: null,
        myIsCorrect: null,
        myAwardedPoints: null,
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
  await question.screenshot({ path: testInfo.outputPath('quiz-petal.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(question).toBeVisible()
  await question.screenshot({ path: testInfo.outputPath('quiz-petal-mobile.png') })
  expect(await question.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true,
  )
  await question.getByRole('button', { name: 'К болоту' }).click()
  await expect(question).toBeVisible()
  await expect(question).toContainText('Ответ принят')
  await expect(question.getByRole('button', { name: /К болоту/ })).toBeDisabled()
  await question.getByRole('button', { name: 'Закрыть вопрос' }).click()
  await page.getByRole('button', { name: 'Открыть вопрос' }).click()
  await expect(question).toContainText('Ответ принят')
  await expect(page).toHaveURL(/\/panel\/game-round$/)
  expect(writes).toEqual([])
})

test('quiz petal disappears after the question closes', async ({ page }) => {
  let status = 'open'
  let sendEvent: ((message: string) => void) | undefined
  await mockGame(page, 'active', 'viewer', 'Ночные странники', (send) => {
    sendEvent = send
  })
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'in_progress' } }),
  )
  await page.route('**/api/game/quiz/current', (route) =>
    route.fulfill({
      json: {
        questionSessionId: 'quiz-expiring',
        gameId: board.gameId,
        askOrder: 1,
        questionId: 'question-expiring',
        questionCode: 'Q-4',
        categoryName: 'Охота',
        text: 'Куда идти?',
        options: [{ optionId: 'one', text: 'К берегу', displayOrder: 1 }],
        status,
        askedAtUtc: new Date().toISOString(),
        closesAtUtc: new Date(Date.now() + 60_000).toISOString(),
      },
    }),
  )
  await page.goto('/panel/game-round')
  await expect(page.getByRole('dialog', { name: 'Текущий вопрос' })).toBeVisible()
  await expect.poll(() => Boolean(sendEvent)).toBe(true)
  status = 'closed'
  sendEvent?.(JSON.stringify({ type: 1, target: 'quizStateChanged', arguments: [{}] }) + '\u001e')
  await expect(page.getByRole('button', { name: 'Открыть вопрос' })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Текущий вопрос' })).toHaveCount(0)
})

test('moderator sees the round question without player answer controls', async ({ page }) => {
  const writes = await mockGame(page, 'active', 'admin')
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'in_progress' } }),
  )
  await page.route('**/api/game/quiz/current', (route) =>
    route.fulfill({
      json: {
        questionSessionId: 'quiz-moderator',
        gameId: board.gameId,
        askOrder: 1,
        questionId: 'question-moderator',
        questionCode: 'Q-5',
        categoryName: 'Охота',
        text: 'Куда идти?',
        options: [{ optionId: 'one', text: 'К берегу', displayOrder: 1 }],
        status: 'open',
        askedAtUtc: new Date().toISOString(),
        closesAtUtc: new Date(Date.now() + 60_000).toISOString(),
      },
    }),
  )
  await page.goto('/panel/game-round')
  const question = page.getByRole('dialog', { name: 'Текущий вопрос' })
  await expect(question).toContainText('Куда идти?')
  await expect(question.getByRole('button', { name: 'К берегу' })).toBeDisabled()
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
  await expect(page.getByRole('button', { name: 'Открыть вопрос' })).toHaveCount(0)
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
  await expect(page.getByRole('button', { name: 'Открыть модификаторы' })).toHaveCount(0)
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
  test(`progress disclosure exposes the roster with ${touch ? 'touch' : 'keyboard'}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: touch ? 390 : 1440, height: 900 },
      hasTouch: touch,
    })
    const page = await context.newPage()
    const writes = await mockGame(page)
    await page.goto('/panel/game-board')
    const toggle = page.getByTestId('game-board-phase-toggle')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toContainText('Ночные странники')
    const roster = page.getByRole('region', { name: 'Активная команда', exact: true })
    await expect(roster).not.toBeVisible()
    if (touch) {
      await toggle.tap()
    } else {
      await toggle.focus()
      await page.keyboard.press('Enter')
    }
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(roster).toContainText('Ночные странники')
    await expect(roster.getByRole('listitem')).toHaveText(['Искатель приключений', 'Ворон'])
    await expect(roster).not.toContainText('Стрелок')
    const rows = await roster.getByRole('listitem').all()
    const first = (await rows[0]!.boundingBox())!
    const second = (await rows[1]!.boundingBox())!
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height)
    expect(await roster.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.getByTestId('game-board-context').screenshot({
      path: `../.tmp/game-board-design/progress-expanded-${touch ? 390 : 1440}.png`,
      animations: 'disabled',
    })
    if (touch) await toggle.tap()
    else await page.keyboard.press('Space')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(roster).not.toBeVisible()
    await expect(toggle).toBeFocused()
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    expect(writes).toEqual([])
    await context.close()
  })
}

test('board progress separates the active team from waiting teams and shows final scores', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockGame(page, 'active', 'admin', 'Ночные странники', undefined, 4)
  await page.goto('/panel/game-board')
  const context = page.getByTestId('game-board-context')
  await expandProgress(page)
  const summaries = await context
    .locator('[data-testid="game-board-phase"], [data-testid="game-board-status-title"]')
    .evaluateAll((values) =>
      values.map((value) => {
        const group = value.parentElement!
        const label = group.firstElementChild!
        const styles = getComputedStyle(group)
        return {
          height: value.getBoundingClientRect().height,
          labelGap: value.getBoundingClientRect().top - label.getBoundingClientRect().bottom,
          paddingTop: styles.paddingTop,
          paddingBottom: styles.paddingBottom,
        }
      }),
    )
  expect(summaries).toHaveLength(2)
  expect(summaries[0]).toEqual(summaries[1])
  const queue = page.getByTestId('game-board-team-queue')
  await expect(queue.getByRole('region', { name: 'В очереди · 2' })).toBeVisible()
  await expect(queue.getByRole('heading', { name: 'Сыграли' })).toBeVisible()
  await expect(queue).not.toContainText('Ночные странники')
  await expect(context.getByRole('region', { name: 'Активная команда' })).toContainText(
    'Ночные странники',
  )
  await expect(queue.getByLabel('Команда номер 3')).toHaveText('3')
  await expect(queue.getByRole('listitem').last()).toContainText('Последний рубеж')
  await expect(queue.getByLabel('Итоговый результат: 75 очков')).toHaveText('75 очк.')
  await expect(
    queue.getByLabel('Итоговый результат: 75 очков').getByText('75 очк.', { exact: true }),
  ).toHaveCSS('color', 'rgb(144, 151, 128)')
  const contextBox = (await context.boundingBox())!
  const fieldBox = (await page.locator('[data-board-field]').boundingBox())!
  expect(contextBox.x).toBeGreaterThanOrEqual(16)
  expect(Math.abs(contextBox.x + contextBox.width / 2 - (fieldBox.x + 16) / 2)).toBeLessThanOrEqual(
    2,
  )
  expect(contextBox.y).toBe((await page.getByRole('columnheader').first().boundingBox())!.y)
  expect((await queue.boundingBox())!.y).toBeGreaterThan(
    (await context.getByTestId('game-board-status-title').boundingBox())!.y,
  )
  await context.getByText('Выбор карточки', { exact: true }).hover()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
})

for (const score of [-30, 0, null]) {
  test(`played team queue shows ${score ?? 'no'} final score on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockGame(page, 'active', 'admin', 'Ночные странники', undefined, 2, score)
    await page.goto('/panel/game-board')
    await expandProgress(page)
    await page.getByRole('button', { name: 'Посмотреть очередь команд' }).click()
    const dialog = page.getByRole('dialog', { name: 'Очередь команд' })
    const scoreLabel = dialog.getByLabel(
      score === null ? 'Нет завершённого раунда' : `Итоговый результат: ${score} очков`,
    )
    await expect(scoreLabel).toHaveText(score === null ? '-' : `${score} очк.`)
    if (score !== null && score < 0)
      await expect(scoreLabel.getByText(`${score} очк.`, { exact: true })).toHaveCSS(
        'color',
        'rgb(164, 99, 92)',
      )
  })
}

for (const width of [320, 390, 768, 1024]) {
  test(`stacked board opens its queue without moving cards at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockGame(page, 'active', 'admin', 'Ночные странники', undefined, 20)
    await page.goto('/panel/game-board')
    await expandProgress(page)
    const opener = page.getByRole('button', { name: 'Посмотреть очередь команд' })
    await expect(opener).toHaveText('В очереди 18 · Сыграли 1')
    await expect(page.getByTestId('game-board-team-queue')).toHaveCount(0)
    const card = page.locator('[data-cell-id="card-0"]')
    const before = await card.boundingBox()
    await opener.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Очередь команд' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog.getByText('Ночные странники', { exact: true })).toHaveCount(1)
    await expect(dialog.getByText('Команда 20', { exact: true })).toBeAttached()
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    const bounds = (await dialog.boundingBox())!
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(900)
    await dialog.getByRole('button', { name: 'Закрыть', exact: true }).last().focus()
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await page.screenshot({
      path: `../.tmp/game-board-design/queue-${width}.png`,
      animations: 'disabled',
    })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(opener).toBeFocused()
    expect(await card.boundingBox()).toEqual(before)
  })
}

test('queue dialog survives resizing and restores focus when its mobile trigger disappears', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockGame(page)
  await page.goto('/panel/game-board')
  await expandProgress(page)
  await page.getByRole('button', { name: 'Посмотреть очередь команд' }).click()
  const dialog = page.getByRole('dialog', { name: 'Очередь команд' })
  await expect(dialog).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByTestId('game-board-context').getByRole('heading', { name: 'Ход игры', exact: true }),
  ).toBeFocused()
  await expect(page.getByTestId('game-board-team-queue').getByText('Последний рубеж')).toBeVisible()
})

for (const width of [320, 1440]) {
  test(`long team names and large scores remain readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 500 : 900 })
    await mockGame(page)
    const longName = 'ОченьДлинноеНазваниеКомандыБезПробеловДляПроверки'
    const category = 'Только куст и корточки в самой дальней части карты'
    await page.route('**/api/game', (route) =>
      route.fulfill({ json: { ...board, colLabels: [category, ...categories.slice(1)] } }),
    )
    await page.route('**/api/game/team-queue', (route) =>
      route.fulfill({
        json: {
          gameId: board.gameId,
          teams: Array.from({ length: 6 }, (_, index) => ({
            teamId: index === 0 ? 'team-one' : `team-${index}`,
            teamName: index === 1 ? longName : `Охотники ${index}`,
            teamSlotIndex: index + 1,
            isPlayed: index > 0,
            playedAtUtc: index > 0 ? '2026-09-01T10:00:00Z' : null,
            finalScore: index === 1 ? 1234567 : index * 100,
            participants:
              index === 1
                ? [{ userId: 'c592262f-8e49-466d-a4fc-2de69ba46771', displayName: 'Охотник' }]
                : [],
          })),
          summary: { totalTeams: 6, remainingTeams: 1, playedTeams: 5 },
        },
      }),
    )
    await page.goto('/panel/game-board')
    await expandProgress(page)
    if (width === 320) {
      await expect(page.getByTestId('board-selected-category')).toHaveText(category)
      await page.getByRole('button', { name: 'Посмотреть очередь команд' }).click()
    }
    const queue = page.getByTestId('game-board-team-queue')
    await expect(queue.getByText(longName)).not.toBeVisible()
    await queue.locator('summary').focus()
    await page.keyboard.press('Space')
    await expect(queue.getByText(longName)).toBeVisible()
    await expect(queue.getByText('Ваша команда')).toBeVisible()
    const row = queue.getByRole('listitem').filter({ hasText: longName })
    if (width === 320) {
      await queue.getByText('Охотники 5', { exact: true }).scrollIntoViewIfNeeded()
      await expect(queue.getByText('Охотники 5', { exact: true })).toBeInViewport()
      await row.scrollIntoViewIfNeeded()
      await expect(row.getByText('Ваша команда')).toBeInViewport()
    }
    expect(await row.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    const score = row.getByLabel(/Итоговый результат/)
    expect((await score.textContent())!.replace(/\s/g, '')).toBe('1234567очк.')
    await expect(score).toBeVisible()
    const nameBox = (await row.getByText(longName).boundingBox())!
    const scoreBox = (await score.boundingBox())!
    const markerBox = (await row.getByText('Ваша команда').boundingBox())!
    expect(nameBox.width).toBeGreaterThanOrEqual(100)
    expect(nameBox.x + nameBox.width).toBeLessThan(markerBox.x)
    expect(nameBox.x + nameBox.width).toBeLessThan(scoreBox.x)
    expect(scoreBox.y).toBeLessThan(nameBox.y + nameBox.height)
    expect(scoreBox.y + scoreBox.height).toBeGreaterThan(nameBox.y)
    await page.screenshot({
      path: `../.tmp/game-board-design/queue-long-${width}.png`,
      animations: 'disabled',
    })
    if (width === 320) {
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Посмотреть очередь команд' })).toBeFocused()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('closed and revealed cards omit hover tooltips and retain accessible actions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockGame(page)
  await page.goto('/panel/game-board')
  for (const id of ['card-0', 'card-2']) {
    const card = page.locator(`[data-cell-id="${id}"]`)
    await card.hover()
    await page.waitForTimeout(500)
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await expect(card).not.toHaveAttribute('title')
    await expect(card).toHaveAccessibleName(/Открыть карточку/)
  }
})

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
    // The queue precedes the board on narrow screens; the card field stays near the top on desktop.
    const firstCardBox = await region.locator('[data-cell-id="card-0"]').boundingBox()
    expect(firstCardBox!.y).toBeLessThan(width < 1200 ? 600 : 270)
    const statusBox = await page
      .getByTestId('game-board-context')
      .locator(':scope > section')
      .boundingBox()
    expect(statusBox!.height).toBeGreaterThan(120)
    if (width >= 1200) {
      expect((await page.getByRole('banner').boundingBox())!.height).toBe(58)
      expect(statusBox!.width).toBeLessThanOrEqual(541)
    }
    const rightCardBox = await region
      .locator(`[data-cell-id="${width < 600 ? 'card-5' : 'card-4'}"]`)
      .boundingBox()
    const cardsCenter = (firstCardBox!.x + rightCardBox!.x + rightCardBox!.width) / 2
    if (width < 1200)
      expect(Math.abs(statusBox!.x + statusBox!.width / 2 - cardsCenter)).toBeLessThan(1)
    else expect(statusBox!.x + statusBox!.width).toBeLessThan(firstCardBox!.x)
    if (width === 1440) expect(Math.abs(cardsCenter - width / 2)).toBeLessThan(1)
    await expect(page.getByTestId('game-board-teams')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Открыть очередь команд' })).toHaveCount(0)
    const managementBox = await page
      .getByRole('button', { name: 'Управление игрой', exact: true })
      .boundingBox()
    if (width >= 1200) {
      expect(managementBox!.x + managementBox!.width).toBe(width)
      expect(managementBox!.width).toBe(44)
      expect(managementBox!.height).toBe(130)
      const lastCard = await region.locator('[data-cell-id="card-4"]').boundingBox()
      expect(managementBox!.x).toBeGreaterThan(lastCard!.x + lastCard!.width)
    } else {
      expect(managementBox!.height).toBe(44)
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
      await page.getByRole('tab', { name: 'Охота', exact: true }).focus()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('tab', { name: 'Оружие', exact: true })).toBeFocused()
      await expect(page.getByTestId('board-selected-category')).toHaveText('Оружие')
      await expect(page.getByRole('tooltip')).toHaveCount(0)
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
      if (width >= 1200) expect(cell.bottom).toBeLessThanOrEqual(height)
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
      expect(statusSize).toBe(20)
    }
    if (width >= 1200) {
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
      ).toBe(true)
    }
    await page.screenshot({ path: `../.tmp/game-board-design/board-${width}.png`, fullPage: true })
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

test('long team queue uses its own page and leaves the board clear', async ({ page }) => {
  await mockGame(page, 'active', 'admin', 'Ночные странники', undefined, 16)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/panel/game-team-queue')
  const queue = page.getByTestId('team-queue-panel')
  await expect(queue).toBeVisible()
  await expect(queue.getByRole('article')).toHaveCount(16)
  await expect(page.getByTestId('game-board-surface')).toHaveCount(0)
  await queue.getByRole('article', { name: 'Команда 16' }).scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})

for (const width of [390, 1440]) {
  test(`team queue page keeps search and play order readable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await mockGame(page, 'active', 'viewer')
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/panel/game-team-queue')
    const queue = page.getByTestId('team-queue-panel')
    await expect(queue.getByRole('article', { name: 'Ночные странники' })).toBeVisible()
    await expect(queue.getByRole('article', { name: 'Последний рубеж' })).toBeVisible()
    await expect(queue).toContainText('Отыгрыш #1')
    await queue.screenshot({ path: testInfo.outputPath(`team-queue-${width}.png`) })
    const search = queue.getByRole('textbox', { name: 'Найти команду или игрока' })
    await search.fill('ворон')
    await expect(queue.getByRole('article', { name: 'Ночные странники' })).toBeVisible()
    await expect(queue.getByRole('article', { name: 'Последний рубеж' })).toHaveCount(0)
    await search.fill('несуществующая команда')
    await expect(queue.getByRole('status')).toContainText('Команды не найдены')
    await queue.getByRole('button', { name: 'Очистить поиск команд' }).click()
    await expect(queue.getByRole('article', { name: 'Последний рубеж' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

for (const width of [320, 1440]) {
  test(`long team names fit the queue at ${width}px`, async ({ page }) => {
    const teamName = 'Ночные странники с очень длинным названием команды и дальним маршрутом'
    await mockGame(page, 'active', 'viewer', teamName)
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/panel/game-team-queue')
    const queue = page.getByTestId('team-queue-panel')
    const team = queue.getByRole('article', { name: teamName })
    await expect(team).toBeVisible()
    expect(await team.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: `../.tmp/game-board-design/queue-long-name-${width}.png`,
      animations: 'disabled',
    })
  })
}

test('team queue is a separate navigation page before the leaderboard', async ({ page }) => {
  await mockGame(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/panel/game-board')
  await expect(page.getByTestId('team-queue-panel')).toHaveCount(0)
  const navigation = page.getByRole('navigation', { name: 'Основная навигация' })
  const queueLink = navigation.getByRole('link', { name: 'Очередь команд' })
  const leaderboardLink = navigation.getByRole('link', { name: 'Лидерборд' })
  expect(
    await queueLink.evaluate(
      (element, next) =>
        Boolean(element.compareDocumentPosition(next as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
      await leaderboardLink.elementHandle(),
    ),
  ).toBe(true)
  await queueLink.click()
  await expect(page).toHaveURL(/\/panel\/game-team-queue$/)
  await expect(page.getByRole('heading', { name: 'Очередь команд' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByTestId('team-queue-panel')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
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
      await expect(action).toHaveAttribute(
        'href',
        status === 'ready' ? '/panel/game-application' : '/panel/game-history?gameId=board-layout',
      )
      expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      expect(
        await action.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
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
    await expect(steps.getByRole('listitem')).toHaveCount(7)
    await expect(steps.locator('[aria-current="step"]')).toContainText('Выбор модификаторов')
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

test('admin starts modifier ordering from the current-round management petal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockGame(page)
  let status = 'card_opened'
  let roundVersion = 1
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status, roundVersion } }),
  )
  await page.route('**/api/game/rounds/round-one/start-modifier-ordering', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ expectedRoundVersion: 1 })
    status = 'awaiting_modifiers'
    roundVersion = 2
    await route.fulfill({ json: { ...activeRoundFixture, status, roundVersion } })
  })

  await page.goto('/panel/game-board')
  await expect(page.getByTestId('game-board-context')).toContainText('Карточка открыта')
  await page.goto('/panel/game-round')
  await expect(page.getByTestId('current-round-overview')).toContainText('Карточка открыта')
  await expect(page.getByRole('button', { name: 'Начать выбор модификаторов' })).toHaveCount(0)
  const managementPetal = page.getByRole('button', { name: 'Управление игрой', exact: true })
  await expect(managementPetal).toBeVisible()
  await page.screenshot({
    path: '../.tmp/game-board-design/card-opened-round-390.png',
    animations: 'disabled',
  })
  await managementPetal.click()
  await page
    .getByTestId('management-round-section')
    .getByRole('button', { name: 'Начать выбор модификаторов' })
    .click()
  await expect(page.getByTestId('current-round-overview')).toContainText('Выбор модификаторов')
  await expect(page.getByRole('dialog', { name: 'Модификаторы' })).toBeVisible()
})

test('admin starts gameplay after preparation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockGame(page)
  let status = 'preparing'
  let roundVersion = 1
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({
      json: {
        ...activeRoundFixture,
        status,
        roundVersion,
        preparedAtUtc: '2026-09-01T12:00:00Z',
        gameplayStartedAtUtc: status === 'in_progress' ? '2026-09-01T12:01:00Z' : null,
      },
    }),
  )
  await page.route('**/api/game/rounds/round-one/begin-gameplay', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ expectedRoundVersion: 1 })
    status = 'in_progress'
    roundVersion = 2
    await route.fulfill({ json: { ...activeRoundFixture, status, roundVersion } })
  })

  await page.goto('/panel/game-board')
  await expect(page.getByTestId('game-board-context')).toContainText('Подготовка к игре')
  await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
  const roundSection = page.getByTestId('management-round-section')
  await expect(roundSection.getByRole('button', { name: 'Начать игру', exact: true })).toBeVisible()
  await expect(roundSection.getByRole('button', { name: 'Завершить подготовку' })).toHaveCount(0)
  await page.screenshot({
    path: '../.tmp/game-board-design/management-preparing-390.png',
    animations: 'disabled',
  })
  await roundSection.getByRole('button', { name: 'Начать игру', exact: true }).click()
  await expect(roundSection).toContainText('Проведение игры')
  await expect(roundSection.getByRole('button', { name: 'Завершить игру' })).toBeVisible()
})

test('current-round management is an edge petal on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockGame(page)
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'card_opened' } }),
  )

  await page.goto('/panel/game-round')
  const petal = page.getByRole('button', { name: 'Управление игрой', exact: true })
  await expect(petal).toBeVisible()
  const bounds = await petal.boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.x + bounds!.width).toBeCloseTo(1440, 0)
  expect(bounds!.height).toBeGreaterThan(bounds!.width)
  await page.screenshot({
    path: '../.tmp/game-board-design/card-opened-round-1440.png',
    animations: 'disabled',
  })
})

test('players see the opened-card phase without staff controls', async ({ page }) => {
  await mockGame(page, 'active', 'viewer')
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'card_opened' } }),
  )

  await page.goto('/panel/game-round')
  await expect(page.getByTestId('current-round-overview')).toContainText('Карточка открыта')
  await expect(page.getByRole('button', { name: 'Начать выбор модификаторов' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Управление игрой' })).toHaveCount(0)
})

test('moderator does not see current-round management', async ({ page }) => {
  await mockGame(page, 'active', 'moderator')
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'card_opened' } }),
  )

  await page.goto('/panel/game-round')
  await expect(page.getByTestId('current-round-overview')).toContainText('Карточка открыта')
  await expect(page.getByRole('button', { name: 'Управление игрой' })).toHaveCount(0)
})

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
          colLabels:
            width < 600
              ? ['Охота', 'Оружие', 'Легенды', 'Только куст и корточки', 'Контракты']
              : board.colLabels,
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
      const verticalPosition = () =>
        page.evaluate(() => {
          const panel = document.querySelector('[data-testid="game-board-context"]')
          const boardField = document.querySelector('[data-board-field]')
          if (!panel || !boardField) throw new Error('Board layout is missing')
          return {
            panel: Math.round(panel.getBoundingClientRect().top + window.scrollY),
            field: Math.round(boardField.getBoundingClientRect().top + window.scrollY),
          }
        })
      const beforeSwitch = await verticalPosition()
      await page.getByRole('tab', { name: 'Оружие', exact: true }).click()
      expect(await verticalPosition()).toEqual(beforeSwitch)
      await page.getByRole('tab', { name: 'Только куст и корточки', exact: true }).click()
      expect(await verticalPosition()).toEqual(beforeSwitch)
      await page.getByRole('button', { name: 'Текущий раунд', exact: true }).click()
      expect(await verticalPosition()).toEqual(beforeSwitch)
    }
    await expect(page.locator('[data-cell-id="card-0"]')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Открыть текущий раунд' })).toBeVisible()
    const modifierAction = page.getByTestId('game-board-context').getByRole('link', {
      name: 'Открыть текущий раунд',
    })
    await expect(modifierAction).toHaveClass(/MuiButton-containedPrimary/)
    const context = page.getByTestId('game-board-context')
    await expect(context).toContainText(teamName)
    await expect(context.getByTestId('game-board-phase')).toHaveText('Выбор модификаторов')
    const statusBox = await context.locator(':scope > section').boundingBox()
    const actionBox = (await modifierAction.boundingBox())!
    expect(actionBox.height).toBeGreaterThanOrEqual(44)
    expect(actionBox.x).toBeGreaterThan(statusBox!.x)
    expect(actionBox.x + actionBox.width).toBeLessThan(statusBox!.x + statusBox!.width)
    expect(await context.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await expect(page.getByRole('button', { name: 'Меню игры' })).toHaveCount(0)
    if (width >= 1024) {
      expect(
        await page
          .locator('[data-cell-id]')
          .evaluateAll((elements) =>
            elements.every((element) => element.getBoundingClientRect().bottom <= innerHeight),
          ),
      ).toBe(true)
    } else {
      const lastCard = page.locator('[data-cell-id="card-20"]')
      await lastCard.scrollIntoViewIfNeeded()
      await expect(lastCard).toBeInViewport()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: `../.tmp/game-board-design/live-round-${width}.png`,
      fullPage: true,
    })
    // A phase change keeps the round action and board geometry stable.
    await page.evaluate(() => window.scrollTo(0, 0))
    const teamBoxBefore = await page
      .getByTestId('game-board-context')
      .getByTestId('game-board-status-title')
      .boundingBox()
    const cardBoxBefore = await page.locator('[data-cell-id="card-0"]').boundingBox()
    roundStatus = 'in_progress'
    await page.reload()
    await expect(page.getByTestId('game-board-context')).toContainText('Проведение игры')
    await expect(page.getByRole('link', { name: 'Открыть текущий раунд' })).toBeVisible()
    await expect(page.getByTestId('game-board-phase')).toHaveText('Проведение игры')
    const teamBoxAfter = await page
      .getByTestId('game-board-context')
      .getByTestId('game-board-status-title')
      .boundingBox()
    const cardBoxAfter = await page.locator('[data-cell-id="card-0"]').boundingBox()
    expect(
      await page.getByTestId('game-board-context').locator(':scope > section').boundingBox(),
    ).toEqual(statusBox)
    expect(teamBoxAfter).toEqual(teamBoxBefore)
    expect(cardBoxAfter).toEqual(cardBoxBefore)
  })
}

test('side panels honour reduced motion and expose modal semantics', async ({ page }) => {
  await mockGame(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 640 })
  await page.goto('/panel/game-board')
  const opener = page.getByRole('button', { name: 'Управление игрой', exact: true })
  await opener.click()
  const panel = page.getByRole('dialog', { name: 'Инструменты управления игрой' })
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
  let sendEvent: ((message: string) => void) | undefined
  await mockGame(page, 'active', 'admin', 'Ночные странники', (send) => {
    sendEvent = send
  })
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
  let currentBoard: GameBoardSnapshot = largeBoard
  await page.route('**/api/game', (route) => route.fulfill({ json: currentBoard }))
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
  await expect.poll(() => Boolean(sendEvent)).toBe(true)
  for (const nextBoard of [board, largeBoard]) {
    currentBoard = { ...nextBoard, gameId: `resized-${nextBoard.cols}` }
    sendEvent?.(
      JSON.stringify({
        type: 1,
        target: realtimeHubs.gameBoard.events.gameLifecycleChanged,
        arguments: [
          {
            gameId: currentBoard.gameId,
            status: currentBoard.status,
            boardVersion: currentBoard.version,
            occurredAtUtc: '2026-09-01T12:00:00Z',
          },
        ],
      }) + '\u001e',
    )
    await expect(page.locator('[data-cell-id]')).toHaveCount(nextBoard.cols === 5 ? 25 : 5)
    await expect
      .poll(() =>
        page.evaluate(() => {
          const context = document
            .querySelector('[data-testid="game-board-context"]')!
            .getBoundingClientRect()
          const first = document.querySelector('[data-cell-id]')!.getBoundingClientRect()
          const row = [...document.querySelectorAll('[data-cell-id]')]
            .map((el) => el.getBoundingClientRect())
            .filter((rect) => Math.abs(rect.top - first.top) < 1)
          const right = Math.max(...row.map((rect) => rect.right))
          return Math.abs(context.left - first.left) + Math.abs(context.right - right)
        }),
      )
      .toBeLessThanOrEqual(2)
  }
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
    await expect(page.getByTestId('game-board-context')).toContainText('Подведение итогов')
    await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
    await page.getByRole('button', { name: 'Подвести итоги', exact: true }).click()
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

test('card background and preview load through the shared image component', async ({
  page,
}, testInfo) => {
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
  await page.screenshot({ path: testInfo.outputPath('card-preview.png'), animations: 'disabled' })
  expect(writes).toEqual([])
})

for (const width of [390, 768, 1440]) {
  test(`played card keeps its result and team readable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 768 ? 800 : 900 })
    const writes = await mockGame(page)
    const finalScore = width === 390 ? -30 : width === 768 ? 0 : 1234
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
    await expect(label).toHaveText('Сыграно')
    await expect(points).toHaveText(`${finalScore} очк.`)
    await expect(points).toHaveCSS(
      'color',
      width === 390
        ? 'rgb(164, 99, 92)'
        : width === 768
          ? 'rgb(209, 207, 199)'
          : 'rgb(144, 151, 128)',
    )
    await expect(card.getByTestId('played-cell-team')).toHaveText('Ночные призраки')
    await expect(card).toHaveAccessibleDescription(`Сыграно ${finalScore} очк. Ночные призраки`)
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
      expect(Math.round(bounds!.width)).toBeGreaterThanOrEqual(width === 768 ? 79 : 80)
    }
    await page.screenshot({ path: testInfo.outputPath('played-board.png'), fullPage: true })
    expect(writes).toEqual([])
  })
}
