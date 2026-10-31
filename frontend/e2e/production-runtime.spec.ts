import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { expect, test, type Page, type Route, type WebSocketRoute } from '@playwright/test'
import { expectUnifiedTypography } from './typography-assertions.ts'
import type {
  GameQuestionCatalogItem,
  UpdateGameQuestionRequest,
} from '../src/shared/api/contracts/index.ts'

test.afterEach(async ({ page }) => {
  await expectUnifiedTypography(page)
})

const origin = 'https://deadmans.test'
const dist = resolve('dist')
const contentTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

// Exercise the built chunks with the actual server policy, including module evaluation
// order. The development server and jsdom do not enforce the production script policy.
async function serveProductionApp(page: Page, api: (route: Route) => Promise<void>) {
  const middleware = await readFile('../backend/Api/Http/SecurityHeadersMiddleware.cs', 'utf8')
  const policy = middleware.match(/FrontendContentSecurityPolicy\s*=\s*"([^"]+)"/)?.[1]
  expect(policy).toBeTruthy()
  await page.route(`${origin}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/me') {
      await route.fulfill({
        json: {
          userId: 'abf3680b-ac92-43ce-8c4f-c542f806e520',
          displayName: 'Administrator',
          roles: ['admin', 'viewer'],
        },
      })
    } else if (path.startsWith('/api/') || path.startsWith('/hubs/')) {
      await api(route)
    } else {
      const file = resolve(
        dist,
        path === '/' || path === '/overlay' || path.startsWith('/panel/')
          ? 'index.html'
          : `.${path}`,
      )
      expect(file.startsWith(`${dist}${sep}`)).toBe(true)
      await route.fulfill({
        body: await readFile(file),
        contentType: contentTypes[extname(file)] ?? 'application/octet-stream',
        headers: { 'Content-Security-Policy': policy! },
      })
    }
  })
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('i18nextLng', 'en'))
})

test('public guide loads built chunks anonymously under the production CSP', async ({ page }) => {
  const errors: string[] = []
  const gameRequests: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await serveProductionApp(page, async (route) => {
    gameRequests.push(new URL(route.request().url()).pathname)
    await route.fulfill({ status: 401 })
  })
  await page.route(`${origin}/auth/me`, (route) => route.fulfill({ status: 204 }))
  await page.goto(`${origin}/panel/game-guide#score`)
  await expect(
    page.getByRole('heading', { name: 'How to play Dead Mans', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Points and the team result', exact: true }),
  ).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Sign in with Twitch' })).toBeVisible()
  expect(gameRequests).toEqual([])
  expect(errors).toEqual([])
})

for (const intent of ['hover', 'focus'] as const) {
  test(`navigation preloads the destination on ${intent} without changing the route`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const errors: string[] = []
    const requests: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => requests.push(new URL(request.url()).pathname))
    await serveProductionApp(page, async (route) => route.fulfill({ status: 204 }))
    await page.goto(`${origin}/panel/game-board`)
    await expect(
      page.getByText(
        'No game has been published yet. The board will appear when registration opens.',
      ),
    ).toBeVisible()
    const destination = /\/GameTeamQueuePage-[^/]+\.js$/
    expect(requests.some((path) => destination.test(path))).toBe(false)
    const link = page.locator('a[href="/panel/game-team-queue"]:visible')
    if (intent === 'hover') await link.hover()
    else await link.focus()
    await expect.poll(() => requests.filter((path) => destination.test(path)).length).toBe(1)
    await expect(page).toHaveURL(`${origin}/panel/game-board`)
    await link.click()
    await expect(page.getByRole('heading', { name: 'Team queue', exact: true })).toBeVisible()
    expect(requests.filter((path) => destination.test(path))).toHaveLength(1)
    expect(errors).toEqual([])
  })
}

