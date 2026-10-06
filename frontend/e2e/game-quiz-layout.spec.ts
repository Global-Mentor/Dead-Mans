import { expect, test, type Page } from '@playwright/test'
import { realtimeHubs } from '../src/shared/realtime/generated.ts'

const longAnswer =
  'Подробный ответ с несколькими условиями, который должен оставаться полностью доступным даже на узком экране. '.repeat(
    3,
  )
const questions = [
  {
    questionId: 'science',
    questionCode: 'hidden-code',
    categoryName: 'Наука',
    text: 'Какая планета ближе к Солнцу?',
  },
  {
    questionId: 'history',
    questionCode: 'hidden-code-2',
    categoryName: 'История',
    text: 'В каком году произошло событие?',
  },
]

async function mockQuiz(page: Page, roundPhase?: string, extraPlayers = 0) {
  let starts = 0
  let refreshFailed = false
  let notifyQuizChanged = () => {}
  let notifyTwitchChanged = () => {}
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  await page.routeWebSocket(/\/hubs\/game-board/, (socket) => {
    notifyQuizChanged = () =>
      socket.send(
        `${JSON.stringify({ type: 1, target: realtimeHubs.gameBoard.events.quizStateChanged, arguments: [] })}\u001e`,
      )
    notifyTwitchChanged = () =>
      socket.send(
        `${JSON.stringify({ type: 1, target: realtimeHubs.gameBoard.events.twitchQuizStateChanged, arguments: [] })}\u001e`,
      )
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
            connectionId: 'quiz',
            connectionToken: 'quiz',
            negotiateVersion: 1,
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
          },
        })
      if (path.endsWith('/questions/ask-next'))
        return route.fulfill({
          status: 404,
          json: { code: 'game_quiz.no_available_questions', error: 'No questions' },
        })
      if (path.endsWith('/ask')) {
        starts++
        return route.fulfill({ json: {} })
      }
      if (route.request().method() !== 'GET') return route.fulfill({ status: 204 })
      if (path === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
            displayName: 'Ведущий',
            roles: ['admin', 'viewer'],
          },
        })
      if (path === '/api/game')
        return route.fulfill({
          json: {
            gameId: 'quiz',
            status: 'active',
            title: 'Игра',
            version: 1,
            rows: 1,
            cols: 1,
            cells: [
              {
                id: 'cell',
                row: 0,
                col: 0,
                title: 'Карточка',
                description: '',
                cost: 100,
                type: 'question',
                state: 'closed',
                media: [],
              },
            ],
            rowLabels: ['100'],
            colLabels: ['Общие знания'],
            enabledModifierIds: [],
            activeModifiers: [],
          },
        })
      if (path === '/api/game/history/games') return route.fulfill({ json: [] })
      if (path.endsWith('/integrations/twitch/status'))
        return route.fulfill({ json: { enabled: false } })
      if (path.endsWith('/rounds/active') && roundPhase)
        return route.fulfill({ json: { gameId: 'quiz', status: roundPhase } })
      if (path.endsWith('/quiz/current')) return route.fulfill({ status: 204 })
      if (path.endsWith('/questions/available')) return route.fulfill({ json: questions })
      if (path.endsWith('/history/games/quiz') && refreshFailed)
        return route.fulfill({ status: 503 })
      if (path.endsWith('/history/games/quiz'))
        return route.fulfill({
          json: {
            gameId: 'quiz',
            gameTitle: 'Игра',
            gameStatus: 'active',
            modifierSnapshots: [],
            modifierSnapshotStatus: 'complete',
            finalResult: null,
            mainGame: { teamStats: [], playerStats: [], rounds: [], modifierActivations: [] },
            quiz: {
              totalPoints: 150,
              manualAwards: [],
              playerStats: [
                {
                  userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
                  displayName: 'Первый',
                  points: 100,
                  availablePoints: 10,
                  spentPoints: 90,
                  attempts: 4,
                  correctAnswers: 3,
                },
                {
                  userId: 'two',
                  displayName: 'Второй',
                  points: 50,
                  availablePoints: 50,
                  spentPoints: 0,
                  attempts: 4,
                  correctAnswers: 2,
                },
                ...Array.from({ length: extraPlayers }, (_, index) => ({
                  userId: `extra-${index}`,
                  displayName: `Игрок ${index + 3}`,
                  points: 40 - index,
                  availablePoints: 30 - index,
                  spentPoints: 10,
                  attempts: 10,
                  correctAnswers: index,
                })),
              ],
              questionSessions: Array.from({ length: 30 }, (_, index) => ({
                questionSessionId: `session-${index}`,
                questionId: `question-${index}`,
                questionCode: `q-${index}`,
                questionText: `Вопрос ${index + 1}: какой вариант ответа верный?`,
                categoryName: 'Общие знания',
                reward: 5,
                status: 'closed',
                askedAtUtc: new Date(Date.UTC(2026, 8, 21, 10, index * 2)).toISOString(),
                closedAtUtc: new Date(Date.UTC(2026, 8, 21, 10, index * 2 + 1)).toISOString(),
                correctOptionId: 'right',
                options: [{ optionId: 'right', text: longAnswer, displayOrder: 0 }],
                submissions: [
                  {
                    userId: 'one',
                    displayName: 'ОченьДлинныйНикУчастникаБезПробелов',
                    selectedOptionId: 'right',
                    selectedOptionText: longAnswer,
                    isCorrect: true,
                    awardedPoints: 5,
                    submittedAtUtc: '2026-09-21T10:00:20Z',
                  },
                ],
              })),
            },
          },
        })
      return route.fulfill({ status: 204 })
    },
  )
  return {
    starts: () => starts,
    notifyQuizChanged: () => notifyQuizChanged(),
    notifyTwitchChanged: () => notifyTwitchChanged(),
    failRefresh: () => {
      refreshFailed = true
      notifyQuizChanged()
    },
    recover: () => {
      refreshFailed = false
    },
  }
}

