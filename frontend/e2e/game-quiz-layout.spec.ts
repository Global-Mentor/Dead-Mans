import { expect, test, type Page } from '@playwright/test'

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

async function mockQuiz(page: Page, roundPhase?: string) {
  let starts = 0
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
            cells: [],
            rowLabels: [],
            colLabels: [],
            enabledModifierIds: [],
            activeModifiers: [],
          },
        })
      if (path.endsWith('/integrations/twitch/status'))
        return route.fulfill({ json: { enabled: false } })
      if (path.endsWith('/rounds/active') && roundPhase)
        return route.fulfill({ json: { gameId: 'quiz', status: roundPhase } })
      if (path.endsWith('/quiz/current')) return route.fulfill({ status: 204 })
      if (path.endsWith('/questions/available')) return route.fulfill({ json: questions })
      if (path.endsWith('/history/games/quiz'))
        return route.fulfill({
          json: {
            quiz: {
              manualAwards: [],
              playerStats: [
                {
                  userId: 'one',
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
              ],
              questionSessions: Array.from({ length: 30 }, (_, index) => ({
                questionSessionId: `session-${index}`,
                questionId: `question-${index}`,
                questionCode: `q-${index}`,
                questionText: `Вопрос ${index + 1}: какой вариант ответа верный?`,
                categoryName: 'Общие знания',
                reward: 5,
                status: 'closed',
                askedAtUtc: '2026-09-21T10:00:00Z',
                closedAtUtc: '2026-09-21T10:01:00Z',
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
  return { starts: () => starts }
}

test('quiz launch is unavailable while modifiers are being ordered', async ({ page }) => {
  const mock = await mockQuiz(page, 'awaiting_modifiers')
  await page.goto('/panel/game-quiz')
  await expect(page.getByRole('button', { name: 'Следующий вопрос' })).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Задать конкретный вопрос', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByText('Завершите заказ модификаторов, прежде чем запускать вопрос.'),
  ).toBeVisible()
  expect(mock.starts()).toBe(0)
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
    await page.getByRole('tab', { name: 'История вопросов' }).click()
    await page.locator('summary').first().click()
    const panel = page.getByRole('tabpanel', { name: 'История вопросов' })
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
    await page.getByRole('tab', { name: 'История вопросов' }).click()
    await page.locator('summary').first().click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    const current = await page.getByRole('heading', { name: 'Вопросы викторины' }).boundingBox()
    const history = await page
      .getByRole('tablist', { name: 'Викторина', exact: true })
      .boundingBox()
    if (width < 1000) expect(history!.y).toBeGreaterThan(current!.y + current!.height)
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
  const panel = page.getByRole('tabpanel', { name: 'Таблица очков' })
  await expect(panel).toContainText('Второй')
  expect((await panel.innerText()).indexOf('Второй')).toBeLessThan(
    (await panel.innerText()).indexOf('Первый'),
  )
  await page.getByRole('tab', { name: 'Заработано' }).click()
  expect((await panel.innerText()).indexOf('Первый')).toBeLessThan(
    (await panel.innerText()).indexOf('Второй'),
  )
  await page.getByRole('button', { name: 'Следующий вопрос' }).click()
  const error = page.getByText(
    'Доступных вопросов больше нет: все вопросы этой игры уже были заданы.',
  )
  await expect(error).toBeVisible()
  await page.getByRole('button', { name: 'Задать конкретный вопрос', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('textbox', { name: 'Поиск вопросов' })).toBeFocused()
  await dialog.getByRole('textbox', { name: 'Поиск вопросов' }).fill('планета')
  await expect(dialog.getByText(questions[0]!.text)).toBeVisible()
  await expect(dialog.getByText(questions[1]!.text)).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Выбрать', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(error).toHaveCount(0)
  await expect.poll(mock.starts).toBe(1)
})