test('navigation retries a failed speculative chunk load after connectivity returns', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await serveProductionApp(page, async (route) => route.fulfill({ status: 204 }))
  let failNext = true
  await page.route('**/GameTeamQueuePage-*.js', async (route) => {
    if (failNext) {
      failNext = false
      await route.abort('failed')
    } else await route.fallback()
  })
  await page.goto(`${origin}/panel/game-board`)
  await expect(
    page.getByText(
      'No game has been published yet. The board will appear when registration opens.',
    ),
  ).toBeVisible()
  const link = page.locator('a[href="/panel/game-team-queue"]:visible')
  const failed = page.waitForEvent('requestfailed', (request) =>
    request.url().includes('/GameTeamQueuePage-'),
  )
  await link.hover()
  await failed
  await page.evaluate(
    () =>
      new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()))
      }),
  )
  await expect(page).toHaveURL(`${origin}/panel/game-board`)
  await link.click()
  await expect(page.getByRole('heading', { name: 'Team queue', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('game guide loads its translations and illustrations under production CSP', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await serveProductionApp(page, async (route) => route.fulfill({ status: 204 }))
  await page.goto(`${origin}/panel/game-board`)
  await page.getByRole('link', { name: 'How to play', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'How to play Dead Mans' })).toBeVisible()
  const contents = page.getByRole('navigation', { name: 'In this guide' })
  await contents.getByRole('link', { name: 'Round', exact: true }).click()
  const illustration = page.getByRole('img', { name: 'Board with closed cards and their values' })
  await illustration.scrollIntoViewIfNeeded()
  await expect
    .poll(() => illustration.evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0)
  await contents.getByRole('link', { name: 'Quiz', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'How the quiz works' })).toBeInViewport()
  expect(errors).toEqual([])
})

test('production entry point declares a bundled favicon', async ({ page }) => {
  await serveProductionApp(page, async (route) => route.fulfill({ status: 204 }))
  await page.goto(`${origin}/`)
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    'href',
    '/favicon.svg',
  )
  const icon = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]')!
    const response = await fetch(link.href)
    return {
      status: response.status,
      contentType: response.headers.get('content-type'),
      body: await response.text(),
    }
  })
  expect(icon.status).toBe(200)
  expect(icon.contentType).toBe('image/svg+xml')
  expect(icon.body).toContain('<svg')
  for (const href of ['/favicon-16.png', '/favicon-32.png', '/apple-touch-icon.png']) {
    const asset = await page.evaluate(async (path) => {
      const response = await fetch(path)
      const bitmap = await createImageBitmap(await response.blob())
      const result = {
        status: response.status,
        type: response.headers.get('content-type'),
        width: bitmap.width,
        height: bitmap.height,
      }
      bitmap.close()
      return result
    }, href)
    const size = href.includes('16') ? 16 : href.includes('32') ? 32 : 180
    expect(asset).toEqual({ status: 200, type: 'image/png', width: size, height: size })
  }
})

test('link preview metadata is present in the initial HTML without executing the app', async ({
  page,
}) => {
  await serveProductionApp(page, async (route) => route.fulfill({ status: 204 }))
  const response = await page.goto(`${origin}/`)
  const html = await response!.text()
  const metadata = await page.evaluate((source) => {
    const document = new DOMParser().parseFromString(source, 'text/html')
    return Object.fromEntries(
      [...document.querySelectorAll('meta[property], meta[name]')].map((tag) => [
        tag.getAttribute('property') ?? tag.getAttribute('name'),
        tag.getAttribute('content'),
      ]),
    )
  }, html)
  expect(metadata).toMatchObject({
    'og:title': "Deadman's - Набор мертвеца",
    'og:type': 'website',
    'og:url': 'https://deadman.bug.community/',
    'og:image': 'https://deadman.bug.community/brand/share-card.png',
    'og:image:type': 'image/png',
    'og:image:width': '1200',
    'og:image:height': '630',
    'twitter:card': 'summary_large_image',
  })
  expect(metadata['og:description']).toBe(
    "Примешь ли ты вызов Deadman's? Жестокие ладауты, непредсказуемые модификаторы и проверка знаний. Лишь сильнейшие способны пройти этот путь.",
  )
  expect(metadata['twitter:description']).toBe(metadata['og:description'])
  expect(metadata['og:image:alt']).toBe("Надпись Deadman's на чёрном фоне")
  const dimensions = await page.evaluate(async () => {
    const image = new Image()
    image.src = '/brand/share-card.png'
    await image.decode()
    return [image.naturalWidth, image.naturalHeight]
  })
  expect(dimensions).toEqual([1200, 630])
})