for (const width of [390, 768, 1440]) {
  test(`question delivery keeps the quiz layout stable at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    const runtimeErrors: string[] = []
    page.on('pageerror', (error) => runtimeErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(message.text())
    })
    const fixture = await mockQuiz(page)
    let open = false
    let delivery = 'pending'
    let quizReads = 0
    let historyReads = 0
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname
      if (path.endsWith('/quiz/current')) quizReads++
      if (path.endsWith('/history/games/quiz')) historyReads++
    })
    await page.route('**/api/integrations/twitch/status', (route) =>
      route.fulfill({
        json: {
          enabled: true,
          botConnected: true,
          broadcasterConnected: true,
          eventSubConnected: true,
          publication: {
            publicationId: 'publication',
            gameId: 'quiz',
            questionId: 'new',
            askOrder: 31,
            status: open ? 'open' : 'publishing',
            questionDeliveryStatus: delivery,
            optionsDeliveryStatus: delivery,
            outcomeDeliveryStatus: 'pending',
            questionMessage: '',
            optionsMessage: '',
            createdAtUtc: new Date().toISOString(),
            updatedAtUtc: new Date().toISOString(),
          },
        },
      }),
    )
    await page.route('**/api/game/quiz/current', (route) =>
      open
        ? route.fulfill({
            json: {
              gameId: 'quiz',
              questionSessionId: 'new',
              questionId: 'new',
              askOrder: 31,
              categoryName: 'Наука',
              text: 'Тестовый активный вопрос',
              reward: 5,
              status: 'open',
              askedAtUtc: new Date().toISOString(),
              closesAtUtc: new Date(Date.now() + 60000).toISOString(),
              options: [
                { optionId: 'one', text: 'Первый ответ', displayOrder: 0 },
                { optionId: 'two', text: 'Второй ответ', displayOrder: 1 },
              ],
            },
          })
        : route.fulfill({ status: 204 }),
    )
    await page.goto('/panel/game-quiz')
    const grid = page.getByTestId('quiz-sections-grid')
    await expect(grid).toBeVisible()
    await expect(page.getByTestId('quiz-twitch-panel')).toContainText('EventSub подключён')
    const before = await grid.boundingBox()
    expect(before).not.toBeNull()
    const readsBefore = { quiz: quizReads, history: historyReads }
    for (const stage of ['sending', 'sent']) {
      delivery = stage
      const refreshed = page.waitForResponse('**/api/integrations/twitch/status')
      fixture.notifyTwitchChanged()
      await refreshed
      await expect.poll(async () => (await grid.boundingBox())?.y).toBe(before?.y)
      await expect(grid).not.toContainText('Тестовый активный вопрос')
    }
    expect(quizReads).toBe(readsBefore.quiz)
    expect(historyReads).toBe(readsBefore.history)
    open = true
    fixture.notifyQuizChanged()
    await expect(grid.getByRole('heading', { name: 'Тестовый активный вопрос' })).toBeVisible()
    await expect.poll(async () => (await grid.boundingBox())?.y).toBe(before?.y)
    const question = page.getByTestId('quiz-timeline-question').first()
    await expect(question.getByText('Открыт', { exact: true })).toHaveCount(0)
    const category = await question.getByText('Категория: Наука', { exact: true }).boundingBox()
    const title = await question
      .getByRole('heading', { name: 'Тестовый активный вопрос' })
      .boundingBox()
    expect(title!.y - category!.y - category!.height).toBeGreaterThanOrEqual(12)
    await page.screenshot({ path: info.outputPath(`quiz-stable-${width}.png`) })
    expect(runtimeErrors).toEqual([])
  })

  for (const role of ['admin', 'viewer']) {
    test(`modifiers show the active question on the left for ${role} at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 })
      await mockQuiz(page)
      await page.route('**/auth/me', (route) =>
        route.fulfill({
          json: {
            userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
            displayName: 'Участник',
            roles: [role],
          },
        }),
      )
      await page.route('**/api/game/modifiers/state', (route) =>
        route.fulfill({
          json: {
            gameId: 'quiz',
            availableQuizPoints: 10,
            spentQuizPoints: 0,
            earnedQuizPoints: 10,
            isOrderingOpen: false,
            activeModifiers: [],
            availableModifiers: [],
          },
        }),
      )
      await page.route('**/api/game/quiz/current', (route) =>
        route.fulfill({
          json: {
            gameId: 'quiz',
            questionSessionId: 'new',
            questionId: 'new',
            askOrder: 31,
            categoryName: 'Наука',
            text: 'Вопрос на странице модификаторов',
            reward: 5,
            status: 'open',
            askedAtUtc: new Date().toISOString(),
            closesAtUtc: new Date(Date.now() + 60000).toISOString(),
            options: [
              { optionId: 'one', text: 'Первый ответ', displayOrder: 0 },
              { optionId: 'two', text: 'Второй ответ', displayOrder: 1 },
            ],
          },
        }),
      )
      await page.goto('/panel/game-modifiers')
      const drawer = page.getByRole('dialog', { name: 'Текущий вопрос' })
      await expect(drawer).toBeVisible()
      await expect(drawer).toContainText('Вопрос на странице модификаторов')
      await expect(drawer.getByRole('button', { name: 'Первый ответ' })).toBeEnabled()
      expect((await drawer.boundingBox())!.x).toBe(0)
      await drawer.screenshot({ path: info.outputPath(`modifiers-quiz-${width}.png`) })
    })
  }
}

