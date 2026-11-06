import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import {
  profileAnswers,
  emptyProfileStatistics,
  profileFixture,
  profileChartFixture,
  profileGames,
  profileQuizGames,
  profilePage,
} from './support/profile-fixture.ts'
import { expectUnifiedTypography } from './typography-assertions.ts'

async function mockProfile(
  page: Page,
  options: { empty?: boolean; anonymous?: boolean; brokenAvatar?: boolean } = {},
) {
  await page.routeWebSocket(/\/hubs\/game-board(?:\?|$)/, (socket) => {
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) socket.send('{}\u001e')
    })
  })
  await page.route(profileFixture.profileImageUrl!, async (route) => {
    if (options.brokenAvatar) await route.fulfill({ status: 404 })
    else
      await route.fulfill({
        body: await readFile('public/favicon-32.png'),
        contentType: 'image/png',
      })
  })
  await page.route(
    (url) =>
      url.pathname === '/auth/me' ||
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/hubs/'),
    async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname.endsWith('/negotiate')) {
        await route.fulfill({
          json: {
            negotiateVersion: 1,
            connectionId: 'profile',
            connectionToken: 'profile',
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }],
          },
        })
      } else if (url.pathname === '/auth/me') {
        await route.fulfill(
          options.anonymous
            ? { status: 204 }
            : {
                json: {
                  userId: profileFixture.userId,
                  displayName: profileFixture.displayName,
                  roles: ['viewer'],
                },
              },
        )
      } else if (url.pathname === '/api/profile/me') {
        await route.fulfill({
          json: options.empty
            ? {
                ...profileFixture,
                profileImageUrl: null,
                playerGameCount: 0,
                quizGameCount: 0,
                answerCount: 0,
                correctAnswerCount: 0,
                statistics: emptyProfileStatistics,
              }
            : profileFixture,
        })
      } else if (url.pathname === '/api/profile/me/games') {
        await route.fulfill({
          json: profilePage(
            options.empty
              ? []
              : url.searchParams.get('participation') === 'quiz'
                ? profileQuizGames
                : profileGames,
            url.href,
          ),
        })
      } else if (url.pathname === '/api/profile/me/answers') {
        const gameId = url.searchParams.get('gameId')
        const answers = options.empty
          ? []
          : profileAnswers.filter((answer) => !gameId || answer.gameId === gameId)
        await route.fulfill({ json: profilePage(answers, url.href) })
      } else if (url.pathname === '/api/game/notifications') await route.fulfill({ json: [] })
      else await route.fulfill({ status: 204 })
    },
  )
}

async function expectMetric(page: Page, label: string, value: number) {
  const metric = page
    .getByRole('region', { name: /^(Profile overview|Обзор профиля)$/ })
    .getByRole('group', { name: label, exact: true })
  await expect(metric).toBeVisible()
  await expect(metric.locator('dd')).toHaveText(String(value))
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('i18nextLng', 'en'))
})

test.afterEach(async ({ page }) => {
  await expectUnifiedTypography(page)
})