test('catalog answer editing preserves variants and validates duplicates under production CSP', async ({
  page,
}) => {
  const failures: string[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  const questionId = '80a7024d-1aef-46ae-9ca4-efb51db520a6'
  const categoryId = '098956eb-7adb-4f14-8300-7e846bf60747'
  let question: GameQuestionCatalogItem = {
    questionId,
    categoryId,
    questionCode: 'capital',
    categoryName: 'Geography',
    text: 'Capital?',
    options: [
      {
        optionId: '12300000-0000-4000-8000-000000000001',
        text: 'London',
        isCorrect: false,
        sortOrder: 0,
      },
      {
        optionId: '12300000-0000-4000-8000-000000000002',
        text: 'Paris',
        isCorrect: true,
        sortOrder: 1,
      },
    ],
    reward: 1,
    priority: 0,
    isEnabled: true,
    askedTotalCount: 0,
    submissionTotalCount: 0,
    correctSubmissionTotalCount: 0,
    correctPercentage: 0,
    lastAskedAtUtc: null,
  }
  const saved: unknown[] = []
  await serveProductionApp(page, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === '/api/game/questions/categories') {
      await route.fulfill({
        json: [{ id: categoryId, name: 'Geography', questionCount: 1, isProtected: false }],
      })
    } else if (path === '/api/game/questions/catalog') {
      await route.fulfill({ json: [question] })
    } else if (path === `/api/game/questions/${questionId}` && request.method() === 'PUT') {
      const body = request.postDataJSON() as UpdateGameQuestionRequest
      saved.push(body)
      question = {
        ...question,
        ...body,
        options: body.options.map((option, index) => ({
          ...option,
          optionId: `12300000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          sortOrder: index,
        })),
      }
      await route.fulfill({ json: question })
    } else {
      await route.fulfill({ status: 204 })
    }
  })
  await page.goto(`${origin}/panel/catalog-questions`)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('textbox', { name: /^Correct answer\s*\*?$/ })).toHaveValue('Paris')
  await expect(dialog.getByRole('radio')).toHaveCount(0)
  await expect(
    dialog.getByRole('textbox', { name: 'Incorrect option 1', exact: true }),
  ).toHaveValue('London')
  await dialog.getByRole('button', { name: 'Add option', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Incorrect option 2', exact: true }).fill(' paris ')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog.getByText('This answer variant is already added.')).toBeVisible()
  expect(saved).toHaveLength(0)
  await dialog.getByRole('textbox', { name: 'Incorrect option 2', exact: true }).fill('Berlin')
  await dialog.getByRole('button', { name: 'Remove incorrect option 1', exact: true }).click()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  const saveConfirmation = page.getByRole('dialog', { name: 'Save question changes', exact: true })
  await expect(saveConfirmation.getByText('Capital?', { exact: true })).toBeVisible()
  expect(saved).toHaveLength(0)
  await saveConfirmation.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(saved).toEqual([
    expect.objectContaining({
      options: [
        { text: 'Paris', isCorrect: true },
        { text: 'Berlin', isCorrect: false },
      ],
    }),
  ])
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: /^Correct answer\s*\*?$/ })).toHaveValue('Paris')
  await expect(
    dialog.getByRole('textbox', { name: 'Incorrect option 1', exact: true }),
  ).toHaveValue('Berlin')
  const longAnswer = 'a'.repeat(450)
  await dialog.getByRole('textbox', { name: 'Incorrect option 1', exact: true }).fill(longAnswer)
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await saveConfirmation.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('dialog', { name: 'Question details', exact: true })).toBeVisible()
  const answerChip = page.getByRole('dialog').getByText(longAnswer, { exact: true })
  await expect(answerChip).toBeVisible()
  expect(await answerChip.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect(failures).toEqual([])
})

test('production authentication and lazy form validation work under strict CSP', async ({
  page,
}) => {
  const violations: string[] = []
  const errors: string[] = []
  await page.exposeFunction('recordCspViolation', (directive: string) => violations.push(directive))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      void (
        window as unknown as { recordCspViolation: (value: string) => Promise<void> }
      ).recordCspViolation(`${event.effectiveDirective}: ${event.blockedURI}`)
    })
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await serveProductionApp(page, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/game/modifiers/catalog') {
      await route.fulfill({ json: [] })
    } else {
      await route.fulfill({ status: 204 })
    }
  })
  await page.goto(`${origin}/panel/catalog-modifiers`)
  await page.getByRole('button', { name: 'Add modifier', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('This field is required.').first()).toBeVisible()
  expect(errors).toEqual([])
  expect(violations).toEqual([])
})

test('a shared hub reconnects after an abnormal close and refreshes an empty board', async ({
  page,
}) => {
  const sockets: WebSocketRoute[] = []
  const failures: string[] = []
  let boardRequests = 0
  let published = false
  await page.routeWebSocket(`${origin.replace('https:', 'wss:')}/hubs/game-board*`, (socket) => {
    sockets.push(socket)
    socket.onMessage((message) => {
      if (String(message).includes('"protocol":"json"')) socket.send('{}\u001e')
    })
  })
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`)
  })
  await serveProductionApp(page, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/hubs/game-board/negotiate') {
      await route.fulfill({
        json: {
          negotiateVersion: 1,
          connectionId: 'runtime-test',
          connectionToken: 'runtime-token',
          availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }],
        },
      })
    } else if (path === '/api/game') {
      boardRequests += 1
      await route.fulfill(
        published
          ? {
              json: {
                gameId: '3f93a420-ef68-4cb0-9c39-5fa46c921001',
                title: 'Reconnected game',
                status: 'ready',
                version: 1,
                rows: 1,
                cols: 1,
                rowLabels: ['A'],
                colLabels: ['1'],
                cells: [],
              },
            }
          : { status: 204 },
      )
    } else if (path === '/api/game/team-queue') {
      await route.fulfill({
        json: { teams: [], summary: { totalTeams: 0, playedTeams: 0, remainingTeams: 0 } },
      })
    } else {
      await route.fulfill({ status: 204 })
    }
  })
  await page.goto(`${origin}/panel/game-board`)
  await expect(
    page.getByText(
      'No game has been published yet. The board will appear when registration opens.',
    ),
  ).toBeVisible()
  await expect.poll(() => sockets.length).toBe(1)
  const beforeReconnect = boardRequests
  published = true
  await sockets[0]!.close({ code: 1006 })
  await expect.poll(() => sockets.length).toBe(2)
  await expect.poll(() => boardRequests).toBeGreaterThan(beforeReconnect)
  await expect(
    page.getByText(
      'No game has been published yet. The board will appear when registration opens.',
    ),
  ).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Reconnected game', exact: true })).toBeVisible()
  published = false
  await sockets[1]!.close({ code: 1006 })
  await expect.poll(() => sockets.length).toBe(3)
  await expect(
    page.getByText(
      'No game has been published yet. The board will appear when registration opens.',
    ),
  ).toBeVisible()
  expect(failures).toEqual([])
})