for (const { role, width } of [
  { role: 'admin', width: 390 },
  { role: 'admin', width: 768 },
  { role: 'admin', width: 1440 },
  { role: 'superadmin', width: 1440 },
  { role: 'moderator', width: 1440 },
  { role: 'viewer', width: 1440 },
]) {
  test(`Twitch status visibility and placement for ${role} at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await mockQuiz(page)
    await page.route('**/auth/me', (route) =>
      route.fulfill({
        json: {
          userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
          displayName: 'Участник',
          roles: [role],
        },
      }),
    )
    await page.route('**/integrations/twitch/status', (route) =>
      route.fulfill({
        json: {
          enabled: true,
          botConnected: width !== 390,
          broadcasterConnected: width !== 390,
          eventSubConnected: width !== 390,
        },
      }),
    )
    await page.goto('/panel/game-quiz')
    const grid = page.getByTestId('quiz-sections-grid')
    await expect(grid).toBeVisible()
    const panel = page.getByTestId('quiz-twitch-panel')
    if (role === 'admin' || role === 'superadmin') {
      await expect(panel.getByText('Статус Twitch-бота', { exact: true })).toBeVisible()
      for (const name of width === 390
        ? ['Бот не подключён', 'Канал не подключён', 'EventSub не подключён']
        : ['Бот подключён', 'Канал подключён', 'EventSub подключён']) {
        await expect(panel.getByText(name, { exact: true })).toBeVisible()
      }
      await expect(panel.getByText('Проверьте подключение', { exact: true })).toHaveCount(0)
      await expect(panel.locator('details')).toHaveCount(0)
      const panelBounds = await panel.boundingBox()
      const gridBounds = await grid.boundingBox()
      expect(panelBounds).not.toBeNull()
      expect(gridBounds).not.toBeNull()
      expect(panelBounds!.y + panelBounds!.height).toBeLessThanOrEqual(gridBounds!.y)
      expect(Math.abs(panelBounds!.x - gridBounds!.x)).toBeLessThan(1)
      expect(Math.abs(panelBounds!.width - gridBounds!.width)).toBeLessThan(1)
      await page.screenshot({ path: info.outputPath('quiz-twitch-admin.png'), fullPage: true })
    } else {
      await expect(panel).toHaveCount(0)
      await expect(page.getByText('Статус Twitch-бота', { exact: true })).toHaveCount(0)
    }
  })
}

async function openQuizManagement(page: Page) {
  await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
  await page.getByRole('tab', { name: 'Управление викториной', exact: true }).click()
}

test('quiz launch is unavailable while modifiers are being ordered', async ({ page }) => {
  const mock = await mockQuiz(page, 'awaiting_modifiers')
  await page.goto('/panel/game-quiz')
  await openQuizManagement(page)
  await expect(page.getByRole('button', { name: 'Следующий вопрос' })).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Задать конкретный вопрос', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByText('Завершите заказ модификаторов, прежде чем запускать вопрос.'),
  ).toBeVisible()
  expect(mock.starts()).toBe(0)
})

for (const width of [390, 768, 1440]) {
  test(`open question keeps timer, reward and answers readable at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await mockQuiz(page)
    await page.route('**/auth/me', (route) =>
      route.fulfill({
        json: {
          userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
          displayName: 'Первый',
          roles: ['viewer'],
        },
      }),
    )
    let selected: string | null = null
    let submissions = 0
    const state = {
      gameId: 'quiz',
      questionSessionId: 'live-question',
      questionId: 'live',
      questionCode: 'live',
      askOrder: 31,
      categoryName: 'Охота',
      text: 'Какой инструмент поможет отвлечь противника?',
      reward: 5,
      status: 'open',
      askedAtUtc: new Date().toISOString(),
      closesAtUtc: new Date(Date.now() + 120_000).toISOString(),
      options: [
        { optionId: 'one', text: 'Шумовая граната', displayOrder: 0 },
        { optionId: 'two', text: 'Аптечка', displayOrder: 1 },
        { optionId: 'three', text: 'Кастет', displayOrder: 2 },
        { optionId: 'four', text: 'Ловушка', displayOrder: 3 },
      ],
    }
    await page.route('**/api/game/quiz/current', (route) =>
      route.fulfill({ json: { ...state, mySelectedOptionId: selected } }),
    )
    await page.route('**/api/game/quiz/question-sessions/live-question/submissions', (route) => {
      submissions++
      selected = route.request().postDataJSON().optionId
      return route.fulfill({
        json: { questionSessionId: 'live-question', selectedOptionId: selected },
      })
    })
    await page.goto('/panel/game-quiz')
    await expect(page.getByRole('heading', { name: state.text, exact: true })).toBeVisible()
    await expect(page.getByRole('timer')).toBeVisible()
    await expect(
      page.getByTestId('quiz-timeline-question').first().getByText('Награда: 5 очк.'),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Следующий вопрос' })).toHaveCount(0)
    await page.screenshot({ path: info.outputPath('quiz-open.png'), fullPage: true })
    await page.getByRole('button', { name: 'Шумовая граната', exact: true }).click()
    await expect(
      page.getByText('Ответ принят. Результат будет показан после окончания времени.'),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Аптечка', exact: true })).toBeDisabled()
    expect(submissions).toBe(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    await page.screenshot({ path: info.outputPath('quiz-answered.png'), fullPage: true })
  })
}

test('question picker retains selection after a failed start and waits for confirmation', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockQuiz(page)
  let attempts = 0
  await page.route('**/api/game/quiz/questions/science/ask', (route) => {
    attempts++
    return route.fulfill(attempts === 1 ? { status: 503 } : { json: {} })
  })
  await page.goto('/panel/game-quiz')
  await openQuizManagement(page)
  await page.getByRole('button', { name: 'Задать конкретный вопрос', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Задать конкретный вопрос', exact: true })
  await dialog.getByRole('textbox', { name: 'Поиск вопросов' }).fill('планета')
  const selection = dialog.getByRole('button', { name: /Какая планета/ })
  await selection.click()
  expect(attempts).toBe(0)
  await dialog.getByRole('button', { name: 'Запустить выбранный' }).click()
  await expect(
    dialog.getByText('Не удалось запустить вопрос. Выбор сохранён. Попробуйте ещё раз.'),
  ).toBeVisible()
  await expect(selection).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog.getByRole('textbox', { name: 'Поиск вопросов' })).toHaveValue('планета')
  await page.screenshot({ path: info.outputPath('quiz-picker-retry.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Запустить выбранный' }).click()
  await expect(dialog).toHaveCount(0)
  expect(attempts).toBe(2)
})

test('refresh failure preserves the open history and retry restores actions', async ({ page }) => {
  const mock = await mockQuiz(page)
  await page.goto('/panel/game-quiz')
  await expect(
    page.getByTestId('quiz-timeline-question').first().locator('details').first(),
  ).toHaveAttribute('open', '')
  await page.getByTestId('quiz-timeline-question').first().locator('summary').nth(1).click()
  mock.failRefresh()
  await expect(
    page.getByRole('status').filter({ hasText: /Не удалось обновить данные викторины/ }),
  ).toBeVisible({
    timeout: 20000,
  })
  await expect(
    page.getByTestId('quiz-history-scroll').locator('[data-answer-result]').first(),
  ).toBeVisible()
  mock.recover()
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(page.getByText(/Не удалось обновить данные викторины/)).toHaveCount(0)
  await openQuizManagement(page)
  await expect(page.getByRole('button', { name: 'Следующий вопрос' })).toBeEnabled()
})

for (const size of [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]) {
  test(`long quiz history scrolls inside the panel at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    await mockQuiz(page)
    await page.goto('/panel/game-quiz')
    const columns = page.getByTestId('quiz-sections-grid').locator(':scope > *')
    await expect(columns).toHaveCount(2)
    const widths = await columns.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().width),
    )
    expect(Math.abs(widths[0]! - widths[1]!)).toBeLessThanOrEqual(1)
    await expect(
      page.getByTestId('quiz-timeline-question').first().locator('details').first(),
    ).toHaveAttribute('open', '')
    await page.getByTestId('quiz-timeline-question').first().locator('summary').nth(1).click()
    const panel = page.getByTestId('quiz-history-scroll')
    await expect(panel.locator('[data-answer-result]').first()).toBeVisible()
    const metrics = await panel.evaluate((element) => ({
      height: element.clientHeight,
      content: element.scrollHeight,
      bottom: element.getBoundingClientRect().bottom,
      documentHeight: document.documentElement.scrollHeight,
      viewport: innerHeight,
    }))
    expect(metrics.content).toBeGreaterThan(metrics.height)
    expect(metrics.bottom).toBeLessThanOrEqual(size.height)
    expect(metrics.bottom).toBeGreaterThan(size.height - 40)
    expect(metrics.documentHeight).toBeLessThanOrEqual(metrics.viewport + 1)
    const answer = panel
      .locator('[data-answer-result]')
      .first()
      .getByText(longAnswer.trim(), { exact: false })
    expect(await answer.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    )
  })
}

for (const width of [320, 390, 768, 1440]) {
  test(`quiz uses a readable single column at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 })
    await mockQuiz(page)
    await page.goto('/panel/game-quiz')
    await expect(
      page.getByTestId('quiz-timeline-question').first().locator('details').first(),
    ).toHaveAttribute('open', '')
    await page.getByTestId('quiz-timeline-question').first().locator('summary').nth(1).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    const history = await page
      .getByRole('heading', { name: 'История вопросов и начислений', exact: true })
      .boundingBox()
    const ranking = await page
      .getByRole('heading', { name: 'Таблица очков', exact: true })
      .boundingBox()
    if (width < 1000) expect(ranking!.y).toBeGreaterThan(history!.y + history!.height)
    else expect(ranking!.x).toBeGreaterThan(history!.x + history!.width)
    await page.screenshot({
      path: info.outputPath('quiz-history.png'),
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('rankings differ by balance and earnings, and a successful selection clears an earlier error', async ({
  page,
}) => {
  const mock = await mockQuiz(page)
  await page.goto('/panel/game-quiz')
  await expect(page.getByRole('tab', { name: 'Заработано', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('tab', { name: 'На руках', exact: true }).click()
  const panel = page.getByRole('tabpanel', { name: 'На руках', exact: true })
  await expect(panel).toContainText('Второй')
  expect((await panel.innerText()).indexOf('Второй')).toBeLessThan(
    (await panel.innerText()).indexOf('Первый'),
  )
  await page.getByRole('tab', { name: 'Заработано', exact: true }).click()
  const earnedPanel = page.getByRole('tabpanel', { name: 'Заработано', exact: true })
  expect((await earnedPanel.innerText()).indexOf('Первый')).toBeLessThan(
    (await earnedPanel.innerText()).indexOf('Второй'),
  )
  await openQuizManagement(page)
  await page.getByRole('button', { name: 'Следующий вопрос' }).click()
  const error = page.getByText(
    'Доступных вопросов больше нет: все вопросы этой игры уже были заданы.',
  )
  await expect(error).toBeVisible()
  await page.getByRole('button', { name: 'Задать конкретный вопрос', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Задать конкретный вопрос', exact: true })
  await expect(dialog.getByRole('textbox', { name: 'Поиск вопросов' })).toBeFocused()
  await dialog.getByRole('textbox', { name: 'Поиск вопросов' }).fill('планета')
  await expect(dialog.getByText(questions[0]!.text)).toBeVisible()
  await expect(dialog.getByText(questions[1]!.text)).toHaveCount(0)
  await dialog.getByRole('button', { name: /Какая планета ближе к Солнцу/ }).click()
  expect(mock.starts()).toBe(0)
  await dialog.getByRole('button', { name: 'Запустить выбранный', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(error).toHaveCount(0)
  await expect.poll(mock.starts).toBe(1)
})

for (const role of ['viewer', 'admin']) {
  test(`new questions open at the top of the timeline and accept answers for ${role}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const mock = await mockQuiz(page)
    await page.route('**/auth/me', (route) =>
      route.fulfill({
        json: {
          userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
          displayName: 'Участник',
          roles: [role],
        },
      }),
    )
    const previous = {
      gameId: 'quiz',
      questionSessionId: 'previous',
      questionId: 'previous-question',
      questionCode: 'old',
      askOrder: 1,
      categoryName: 'Охота',
      text: 'Предыдущий вопрос',
      reward: 5,
      status: 'closed',
      askedAtUtc: new Date(Date.now() - 120000).toISOString(),
      closesAtUtc: new Date(Date.now() - 60000).toISOString(),
      options: [
        { optionId: 'one', text: 'Первый вариант', displayOrder: 0 },
        { optionId: 'two', text: 'Второй вариант', displayOrder: 1 },
      ],
      correctOptionId: 'one',
    }
    const next = {
      ...previous,
      questionSessionId: 'next',
      questionId: 'next-question',
      questionCode: 'new',
      askOrder: 2,
      status: 'open',
      text: 'Новый вопрос',
      correctOptionId: null,
      askedAtUtc: new Date().toISOString(),
      closesAtUtc: new Date(Date.now() + 120000).toISOString(),
    }
    let state: (typeof previous | typeof next) & { mySelectedOptionId: string | null } = {
      ...previous,
      mySelectedOptionId: null,
    }
    let starts = 0
    let submissions = 0
    await page.route('**/api/game/quiz/current', (route) => route.fulfill({ json: state }))
    await page.route('**/history/games/quiz', (route) =>
      route.fulfill({
        json: {
          quiz: {
            playerStats: [],
            manualAwards: [],
            questionSessions: [previous, next].map((question) => ({
              ...question,
              questionText: question.text,
              closedAtUtc: question.status === 'closed' ? question.closesAtUtc : null,
              submissions: [],
            })),
          },
        },
      }),
    )
    await page.route('**/api/game/quiz/questions/ask-next', (route) => {
      starts++
      state = { ...next, mySelectedOptionId: null }
      return route.fulfill({ json: {} })
    })
    await page.route('**/api/game/quiz/question-sessions/next/submissions', (route) => {
      submissions++
      state = { ...state, mySelectedOptionId: route.request().postDataJSON().optionId }
      return route.fulfill({
        json: { questionSessionId: 'next', selectedOptionId: state.mySelectedOptionId },
      })
    })
    await page.goto('/panel/game-quiz')
    const timeline = page.getByTestId('quiz-history-scroll')
    await expect(timeline.getByTestId('quiz-timeline-question').first()).toContainText(
      'Предыдущий вопрос',
    )
    if (role === 'admin') {
      await openQuizManagement(page)
      await page.getByRole('button', { name: 'Следующий вопрос' }).click()
      await expect.poll(() => starts).toBe(1)
      await expect(page.getByRole('button', { name: 'Следующий вопрос' })).toBeDisabled()
      await page
        .getByRole('button', { name: 'Закрыть инструменты управления', exact: true })
        .click()
    } else {
      state = { ...next, mySelectedOptionId: null }
      mock.notifyQuizChanged()
    }
    const latest = timeline.getByTestId('quiz-timeline-question').first()
    await expect(latest).toContainText('Новый вопрос')
    await expect(latest.locator('details').first()).toHaveAttribute('open', '')
    await expect(latest.getByRole('timer')).toBeVisible()
    await expect(timeline.getByRole('heading', { name: 'Новый вопрос', exact: true })).toBeVisible()
    await expect(timeline.getByRole('button', { name: /Новый вопрос/ })).toHaveCount(0)
    await latest.getByRole('button', { name: 'Второй вариант', exact: true }).click()
    await expect(
      latest.getByText('Ответ принят. Результат будет показан после окончания времени.'),
    ).toBeVisible()
    expect(submissions).toBe(1)
    await expect(latest.getByRole('button', { name: 'Первый вариант', exact: true })).toBeDisabled()
    await page.screenshot({ path: info.outputPath('quiz-timeline-active.png'), fullPage: true })
  })
}

for (const path of [
  'game-board',
  'game-round',
  'game-modifiers',
  'game-quiz',
  'game-team-queue',
  'game-application',
  'game-leaderboard',
  'game-history',
  'modifier-history',
  'game-setup',
  'admin-modifiers',
  'admin-questions',
  'catalog-modifiers',
  'catalog-questions',
  'team-registrations',
  'role-administration',
]) {
  test(`one management panel is available on ${path}`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await mockQuiz(page)
    if (path === 'role-administration') {
      await page.route('**/auth/me', (route) =>
        route.fulfill({
          json: {
            userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
            displayName: 'Ведущий',
            roles: ['superadmin'],
          },
        }),
      )
    }
    await page.goto(`/panel/${path}`)
    const trigger = page.getByRole('button', { name: 'Управление игрой', exact: true })
    await expect(trigger).toHaveCount(1)
    expect(pageErrors).toEqual([])
    await trigger.click()
    await expect(
      page.getByRole('tab', { name: 'Управление викториной', exact: true }),
    ).toBeVisible()
    await page.getByRole('tab', { name: 'Управление викториной', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Следующий вопрос', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Закрыть инструменты управления', exact: true }).click()
  })
}

for (const width of [390, 768, 1440]) {
  test(`personal statistics, pinned question and compact manual awards at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await mockQuiz(page)
    await page.route('**/api/game/history/games/quiz', async (route) => {
      await route.fulfill({
        json: {
          quiz: {
            playerStats: [
              {
                userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
                displayName: 'Ведущий',
                points: 120,
                availablePoints: 25,
                spentPoints: 95,
                attempts: 2,
                correctAnswers: 1,
              },
            ],
            questionSessions: [1, 2].map((index) => ({
              questionSessionId: `q-${index}`,
              questionId: `q-${index}`,
              questionCode: `q-${index}`,
              questionText: `Заданный вопрос ${index}`,
              categoryName: 'История',
              reward: 10,
              status: 'closed',
              askedAtUtc: `2026-10-04T10:0${index}:00Z`,
              closedAtUtc: `2026-10-04T10:0${index}:30Z`,
              correctOptionId: 'yes',
              options: [
                { optionId: 'yes', text: 'Верный вариант', displayOrder: 0 },
                { optionId: 'no', text: 'Другой вариант', displayOrder: 1 },
              ],
              submissions: [
                {
                  userId: 'correct-player',
                  displayName: 'Верный игрок',
                  selectedOptionId: 'yes',
                  selectedOptionText: 'Верный вариант',
                  isCorrect: true,
                  awardedPoints: 10,
                  submittedAtUtc: '2026-10-04T10:02:10Z',
                },
                {
                  userId: 'incorrect-player',
                  displayName: 'Другой игрок',
                  selectedOptionId: 'no',
                  selectedOptionText: 'Другой вариант',
                  isCorrect: false,
                  awardedPoints: 0,
                  submittedAtUtc: '2026-10-04T10:02:15Z',
                },
              ],
            })),
            manualAwards: [
              {
                awardId: 'award',
                awardedToUserId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
                awardedToDisplayName: 'Ведущий',
                awardedByDisplayName: 'Администратор',
                awardedByUserId: 'admin',
                awardedPoints: 20,
                operationType: 'award',
                reason: 'Бонус за участие',
                awardedAtUtc: '2026-10-04T10:03:00Z',
              },
            ],
          },
        },
      })
    })
    if (width === 1440) {
      await page.route('**/api/game/quiz/current', (route) =>
        route.fulfill({
          json: {
            gameId: 'quiz',
            questionSessionId: 'q-2',
            questionId: 'q-2',
            questionCode: 'q-2',
            text: 'Заданный вопрос 2',
            categoryName: 'История',
            reward: 10,
            status: 'closed',
            askedAtUtc: '2026-10-04T10:02:00Z',
            closesAtUtc: '2026-10-04T10:02:30Z',
            correctOptionId: 'yes',
            mySelectedOptionId: null,
            options: [
              { optionId: 'yes', text: 'Верный вариант', displayOrder: 0 },
              { optionId: 'no', text: 'Другой вариант', displayOrder: 1 },
            ],
          },
        }),
      )
    }
    await page.goto('/panel/game-quiz')
    const stats = page.getByRole('region', { name: 'Ваша статистика викторины', exact: true })
    await expect(stats.getByRole('heading')).toHaveCount(0)
    for (const [label, value] of [
      ['На руках', '25'],
      ['Заработано', '120'],
      ['Верных ответов', '1'],
      ['Неверных ответов', '1'],
      ['Всего вопросов', '2'],
    ]) {
      await expect(stats.getByRole('group', { name: label, exact: true }).locator('dd')).toHaveText(
        value!,
      )
    }
    const history = page.getByTestId('quiz-history-scroll')
    const latest = history.getByTestId('quiz-timeline-question').first()
    await expect(latest).toContainText('Заданный вопрос 2')
    await expect(latest.locator('details').first()).toHaveAttribute('open', '')
    await expect(latest.getByRole('button', { name: /Верный вариант/ })).toBeVisible()
    await latest.getByRole('heading', { name: 'Заданный вопрос 2', exact: true }).click()
    await expect(latest.locator('details').first()).toHaveAttribute('open', '')
    await expect(latest.locator('summary').first()).not.toBeVisible()
    await expect(latest.getByText('Правильный ответ:', { exact: true })).toBeVisible()
    await latest.getByRole('button', { name: /Результаты ответов/ }).click()
    await expect(latest.locator('[data-answer-result="correct"]')).toContainText('Верный игрок')
    await expect(latest.locator('[data-answer-result="incorrect"]')).toContainText('Другой игрок')
    const contour = await latest.evaluate((element) => getComputedStyle(element).borderTopWidth)
    expect(contour).toBe('1px')
    await expect(latest.getByText('Закрыт', { exact: true })).toHaveCount(0)
    const corners = await latest.evaluate(
      (element) => getComputedStyle(element, '::after').backgroundImage,
    )
    expect(corners).toContain('linear-gradient')
    const resultColors = await latest.locator('[data-answer-result]').evaluateAll((elements) =>
      elements.map((element) => ({
        stripe: getComputedStyle(element, '::before').backgroundColor,
        width: getComputedStyle(element, '::before').width,
        textInset: getComputedStyle(element).paddingLeft,
      })),
    )
    expect(resultColors[0]!.stripe).not.toBe(resultColors[1]!.stripe)
    expect(resultColors.map((result) => result.width)).toEqual(['3px', '3px'])
    expect(resultColors[0]!.textInset).toEqual(resultColors[1]!.textInset)
    const older = history.getByTestId('quiz-timeline-question').nth(1)
    await expect(older.locator('details').first()).not.toHaveAttribute('open', '')
    expect((await older.boundingBox())!.height).toBeLessThanOrEqual(52)
    const olderTitle = older.getByText('Заданный вопрос 1', { exact: true })
    await expect(older.getByLabel('Верных ответов: 1 из 2', { exact: true })).toBeVisible()
    await expect(older.getByText('Закрыт', { exact: true })).toHaveCount(0)
    const titleBefore = await olderTitle.boundingBox()
    await older.locator('summary').first().click()
    const titleAfter = await olderTitle.boundingBox()
    expect(titleAfter!.x).toBeCloseTo(titleBefore!.x, 1)
    expect(titleAfter!.y).toBeCloseTo(titleBefore!.y, 1)
    const category = older.getByText('Категория: История', { exact: true })
    await expect(category).toBeVisible()
    expect((await category.boundingBox())!.y).toBeGreaterThan(titleAfter!.y + titleAfter!.height)
    await older.screenshot({ path: info.outputPath('older-question-expanded.png') })
    await older.locator('summary').first().click()
    const award = history.getByRole('button', { name: /Ручное начисление для Ведущий.*20/ })
    await expect(award).toBeVisible()
    const historyAccents = await history
      .locator(':scope > div > div')
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element, '::before').width),
      )
    expect(historyAccents).toEqual(['auto', '3px', '3px'])
    await expect(history.getByText('Бонус за участие', { exact: false })).not.toBeVisible()
    await award.click()
    await expect(history.getByText('Бонус за участие', { exact: false })).toBeVisible()
    const table = page.getByRole('table', { name: 'Таблица очков', exact: true })
    await expect(page.getByRole('tab').filter({ hasText: /^(Заработано|На руках)$/ })).toHaveText([
      'Заработано',
      'На руках',
    ])
    await expect(page.getByRole('tab', { name: 'Заработано', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(table).toContainText('120 очк.')
    const firstBounds = await table.boundingBox()
    await page.getByRole('tab', { name: 'На руках', exact: true }).click()
    await expect(table).toContainText('25 очк.')
    const availableBounds = await table.boundingBox()
    expect(availableBounds!.width).toEqual(firstBounds!.width)
    expect(availableBounds!.height).toEqual(firstBounds!.height)
    await page.getByRole('tab', { name: 'Заработано', exact: true }).click()
    await page.getByRole('tab', { name: 'Заработано', exact: true }).hover()
    await expect(page.getByRole('tooltip')).toContainText('без учёта трат')
    await page.mouse.move(0, 0)
    const columns = await page
      .getByTestId('quiz-sections-grid')
      .locator(':scope > *')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect()
          return { top: rect.top, height: rect.height, width: rect.width }
        }),
      )
    if (width >= 1000) expect(columns[0]).toEqual(columns[1])
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: info.outputPath('quiz-polished.png'), fullPage: true })
  })
}

for (const width of [390, 768, 1440]) {
  test(`compact quiz rankings keep answers in a separate aligned column at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await mockQuiz(page, undefined, 6)
    await page.goto('/panel/game-quiz')
    for (const mode of ['Заработано', 'На руках']) {
      await page.getByRole('tab', { name: mode, exact: true }).click()
      const panel = page.getByRole('tabpanel', { name: mode, exact: true })
      await expect(panel.getByRole('columnheader')).toHaveText([
        'Место',
        'Игрок',
        'Верных ответов',
        mode,
      ])
      const rows = panel.getByRole('rowgroup').getByRole('row')
      await expect(rows).toHaveCount(8)
      await expect(rows.first().getByRole('cell')).toHaveText(
        mode === 'Заработано'
          ? ['1', 'Первый', '3 из 4', '100 очк.']
          : ['1', 'Второй', '2 из 4', '50 очк.'],
      )
      const personalRow = rows.filter({ hasText: 'Первый' })
      const personalSurface = await personalRow.evaluate((el) => ({
        background: getComputedStyle(el).backgroundImage,
        frame: getComputedStyle(el).borderImageSource,
      }))
      expect(personalSurface.background).toContain('charcoal-paper')
      expect(personalSurface.frame).toMatch(/^url\(/)
      expect(
        await rows
          .filter({ hasText: 'Второй' })
          .evaluate((el) => getComputedStyle(el).borderImageSource),
      ).toBe('none')
      expect(await personalRow.evaluate((el) => getComputedStyle(el, '::before').content)).toBe(
        'none',
      )
      const headers = await panel
        .getByRole('columnheader')
        .evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().x))
      const cells = await rows
        .first()
        .getByRole('cell')
        .evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().x))
      cells.forEach((x, index) => expect(x).toBeCloseTo(headers[index]!, 0))
      if (width >= 1000) {
        expect(
          await rows.first().evaluate((el) => el.getBoundingClientRect().height),
        ).toBeLessThanOrEqual(44)
        expect(await panel.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true)
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true)
      await panel.screenshot({
        path: info.outputPath(`ranking-${mode === 'Заработано' ? 'earned' : 'balance'}.png`),
      })
    }
  })
}

for (const width of [390, 768, 1440]) {
  test(`quiz results retain readable textured states without inline captions at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await mockQuiz(page)
    let source = 'current'
    let selected = 'wrong'
    const userId = 'c592262f-8e49-466d-a4fc-2de69ba46771'
    const options = [
      { optionId: 'right', text: '7', displayOrder: 0 },
      { optionId: 'wrong', text: '5', displayOrder: 1 },
    ]
    await page.route('**/api/game/quiz/current', (route) =>
      source === 'current'
        ? route.fulfill({
            json: {
              gameId: 'quiz',
              questionSessionId: 'result',
              questionId: 'question',
              askOrder: 1,
              questionCode: 'result',
              text: 'Сколько дней в неделе?',
              categoryName: 'Общие знания',
              reward: 5,
              status: 'closed',
              askedAtUtc: '2026-10-04T10:00:00Z',
              closesAtUtc: '2026-10-04T10:01:00Z',
              correctOptionId: 'right',
              mySelectedOptionId: selected,
              myIsCorrect: selected === 'right',
              myAwardedPoints: selected === 'right' ? 5 : 0,
              options,
              optionResults: options.map((option) => ({
                optionId: option.optionId,
                answerCount: option.optionId === selected ? 1 : 0,
                percentage: option.optionId === selected ? 100 : 0,
              })),
            },
          })
        : route.fulfill({ status: 204 }),
    )
    await page.route('**/api/game/history/games/quiz', (route) =>
      route.fulfill({
        json: {
          quiz: {
            totalPoints: 5,
            playerStats: [],
            manualAwards: [],
            questionSessions: [
              {
                questionSessionId: 'result',
                questionId: 'question',
                questionCode: 'result',
                questionText: 'Сколько дней в неделе?',
                categoryName: 'Общие знания',
                reward: 5,
                status: 'closed',
                askedAtUtc: '2026-10-04T10:00:00Z',
                closedAtUtc: '2026-10-04T10:01:00Z',
                correctOptionId: 'right',
                options,
                submissions: [
                  {
                    userId,
                    displayName: 'Участник',
                    selectedOptionId: selected,
                    selectedOptionText: selected === 'right' ? '7' : '5',
                    isCorrect: selected === 'right',
                    awardedPoints: selected === 'right' ? 5 : 0,
                    submittedAtUtc: '2026-10-04T10:00:10Z',
                  },
                ],
              },
            ],
          },
        },
      }),
    )
    for (source of ['current', 'history']) {
      for (selected of ['wrong', 'right']) {
        await page.goto('/panel/game-quiz')
        const question = page.getByTestId('quiz-timeline-question').first()
        const own = question.getByRole('button', {
          name: selected === 'right' ? /^7[, ]/ : /^5[, ]/,
        })
        const right = question.getByRole('button', { name: /^7[, ]/ })
        await expect(own).toBeDisabled()
        await expect(own).toHaveAttribute('aria-pressed', 'true')
        await expect(own.getByText('ваш выбор', { exact: true })).toHaveCount(0)
        await expect(right.getByText('Верно', { exact: true })).toHaveCount(0)
        await expect(own).toHaveAttribute('aria-label', /ваш выбор/)
        await expect(right).toHaveAttribute('aria-label', /Верно/)
        const result = question.getByRole(selected === 'right' ? 'status' : 'alert')
        await expect(result).toContainText(selected === 'right' ? 'Верно!' : 'Ответ неверный.')
        for (const element of [own, right, result]) {
          const styles = await element.evaluate((el) => ({
            background: getComputedStyle(el).backgroundImage,
            frame: getComputedStyle(el).borderImageSource,
          }))
          expect(styles.background).toContain('charcoal-paper')
          expect(styles.frame).toMatch(/^url\(/)
          expect(await element.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        ).toBe(true)
        await page.screenshot({ path: info.outputPath(`quiz-${source}-${selected}.png`) })
      }
    }
  })
}