for (const width of [390, 768, 1440]) {
  test(`own profile opens from nickname and shows separate quiz answer details at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.text().startsWith('profile-csp:')) errors.push(message.text())
    })
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        console.error(`profile-csp:${event.violatedDirective}`)
      })
    })
    await mockProfile(page)
    await page.goto('/panel/game-board')
    await page.getByRole('button', { name: 'Bayou Hunter', exact: true }).click()
    await page.getByRole('button', { name: 'My profile', exact: true }).click()
    await expect(page).toHaveURL(/\/panel\/profile$/)
    await expect(page.getByRole('heading', { name: 'My profile', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bayou Hunter', exact: true })).toBeVisible()
    await expect(page.getByText('@bayou_hunter', { exact: true })).toHaveCount(0)
    const avatar = page.getByRole('img', { name: 'Profile image of Bayou Hunter', exact: true })
    await expect
      .poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0)
    await expect(page.getByRole('tab', { name: 'Statistics', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const sections = page
      .getByRole('tabpanel', { name: 'Statistics', exact: true })
      .getByRole('region')
    await expect(sections).toHaveCount(6)
    const sectionBounds = await sections.evaluateAll((elements) =>
      elements.map((element) => {
        const bounds = element.getBoundingClientRect()
        return { left: bounds.left, width: bounds.width, top: bounds.top, bottom: bounds.bottom }
      }),
    )
    const firstSection = sectionBounds[0]!
    for (const [index, bounds] of sectionBounds.entries()) {
      expect(Math.abs(bounds.left - firstSection.left)).toBeLessThanOrEqual(1)
      expect(Math.abs(bounds.width - firstSection.width)).toBeLessThanOrEqual(1)
      if (index > 0) expect(bounds.top).toBeGreaterThanOrEqual(sectionBounds[index - 1]!.bottom)
    }
    await page.screenshot({ path: testInfo.outputPath('profile-statistics.png'), fullPage: true })
    await page.getByRole('tab', { name: 'Game participation', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Night in the bayou', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Game results', exact: true }).first(),
    ).toHaveAttribute('href', `/panel/game-history?gameId=${profileGames[0]!.gameId}&focus=me`)
    await page.screenshot({ path: testInfo.outputPath('profile-games.png') })
    const activeGame = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: 'Hunt 2', exact: true }) })
    await expect(activeGame.getByRole('link', { name: 'Game results' })).toHaveCount(0)
    await expect(
      page.getByRole('heading', { name: 'Quiz from the audience', exact: true }),
    ).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'My answers', exact: true })).toHaveCount(0)
    await page.getByRole('tab', { name: 'Quiz', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Quiz from the audience', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Hunt 2', exact: true })).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Games pages', exact: true })).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath('profile-quizzes.png') })
    await page.getByRole('button', { name: 'My answers', exact: true }).first().click()
    await expect(
      page.getByRole('heading', { name: 'Night in the bayou', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back to quizzes', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'My answers', exact: true })).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: /^(Games|Answers) pages$/ })).toHaveCount(0)
    await expect(page.getByText('My answer: Location 1', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('tabpanel', { name: 'Quiz', exact: true }).getByRole('listitem'),
    ).toHaveCount(1)
    await expect(page.getByText('Points awarded: 7', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Which creature leaves these traces?' }),
    ).toHaveCount(0)
    await page.getByRole('button', { name: 'View screenshot', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'View screenshot' })).toBeVisible()
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.getByRole('tab', { name: 'Quiz', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await page.getByRole('button', { name: 'Back to quizzes', exact: true }).click()
    await page.getByRole('button', { name: 'My answers', exact: true }).nth(1).click()
    await expect(
      page.getByRole('heading', { name: 'Quiz from the audience', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('My answer: Spider', { exact: true })).toBeVisible()
    await expect(page.getByText('Incorrect', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Which location is shown?' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Back to quizzes', exact: true }).click()
    await expect(page.getByText('My answer: Spider', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'My answers', exact: true }).first().click()
    await expect(page.getByText('My answer: Location 1', { exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('profile-answers.png'), fullPage: true })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    expect(errors).toEqual([])
  })
}

test('statistics opens first with lifetime aggregates and no quiz navigation', async ({ page }) => {
  await mockProfile(page)
  const historyRequests: string[] = []
  page.on('request', (request) => {
    if (/\/api\/profile\/me\/(games|answers)/.test(new URL(request.url()).pathname))
      historyRequests.push(request.url())
  })
  await page.goto('/panel/profile')
  await expect(page.getByRole('tab')).toHaveText([
    'Statistics',
    'Charts',
    'Game participation',
    'Quiz',
  ])
  await expect(page.getByRole('tab', { name: 'Statistics', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expectMetric(page, 'Games as a player', 21)
  await expectMetric(page, 'Quiz games', 2)
  await expectMetric(page, 'Total answers', 2)
  await expectMetric(page, 'Correct answers', 1)
  const statistics = page.getByRole('tabpanel', { name: 'Statistics', exact: true })
  for (const title of [
    'Key statistics',
    'Game results',
    'Points',
    'Answers and records',
    'Modifiers',
    'Activity',
  ])
    await expect(statistics.getByRole('region', { name: title, exact: true })).toBeVisible()
  const key = statistics.getByRole('region', { name: 'Key statistics', exact: true })
  await expect(
    key.getByRole('group', { name: 'Completed rounds', exact: true }).locator('dd'),
  ).toHaveText('7')
  await expect(
    key.getByRole('group', { name: 'Points from answers', exact: true }).locator('dd'),
  ).toHaveText('7')
  expect(profileFixture.statistics.completedRoundCount).toBeGreaterThan(
    profileGames.slice(0, 20).reduce((sum, game) => sum + game.completedRoundCount, 0),
  )
  await expect(
    statistics.getByRole('group', { name: 'Win rate', exact: true }).locator('dd'),
  ).toHaveText('50%')
  await expect(
    statistics.getByRole('group', { name: 'Correct answer rate', exact: true }).locator('dd'),
  ).toHaveText('50%')
  await expect(statistics.getByRole('region', { name: 'Best quiz', exact: true })).toHaveCount(0)
  await expect(statistics.getByRole('button', { name: 'My answers', exact: true })).toHaveCount(0)
  await expect(statistics.getByRole('link')).toHaveCount(0)
  expect(historyRequests).toEqual([])
})

test('populated statistics reveal category and modifier breakdowns', async ({ page }, testInfo) => {
  await mockProfile(page)
  await page.goto('/panel/profile')
  const statistics = page.getByRole('tabpanel', { name: 'Statistics', exact: true })
  const key = statistics.getByRole('region', { name: 'Key statistics', exact: true })
  await expect(
    key.getByRole('group', { name: 'Team victories', exact: true }).locator('dd'),
  ).toHaveText('1')
  await expect(
    key.getByRole('group', { name: 'Applied modifiers', exact: true }).locator('dd'),
  ).toHaveText('3')
  const format = statistics
    .locator('details')
    .filter({ has: page.getByRole('button', { name: 'By question format', exact: true }) })
  await format.getByRole('button', { name: 'By question format', exact: true }).click()
  await expect(format.getByRole('heading', { name: 'Text questions', exact: true })).toBeVisible()
  await expect(format.getByRole('heading', { name: 'Screenshots', exact: true })).toBeVisible()
  await expect(
    format.getByRole('group', { name: 'Correct answer rate', exact: true }).locator('dd'),
  ).toHaveText(['0%', '100%'])
  const categories = statistics
    .locator('details')
    .filter({ has: page.getByRole('button', { name: 'By question category', exact: true }) })
  await categories.getByRole('button', { name: 'By question category', exact: true }).click()
  await expect(categories.getByRole('heading', { name: 'Locations', exact: true })).toBeVisible()
  await expect(categories.getByRole('heading', { name: 'World', exact: true })).toBeVisible()
  await expect(
    categories.getByRole('group', { name: 'Correct answer rate', exact: true }).locator('dd'),
  ).toHaveText(['100%', '0%'])
  const modifiers = statistics.getByRole('region', { name: 'Modifiers', exact: true })
  await expect(modifiers.getByText(/Sticky bomb/)).toBeVisible()
  await modifiers.getByRole('button', { name: 'Modifier details', exact: true }).click()
  await expect(
    modifiers.getByRole('group', { name: 'Offensive', exact: true }).locator('dd'),
  ).toHaveText('3')
  await expect(
    modifiers.getByRole('group', { name: 'Support', exact: true }).locator('dd'),
  ).toHaveText('2')
  await expect(
    statistics.getByRole('button', { name: 'Monthly breakdown', exact: true }),
  ).toHaveCount(0)
  await expect(statistics.getByText(/NaN|undefined|null|Invalid Date/)).toHaveCount(0)
  await page.getByRole('heading', { name: 'My profile', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({
    path: testInfo.outputPath('profile-statistics-breakdowns.png'),
    fullPage: true,
  })
})

for (const config of [
  {
    locale: 'en',
    width: 390,
    tab: 'Charts',
    monthly: 'Monthly activity',
    metric: 'Metric',
    answers: 'Answers',
    rounds: 'Rounds',
    modifiers: 'Modifier orders',
    games: 'Games',
    breakdown: 'Monthly breakdown',
    totalAnswers: 'Total answers',
    values: 'Monthly values',
    accuracy: 'Accuracy by category',
  },
  {
    locale: 'ru',
    width: 1080,
    tab: 'Графики',
    monthly: 'Активность по месяцам',
    metric: 'Показатель',
    answers: 'Ответы',
    rounds: 'Раунды',
    modifiers: 'Заказы модификаторов',
    games: 'Игры',
    breakdown: 'По месяцам',
    totalAnswers: 'Всего ответов',
    values: 'Значения по месяцам',
    accuracy: 'Точность по категориям',
  },
]) {
  test(`charts select monthly series without fetching histories at ${config.width}px in ${config.locale}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: config.width, height: 900 })
    await page.addInitScript((locale) => localStorage.setItem('i18nextLng', locale), config.locale)
    await mockProfile(page)
    await page.route('**/api/profile/me', (route) => route.fulfill({ json: profileChartFixture }))
    const historyRequests: string[] = []
    page.on('request', (request) => {
      if (/\/api\/profile\/me\/(games|answers)/.test(new URL(request.url()).pathname))
        historyRequests.push(request.url())
    })
    await page.goto('/panel/profile')
    await page.getByRole('tab', { name: config.tab, exact: true }).click()
    const charts = page.getByRole('tabpanel', { name: config.tab, exact: true })
    const monthly = charts.getByRole('region', { name: config.monthly, exact: true })
    const metric = monthly.getByRole('combobox', { name: new RegExp(`^${config.metric}(?: |$)`) })
    await expect(metric).toContainText(config.answers)
    await expect(
      monthly.getByRole('img', { name: `${config.monthly} · ${config.answers}`, exact: true }),
    ).toBeVisible()
    const number = new Intl.NumberFormat(config.locale, { maximumFractionDigits: 1 })
    const categories = charts.getByRole('region', { name: config.accuracy, exact: true })
    for (const category of profileChartFixture.statistics.quiz.categories)
      await expect(categories.getByText(category.name, { exact: true })).toBeVisible()
    expect(
      profileChartFixture.statistics.activity.months.reduce(
        (sum, month) => sum + month.answerCount,
        0,
      ),
    ).toBe(profileChartFixture.answerCount)
    expect(
      profileChartFixture.statistics.activity.months.reduce(
        (sum, month) => sum + month.roundCount,
        0,
      ),
    ).toBe(profileChartFixture.statistics.completedRoundCount)
    expect(
      profileChartFixture.statistics.activity.months.reduce(
        (sum, month) => sum + month.modifierCount,
        0,
      ),
    ).toBe(profileChartFixture.statistics.modifiers.orderedCount)
    await page
      .getByRole('heading', {
        name: config.locale === 'ru' ? 'Мой профиль' : 'My profile',
        exact: true,
      })
      .scrollIntoViewIfNeeded()
    await page.screenshot({
      path: testInfo.outputPath('profile-charts-answers.png'),
      fullPage: true,
    })
    for (const series of [
      { label: config.rounds, key: 'roundCount' },
      { label: config.modifiers, key: 'modifierCount' },
      { label: config.games, key: 'gameCount' },
      { label: config.answers, key: 'answerCount' },
    ] as const) {
      await metric.click()
      await page.getByRole('option', { name: series.label, exact: true }).click()
      await expect(metric).toContainText(series.label)
      await expect(
        monthly.getByRole('img', { name: `${config.monthly} · ${series.label}`, exact: true }),
      ).toBeVisible()
      const values = monthly
        .getByRole('list', { name: `${config.values}: ${series.label}`, exact: true })
        .getByRole('listitem')
      await expect(values).toHaveCount(12)
      for (const [index, entry] of profileChartFixture.statistics.activity.months.entries())
        await expect(
          values.nth(index).getByText(number.format(entry[series.key]), { exact: true }),
        ).toBeVisible()
      if (series.key === 'roundCount') {
        await page
          .getByRole('tab', {
            name: config.locale === 'ru' ? 'Статистика' : 'Statistics',
            exact: true,
          })
          .click()
        await expect(monthly).toBeHidden()
        await page.getByRole('tab', { name: config.tab, exact: true }).click()
        await expect(metric).toContainText(config.rounds)
        await expect(
          monthly.getByRole('img', { name: `${config.monthly} · ${config.rounds}`, exact: true }),
        ).toBeVisible()
        await page
          .getByRole('heading', {
            name: config.locale === 'ru' ? 'Мой профиль' : 'My profile',
            exact: true,
          })
          .scrollIntoViewIfNeeded()
        await page.screenshot({
          path: testInfo.outputPath('profile-charts-rounds.png'),
          fullPage: true,
        })
      }
    }
    const breakdown = monthly
      .locator('details')
      .filter({ has: page.getByRole('button', { name: config.breakdown, exact: true }) })
    await breakdown.getByRole('button', { name: config.breakdown, exact: true }).click()
    await expect(breakdown.getByRole('heading', { level: 3 })).toHaveCount(12)
    await expect(
      breakdown.getByRole('group', { name: config.totalAnswers, exact: true }).locator('dd'),
    ).toHaveText(
      profileChartFixture.statistics.activity.months.map((month) =>
        number.format(month.answerCount),
      ),
    )
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await expect(charts.getByText(/NaN|undefined|null|Invalid Date/)).toHaveCount(0)
    expect(historyRequests).toEqual([])
    await page
      .getByRole('heading', {
        name: config.locale === 'ru' ? 'Мой профиль' : 'My profile',
        exact: true,
      })
      .scrollIntoViewIfNeeded()
    await page.screenshot({
      path: testInfo.outputPath('profile-charts-monthly-details.png'),
      fullPage: true,
    })
  })
}