test('OBS overlay works under the production CSP without account requests', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  const errors: string[] = []
  const requests: string[] = []
  let showRound = false
  let showGameplay = false
  let showSummary = false
  const gameplayStartedAtUtc = new Date(Date.now() - 30_000).toISOString()
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => requests.push(new URL(request.url()).pathname))
  await serveProductionApp(page, async (route) => {
    if (new URL(route.request().url()).pathname.startsWith('/hubs/game-overlay')) {
      await route.fulfill({ status: 503 })
      return
    }
    expect(new URL(route.request().url()).pathname).toBe('/api/overlay/snapshot')
    await route.fulfill({
      json: {
        gameId: 'game',
        round:
          showRound && !showGameplay
            ? {
                id: 'round',
                columnLabel: 'Hunt',
                rowLabel: '100',
                title: 'Opened card',
                cost: 100,
                imageUrl: `${origin}/brand/share-card.png`,
                modifiers: [
                  {
                    id: 'activation',
                    modifierId: 'modifier-1',
                    name: 'One chance',
                    iconEmoji: null,
                  },
                ],
              }
            : null,
        phase: showSummary
          ? 'reviewing_results'
          : showGameplay
            ? 'in_progress'
            : showRound
              ? 'awaiting_modifiers'
              : 'select_card',
        summary: showSummary
          ? {
              roundId: 'round',
              isFinal: false,
              card: {
                id: 'round',
                columnLabel: 'Hunt',
                rowLabel: '100',
                title: 'Opened card',
                cost: 100,
                imageUrl: `${origin}/brand/share-card.png`,
                modifiers: [],
              },
              teamName: 'Broadcast team',
              teamSlotIndex: 1,
              killsCount: 2,
              bountyCount: 1,
              killsScore: 200,
              bountyScore: 100,
              scoreDetails: {
                scoreUnit: 100,
                killsScore: 200,
                bountyScore: 100,
                modifierKillDelta: 0,
                modifierKillScore: 0,
                modifierScoreDelta: 0,
                emptyCardPenaltyApplied: false,
                emptyCardPenaltyScore: 0,
                penaltyTotal: 0,
                bonusDelta: 0,
                totalKillCount: 2,
                finalScore: 300,
                calculationLines: [
                  {
                    kind: 'kills',
                    activationCount: 0,
                    pointsDelta: 200,
                    runningTotal: 200,
                    operands: [],
                  },
                  {
                    kind: 'bounties',
                    activationCount: 0,
                    pointsDelta: 100,
                    runningTotal: 300,
                    operands: [],
                  },
                  {
                    kind: 'modifierPoints',
                    modifierId: 'modifier-1',
                    modifierName: 'One chance',
                    activationCount: 1,
                    pointsDelta: 0,
                    runningTotal: 300,
                    operands: [],
                  },
                ],
              },
            }
          : null,
        gameplay: showGameplay
          ? {
              roundId: 'round',
              gameplayStartedAtUtc,
              serverNowUtc: new Date().toISOString(),
              modifiers: [
                {
                  modifierId: 'modifier-1',
                  name: 'One chance',
                  iconEmoji: null,
                  activationCount: 1,
                  timers: [{ id: 'timer-1', durationSeconds: 300 }],
                },
              ],
            }
          : null,
        team: { name: 'Broadcast team', slotIndex: 1, players: ['Hunter', 'Scout'] },
        board: {
          rowLabels: ['100'],
          colLabels: ['Hunt'],
          cells: [{ row: 0, col: 0, cost: 100, state: 'closed', title: null }],
        },
      },
    })
  })
  await page.goto(`${origin}/overlay#key=${'a'.repeat(64)}`)
  await expect(page.getByText('Broadcast team')).toBeVisible()
  await expect(page.getByTestId('overlay-board')).toBeVisible()
  await expect(page.getByTestId('overlay-board').locator('[data-state="closed"]')).toHaveText(
    '100 pts',
  )
  showRound = true
  await expect(page.getByTestId('overlay-card')).toBeVisible()
  await expect(page.getByTestId('overlay-card').getByRole('img')).toBeVisible()
  await expect(page.getByText('One chance')).toBeVisible()
  await expect(page.getByTestId('overlay-board')).toHaveCount(0)
  showGameplay = true
  await expect(page.getByRole('timer')).toHaveText(/^4:[23]\d$/)
  await expect(page.getByTestId('overlay-card')).toHaveCount(0)
  await expect(page.getByTestId('overlay-team')).toBeHidden()
  showSummary = true
  await expect(page.getByTestId('overlay-summary')).toContainText('Result review')
  await expect(page.getByTestId('overlay-summary-total').getByRole('status')).toHaveText('300')
  await expect(
    page.getByTestId('overlay-summary').getByTestId('round-score-breakdown').locator('dd'),
  ).toHaveCount(0)
  await expect(page.getByTestId('overlay-summary')).toContainText('One chance')
  await expect(page.getByTestId('overlay-team')).toBeVisible()
  await expect(page.getByTestId('overlay-team')).toContainText('Broadcast team')
  await expect(page.getByTestId('overlay-team')).toContainText('Hunter')
  await expect(page.getByTestId('overlay-team')).toContainText('Scout')
  await expect(page.getByRole('timer')).toHaveCount(0)
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgba(0, 0, 0, 0)',
  )
  expect(requests).not.toContain('/auth/me')
  expect(errors).toEqual([])
})