test('empty charts keep zero data and never show a full percentage', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await mockProfile(page, { empty: true })
  await page.goto('/panel/profile')
  await page.getByRole('tab', { name: 'Charts', exact: true }).click()
  const charts = page.getByRole('tabpanel', { name: 'Charts', exact: true })
  await expect(charts.getByText('No activity yet', { exact: true }).first()).toBeVisible()
  await expect(charts.getByText(/100\s*%|NaN|undefined|null|Invalid Date/)).toHaveCount(0)
  const monthly = charts.getByRole('region', { name: 'Monthly activity', exact: true })
  const metric = monthly.getByRole('combobox', { name: /^Metric(?: |$)/ })
  await metric.click()
  await page.getByRole('option', { name: 'Rounds', exact: true }).click()
  await expect(charts.getByText('No activity yet', { exact: true }).first()).toBeVisible()
  const values = monthly
    .getByRole('list', { name: 'Monthly values: Rounds', exact: true })
    .getByRole('listitem')
  await expect(values).toHaveCount(12)
  for (let index = 0; index < 12; index++)
    await expect(values.nth(index).getByText('0', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('heading', { name: 'My profile', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('profile-charts-empty.png'), fullPage: true })
})

test('large accumulated totals keep server averages and fit a narrow profile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await mockProfile(page)
  const saturated = 2147483647
  await page.route('**/api/profile/me', (route) =>
    route.fulfill({
      json: {
        ...profileFixture,
        answerCount: 3,
        correctAnswerCount: 3,
        statistics: {
          ...profileFixture.statistics,
          awardedQuizPoints: saturated,
          games: {
            ...profileFixture.statistics.games,
            totalRoundScore: saturated,
            bestRoundScore: 1000000000,
            averageRoundScore: 1000000000,
          },
          quiz: {
            ...profileFixture.statistics.quiz,
            answerCount: 3,
            correctAnswerCount: 3,
            incorrectAnswerCount: 0,
            averageAnswerPoints: 1000000000,
            text: { answerCount: 3, correctAnswerCount: 3, points: saturated },
            screenshot: { answerCount: 0, correctAnswerCount: 0, points: 0 },
            longestCorrectStreak: 3,
            maxCorrectAnswersPerGame: 2,
            maxPointsPerGame: 2000000000,
            categories: [
              { name: 'World', answerCount: 3, correctAnswerCount: 3, points: saturated },
            ],
          },
          points: {
            manualAwarded: saturated,
            manualDeducted: 0,
            spent: saturated,
            refunded: 0,
            netSpent: saturated,
            averagePaidOrderCost: 1000000000,
          },
        },
      },
    }),
  )
  await page.goto('/panel/profile')
  const statistics = page.getByRole('tabpanel', { name: 'Statistics', exact: true })
  await statistics.getByRole('button', { name: 'Team round results', exact: true }).click()
  for (const label of ['Average round score', 'Points per answer', 'Average paid order cost'])
    await expect(
      statistics.getByRole('group', { name: label, exact: true }).locator('dd'),
    ).toHaveText('1,000,000,000')
  await expect(
    statistics.getByRole('group', { name: 'Correct answer rate', exact: true }).locator('dd'),
  ).toHaveText('100%')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('pagination retains the last page after an error and retries without losing navigation', async ({
  page,
}) => {
  await mockProfile(page)
  let fail = true
  await page.route('**/api/profile/me/games?**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('page') === '2' && fail)
      await route.fulfill({ status: 503, json: { code: 'unavailable' } })
    else await route.fallback()
  })
  await page.goto('/panel/profile')
  await page.getByRole('tab', { name: 'Game participation', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Night in the bayou' })).toBeVisible()
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.getByText('Could not load this page of games. Please try again.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Night in the bayou' })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hunt 21', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Previous page', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Night in the bayou' })).toBeVisible()
})

test('profile error is recoverable without hiding loaded history', async ({ page }) => {
  await mockProfile(page)
  let fail = true
  await page.route('**/api/profile/me', async (route) => {
    if (fail) await route.fulfill({ status: 503, json: { code: 'unavailable' } })
    else await route.fallback()
  })
  await page.goto('/panel/profile')
  await page.getByRole('tab', { name: 'Game participation', exact: true }).click()
  await expect(page.getByText('Could not load your profile. Please try again.')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Games as a player', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Night in the bayou' })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bayou Hunter', exact: true })).toBeVisible()
  await expect(page.getByText('@bayou_hunter', { exact: true })).toHaveCount(0)
})

test('new users have explicit empty histories and an avatar fallback', async ({ page }) => {
  await mockProfile(page, { empty: true })
  await page.goto('/panel/profile')
  await expect(page.getByRole('img', { name: 'Profile image of Bayou Hunter' })).toHaveText('BH')
  for (const label of ['Games as a player', 'Quiz games', 'Total answers', 'Correct answers'])
    await expectMetric(page, label, 0)
  const statistics = page.getByRole('tabpanel', { name: 'Statistics', exact: true })
  await expect(statistics).toBeVisible()
  const key = statistics.getByRole('region', { name: 'Key statistics', exact: true })
  for (const label of [
    'Team victories',
    'Completed rounds',
    'Points from answers',
    'Applied modifiers',
  ])
    await expect(key.getByRole('group', { name: label, exact: true }).locator('dd')).toHaveText('0')
  for (const label of ['Win rate', 'Correct answer rate'])
    await expect(
      statistics.getByRole('group', { name: label, exact: true }).locator('dd'),
    ).toHaveText('0%')
  await expect(statistics.getByRole('region', { name: 'Best quiz', exact: true })).toHaveCount(0)
  await expect(statistics.getByRole('button', { name: 'My answers', exact: true })).toHaveCount(0)
  await expect(statistics.getByText('No data yet', { exact: true }).first()).toBeVisible()
  await page.getByRole('tab', { name: 'Game participation', exact: true }).click()
  await expect(page.getByText('You have not joined any games as a player yet.')).toBeVisible()
  await expect(page.getByRole('navigation', { name: /^(Games|Answers) pages$/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Game results', exact: true })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click()
  await expect(
    page
      .getByRole('tabpanel', { name: 'Quiz', exact: true })
      .getByText('You have no quiz answers to closed questions yet.'),
  ).toBeVisible()
  await expect(page.getByRole('navigation', { name: /^(Games|Answers) pages$/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'My answers', exact: true })).toHaveCount(0)
  await expect(page.getByText(/NaN|undefined|null|Invalid Date/)).toHaveCount(0)
})

test('player-only participation shows zero rounds and no quiz participation before the game starts', async ({
  page,
}) => {
  await mockProfile(page, { empty: true })
  const game = {
    ...profileGames[0]!,
    status: 'ready',
    startedAtUtc: null,
    finishedAtUtc: null,
    completedRoundCount: 0,
    answerCount: 0,
    correctAnswerCount: 0,
  }
  await page.route('**/api/profile/me', (route) =>
    route.fulfill({
      json: {
        ...profileFixture,
        playerGameCount: 1,
        quizGameCount: 0,
        answerCount: 0,
        correctAnswerCount: 0,
        statistics: emptyProfileStatistics,
      },
    }),
  )
  await page.route('**/api/profile/me/games?**', (route) =>
    route.fulfill({
      json: profilePage(
        new URL(route.request().url()).searchParams.get('participation') === 'player' ? [game] : [],
        route.request().url(),
      ),
    }),
  )
  await page.goto('/panel/profile')
  await expectMetric(page, 'Games as a player', 1)
  for (const label of ['Quiz games', 'Total answers', 'Correct answers'])
    await expectMetric(page, label, 0)
  await page.getByRole('tab', { name: 'Game participation', exact: true }).click()
  await expect(
    page
      .getByRole('tabpanel', { name: 'Game participation', exact: true })
      .getByRole('group', { name: 'Rounds', exact: true })
      .locator('dd'),
  ).toHaveText('0')
  await expect(page.getByText('Not started yet', { exact: true })).toBeVisible()
  await expect(page.getByText('Registration open', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Game results', exact: true })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click()
  await expect(
    page
      .getByRole('tabpanel', { name: 'Quiz', exact: true })
      .getByText('You have no quiz answers to closed questions yet.'),
  ).toBeVisible()
  await expect(page.getByRole('navigation', { name: /^(Games|Answers) pages$/ })).toHaveCount(0)
})

test('quiz-only participation keeps zero correct answers and zero awarded points visible', async ({
  page,
}) => {
  await mockProfile(page)
  await page.route('**/api/profile/me', (route) =>
    route.fulfill({
      json: {
        ...profileFixture,
        playerGameCount: 0,
        quizGameCount: 1,
        answerCount: 1,
        correctAnswerCount: 0,
        statistics: {
          ...emptyProfileStatistics,
          quiz: {
            ...emptyProfileStatistics.quiz,
            answerCount: 1,
            incorrectAnswerCount: 1,
            text: { answerCount: 1, correctAnswerCount: 0, points: 0 },
            categories: [{ name: 'World', answerCount: 1, correctAnswerCount: 0, points: 0 }],
          },
          activity: {
            ...emptyProfileStatistics.activity,
            firstActivityAtUtc: profileAnswers[1]!.submittedAtUtc,
            lastActivityAtUtc: profileAnswers[1]!.submittedAtUtc,
            activeDayCount: 1,
            months: emptyProfileStatistics.activity.months.map((month) =>
              month.month === '2026-11' ? { ...month, gameCount: 1, answerCount: 1 } : month,
            ),
          },
        },
      },
    }),
  )
  await page.route('**/api/profile/me/games?**', (route) =>
    route.fulfill({
      json: profilePage(
        new URL(route.request().url()).searchParams.get('participation') === 'quiz'
          ? [profileQuizGames[1]!]
          : [],
        route.request().url(),
      ),
    }),
  )
  await page.goto('/panel/profile')
  await expectMetric(page, 'Games as a player', 0)
  await expectMetric(page, 'Quiz games', 1)
  await expectMetric(page, 'Total answers', 1)
  await expectMetric(page, 'Correct answers', 0)
  await page.getByRole('tab', { name: 'Game participation', exact: true }).click()
  await expect(page.getByText('You have not joined any games as a player yet.')).toBeVisible()
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click()
  const quiz = page.getByRole('tabpanel', { name: 'Quiz', exact: true })
  await expect(
    quiz.getByRole('group', { name: 'Correct answers', exact: true }).locator('dd'),
  ).toHaveText('0')
  await page.getByRole('button', { name: 'My answers', exact: true }).click()
  await expect(page.getByText('Points awarded: 0', { exact: true })).toBeVisible()
  await expect(page.getByText('Incorrect', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View screenshot', exact: true })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: /^(Games|Answers) pages$/ })).toHaveCount(0)
})

test('an empty answer response keeps a clear empty state and a working return action', async ({
  page,
}) => {
  await mockProfile(page)
  await page.route('**/api/profile/me/answers?**', (route) =>
    route.fulfill({ json: profilePage([], route.request().url()) }),
  )
  await page.goto('/panel/profile')
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click()
  await page.getByRole('button', { name: 'My answers', exact: true }).first().click()
  await expect(page.getByText('You have no answers to closed questions yet.')).toBeVisible()
  await expect(
    page.getByRole('tabpanel', { name: 'Quiz', exact: true }).getByRole('listitem'),
  ).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: /^(Games|Answers) pages$/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Back to quizzes', exact: true }).click()
  await expect(page.getByRole('button', { name: 'My answers', exact: true }).first()).toBeFocused()
})

test('loading profile data is not presented as zero participation or an empty history', async ({
  page,
}) => {
  await mockProfile(page, { empty: true })
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(
    (url) => url.pathname.startsWith('/api/profile/me'),
    async (route) => {
      await pending
      await route.fallback()
    },
  )
  try {
    await page.goto('/panel/profile')
    await expect(page.getByText('Loading your profile...', { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Game participation', exact: true }).click()
    await expect(page.getByText('Loading your games...', { exact: true })).toBeVisible()
    await expect(page.getByRole('group', { name: 'Games as a player', exact: true })).toHaveCount(0)
    await expect(page.getByText('You have not joined any games as a player yet.')).toHaveCount(0)
  } finally {
    release()
  }
  await expectMetric(page, 'Games as a player', 0)
  await page.getByRole('tab', { name: 'Game participation', exact: true }).click()
  await expect(page.getByText('You have not joined any games as a player yet.')).toBeVisible()
})

test('Russian empty profile shows four zero metrics and clear histories at 1080px', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1080, height: 720 })
  await page.addInitScript(() => window.localStorage.setItem('i18nextLng', 'ru'))
  await mockProfile(page, { empty: true })
  await page.goto('/panel/profile')
  for (const label of ['Игр в роли игрока', 'Игр в викторине', 'Всего ответов', 'Верных ответов'])
    await expectMetric(page, label, 0)
  const statistics = page.getByRole('tabpanel', { name: 'Статистика', exact: true })
  const key = statistics.getByRole('region', { name: 'Главные показатели', exact: true })
  for (const label of [
    'Побед в составе команды',
    'Завершённых раундов',
    'Очков за ответы',
    'Применено модификаторов',
  ])
    await expect(key.getByRole('group', { name: label, exact: true }).locator('dd')).toHaveText('0')
  for (const label of ['Доля побед', 'Доля верных ответов'])
    await expect(
      statistics.getByRole('group', { name: label, exact: true }).locator('dd'),
    ).toHaveText(
      new Intl.NumberFormat('ru', { style: 'percent', maximumFractionDigits: 1 }).format(0),
    )
  await expect(statistics.getByText('Пока нет данных', { exact: true }).first()).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('profile-empty-statistics.png'),
    fullPage: true,
  })
  await page.getByRole('tab', { name: 'Участие в играх', exact: true }).click()
  await expect(page.getByText('Вы ещё не участвовали в играх в роли игрока.')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('profile-empty-games.png') })
  await page.getByRole('tab', { name: 'Викторина', exact: true }).click()
  await expect(
    page
      .getByRole('tabpanel', { name: 'Викторина', exact: true })
      .getByText('У вас пока нет ответов на завершённые вопросы викторины.'),
  ).toBeVisible()
  await expect(page.getByRole('navigation', { name: /Страницы (игр|ответов)/ })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('profile-empty-quiz.png') })
})

test('failed Twitch image does not prevent reading the profile', async ({ page }) => {
  await mockProfile(page, { brokenAvatar: true })
  await page.goto('/panel/profile')
  await expect(page.getByText('No image', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bayou Hunter', exact: true })).toBeVisible()
  await expect(page.getByText('@bayou_hunter', { exact: true })).toHaveCount(0)
})

test('Russian profile keeps long identity and game names readable at 1080px', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1080, height: 720 })
  await page.addInitScript(() => window.localStorage.setItem('i18nextLng', 'ru'))
  await mockProfile(page)
  const name = 'Bayou_Hunter_1234567890123'
  const title = 'Ночная охота в болотах: финальная игра большого турнира'
  await page.route('**/api/profile/me', (route) =>
    route.fulfill({
      json: {
        ...profileFixture,
        displayName: name,
        playerGameCount: 1234,
        quizGameCount: 567,
        answerCount: 54321,
        correctAnswerCount: 12345,
        statistics: {
          ...profileFixture.statistics,
          finishedPlayerGameCount: 1200,
          completedRoundCount: 4321,
          awardedQuizPoints: 86415,
          games: {
            ...profileFixture.statistics.games,
            playedGameCount: 1200,
            rankedGameCount: 1200,
            winCount: 456,
            podiumCount: 700,
            teamCount: 400,
            teammateCount: 700,
            totalRoundScore: 987654,
            averageRoundScore: 987654 / 4321,
            bestRoundScore: 12345,
            teamKills: 20000,
            teamBounties: 15000,
          },
          quiz: {
            ...profileFixture.statistics.quiz,
            answerCount: 54321,
            correctAnswerCount: 12345,
            incorrectAnswerCount: 41976,
            averageAnswerPoints: 86415 / 54321,
            text: { answerCount: 40000, correctAnswerCount: 10000, points: 70000 },
            screenshot: { answerCount: 14321, correctAnswerCount: 2345, points: 16415 },
            maxCorrectAnswersPerGame: 1000,
            maxPointsPerGame: 7000,
            categories: [
              {
                name: 'Очень длинное название категории вопросов викторины',
                answerCount: 54321,
                correctAnswerCount: 12345,
                points: 86415,
              },
            ],
          },
          points: {
            manualAwarded: 1234567,
            manualDeducted: 234567,
            spent: 987654,
            refunded: 123456,
            netSpent: 864198,
            averagePaidOrderCost: 987654 / 20000,
          },
          modifiers: {
            orderedCount: 23456,
            paidCount: 20000,
            freeCount: 3456,
            appliedCount: 21000,
            cancelledCount: 2000,
            pendingCount: 456,
            uniqueCount: 321,
            gameCount: 500,
            roundCount: 1234,
            mostUsed: {
              name: 'Очень длинное название модификатора для проверки переноса',
              count: 12345,
            },
            categories: [{ name: 'Очень длинное название категории модификаторов', count: 23456 }],
            outcomes: [
              { outcome: 'completed', count: 20000 },
              { outcome: 'violated', count: 1000 },
            ],
          },
          activity: {
            ...profileFixture.statistics.activity,
            activeDayCount: 365,
            firstActivityAtUtc: '2025-11-01T12:00:00Z',
            months: profileFixture.statistics.activity.months.map((month) =>
              month.month === '2026-11'
                ? {
                    ...month,
                    gameCount: 1801,
                    roundCount: 4321,
                    answerCount: 54321,
                    modifierCount: 23456,
                  }
                : month,
            ),
          },
        },
      },
    }),
  )
  await page.route('**/api/profile/me/games?**', (route) => {
    const games =
      new URL(route.request().url()).searchParams.get('participation') === 'quiz'
        ? profileQuizGames
        : profileGames
    return route.fulfill({
      json: profilePage([{ ...games[0]!, title }, ...games.slice(1)], route.request().url()),
    })
  })
  await page.goto('/panel/profile')
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  const statistics = page.getByRole('tabpanel', { name: 'Статистика', exact: true })
  const percent = new Intl.NumberFormat('ru', { style: 'percent', maximumFractionDigits: 1 })
  await expect(
    statistics.getByRole('group', { name: 'Доля побед', exact: true }).locator('dd'),
  ).toHaveText(percent.format(456 / 1200))
  await expect(
    statistics.getByRole('group', { name: 'Доля верных ответов', exact: true }).locator('dd'),
  ).toHaveText(percent.format(12345 / 54321))
  await statistics.getByRole('button', { name: 'По категориям вопросов', exact: true }).click()
  await expect(
    statistics.getByRole('heading', {
      name: 'Очень длинное название категории вопросов викторины',
      exact: true,
    }),
  ).toBeVisible()
  await statistics.getByRole('button', { name: 'Подробности модификаторов', exact: true }).click()
  await expect(
    statistics
      .getByRole('group', { name: 'Очень длинное название категории модификаторов', exact: true })
      .locator('dd'),
  ).toHaveText(new Intl.NumberFormat('ru').format(23456))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('heading', { name: 'Мой профиль', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('profile-ru-statistics.png'), fullPage: true })
  await page.getByRole('tab', { name: 'Участие в играх', exact: true }).click()
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: testInfo.outputPath('profile-ru-desktop.png') })
  await page.getByRole('tab', { name: 'Викторина', exact: true }).click()
  await page.getByRole('button', { name: 'Мои ответы', exact: true }).first().click()
  await expect(page.getByText('Мой ответ: Винный завод', { exact: true })).toBeVisible()
  await expect
    .poll(() =>
      page
        .getByRole('tabpanel', { name: 'Викторина', exact: true })
        .locator('img')
        .first()
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await expect(page.getByRole('button', { name: 'К списку викторин', exact: true })).toBeVisible()
  await expect(page.getByRole('navigation', { name: /Страницы (игр|ответов)/ })).toHaveCount(0)
  await expect(page.getByText('@bayou_hunter', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('profile-ru-answers.png') })
  await page.getByRole('button', { name: 'К списку викторин', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Мои ответы', exact: true })).toHaveCount(2)
})

for (const [locale, title, overview, statistics, charts] of [
  ['en', 'My profile', 'Profile overview', 'Statistics', 'Charts'],
  ['ru', 'Мой профиль', 'Обзор профиля', 'Статистика', 'Графики'],
  ['uk', 'Мій профіль', 'Огляд профілю', 'Статистика', 'Графіки'],
  ['pl', 'Mój profil', 'Przegląd profilu', 'Statystyki', 'Wykresy'],
]) {
  test(`direct profile entry loads ${locale} translations`, async ({ page }) => {
    await page.addInitScript(
      (language) => window.localStorage.setItem('i18nextLng', language),
      locale!,
    )
    await mockProfile(page, { empty: true })
    await page.goto('/panel/profile')
    await expect(page.getByRole('heading', { name: title!, exact: true })).toBeVisible()
    await expect(
      page.getByRole('region', { name: overview!, exact: true }).locator('dl dd'),
    ).toHaveText(['0', '0', '0', '0'])
    await expect(page.getByRole('tab', { name: statistics!, exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(
      page.getByRole('tabpanel', { name: statistics!, exact: true }).getByRole('region'),
    ).toHaveCount(6)
    await expect(
      page
        .getByRole('tabpanel', { name: statistics!, exact: true })
        .getByText(/NaN|undefined|null|Invalid Date/),
    ).toHaveCount(0)
    await expect(page.getByText(/userProfile\./)).toHaveCount(0)
    await expect(page.getByRole('tab').nth(1)).toHaveText(charts!)
    await page.getByRole('tab', { name: charts!, exact: true }).click()
    await expect(page.getByRole('tabpanel', { name: charts!, exact: true })).toBeVisible()
    await expect(page.getByText(/userProfile\./)).toHaveCount(0)
  })
}

test('anonymous visitors cannot load private profile data', async ({ page }) => {
  await mockProfile(page, { anonymous: true })
  const requests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/profile/')) requests.push(request.url())
  })
  await page.goto('/panel/profile')
  await expect(page.getByRole('button', { name: 'Sign in with Twitch' })).toBeVisible()
  expect(requests).toEqual([])
})

test('player and quiz histories retain independent pages', async ({ page }) => {
  await mockProfile(page)
  await page.goto('/panel/profile')
  await page.getByRole('tab', { name: 'Game participation', exact: true }).click()
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hunt 21', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Charts', exact: true }).click()
  await expect(page.getByRole('tabpanel', { name: 'Charts', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Game participation', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hunt 21', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Quiz from the audience', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hunt 21', exact: true })).toHaveCount(0)
  await expect(
    page
      .getByRole('tabpanel', { name: 'Quiz', exact: true })
      .getByRole('heading', { name: 'Hunt 21', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('tab', { name: 'Game participation', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hunt 21', exact: true })).toBeVisible()
})

test('a failed answer detail never displays another quiz answers and can recover', async ({
  page,
}) => {
  await mockProfile(page)
  let fail = true
  await page.route('**/api/profile/me/answers?**', async (route) => {
    if (
      new URL(route.request().url()).searchParams.get('gameId') === profileQuizGames[1]!.gameId &&
      fail
    )
      await route.fulfill({ status: 503, json: { code: 'unavailable' } })
    else await route.fallback()
  })
  await page.goto('/panel/profile')
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click()
  await page.getByRole('button', { name: 'My answers', exact: true }).first().click()
  await expect(page.getByText('My answer: Location 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Back to quizzes', exact: true }).click()
  await page.getByRole('button', { name: 'My answers', exact: true }).nth(1).click()
  await expect(
    page.getByRole('heading', { name: 'Quiz from the audience', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back to quizzes', exact: true })).toBeVisible()
  await expect(page.getByRole('navigation', { name: /^(Games|Answers) pages$/ })).toHaveCount(0)
  await expect(
    page.getByText('Could not load this page of answers. Please try again.'),
  ).toBeVisible()
  await expect(page.getByText('My answer: Location 1', { exact: true })).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByText('My answer: Spider', { exact: true })).toBeVisible()
})

test('answer details have one paginator and return to the quiz list page before resetting on reopen', async ({
  page,
}, testInfo) => {
  await mockProfile(page)
  const quizzes = Array.from({ length: 21 }, (_, index) => ({
    ...profileQuizGames[0]!,
    gameId: `00000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`,
    title: `Quiz ${index + 1}`,
    answerCount: 21,
    correctAnswerCount: 21,
  }))
  const selectedQuiz = quizzes[20]!
  await page.route('**/api/profile/me', (route) =>
    route.fulfill({
      json: {
        ...profileFixture,
        quizGameCount: quizzes.length,
        answerCount: quizzes.length * 21,
        correctAnswerCount: quizzes.length * 21,
        statistics: {
          ...profileFixture.statistics,
          awardedQuizPoints: quizzes.length * 21 * 7,
          activity: {
            ...profileFixture.statistics.activity,
            months: profileFixture.statistics.activity.months.map((month) =>
              month.month === '2026-11'
                ? { ...month, gameCount: 42, answerCount: quizzes.length * 21 }
                : month,
            ),
          },
          quiz: {
            ...profileFixture.statistics.quiz,
            answerCount: quizzes.length * 21,
            correctAnswerCount: quizzes.length * 21,
            incorrectAnswerCount: 0,
            averageAnswerPoints: 7,
            text: {
              answerCount: quizzes.length * 21,
              correctAnswerCount: quizzes.length * 21,
              points: quizzes.length * 21 * 7,
            },
            screenshot: { answerCount: 0, correctAnswerCount: 0, points: 0 },
            longestCorrectStreak: quizzes.length * 21,
            maxCorrectAnswersPerGame: 21,
            maxPointsPerGame: 147,
            categories: [
              {
                name: 'Locations',
                answerCount: quizzes.length * 21,
                correctAnswerCount: quizzes.length * 21,
                points: quizzes.length * 21 * 7,
              },
            ],
          },
        },
      },
    }),
  )
  const answers = Array.from({ length: 21 }, (_, index) => ({
    ...profileAnswers[0]!,
    questionSessionId: `session-${index}`,
    gameId: selectedQuiz.gameId,
    gameTitle: selectedQuiz.title,
    questionText: `Question ${index + 1}`,
    image: null,
  }))
  await page.route('**/api/profile/me/games?**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('participation') === 'quiz')
      await route.fulfill({ json: profilePage(quizzes, route.request().url()) })
    else await route.fallback()
  })
  let failAnswers = false
  await page.route('**/api/profile/me/answers?**', async (route) => {
    const url = new URL(route.request().url())
    expect(url.searchParams.get('gameId')).toBe(selectedQuiz.gameId)
    if (failAnswers && url.searchParams.get('page') === '2')
      await route.fulfill({ status: 503, json: { code: 'unavailable' } })
    else await route.fulfill({ json: profilePage(answers, route.request().url()) })
  })
  const paginators = page.getByRole('navigation', { name: /^(Games|Answers) pages$/ })
  await page.goto('/panel/profile')
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Games pages', exact: true })).toBeVisible()
  await expect(paginators).toHaveCount(1)
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Quiz 21', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Charts', exact: true }).click()
  await expect(page.getByRole('tabpanel', { name: 'Charts', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Quiz 21', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.getByRole('button', { name: 'My answers', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Question 1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back to quizzes', exact: true })).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Quiz 21', exact: true })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Games pages', exact: true })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Answers pages', exact: true })).toBeVisible()
  await expect(paginators).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('profile-answer-list.png') })
  failAnswers = true
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(
    page.getByText('Could not load this page of answers. Please try again.'),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Question 1', exact: true })).toBeVisible()
  await expect(paginators).toHaveCount(1)
  failAnswers = false
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Question 21', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Question 1', exact: true })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Charts', exact: true }).click()
  await expect(page.getByRole('tabpanel', { name: 'Charts', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Question 21', exact: true })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Answers pages', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.getByRole('button', { name: 'Back to quizzes', exact: true }).click()
  await expect(page.getByRole('button', { name: 'My answers', exact: true })).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Quiz 21', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quiz 1', exact: true })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Answers pages', exact: true })).toHaveCount(0)
  await expect(paginators).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.getByRole('button', { name: 'My answers', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Question 1', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Question 21', exact: true })).toHaveCount(0)
  await expect(paginators).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
})
