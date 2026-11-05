import { expect, test, type CDPSession, type Page, type Route } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import type { GameQuestionCatalogItem } from '../src/shared/api/contracts/index.ts'
import { catalogPageFixture } from './support/catalog-page-fixture.ts'

test.skip(!process.env.MEASURE_UI_PERF, 'Run explicitly with MEASURE_UI_PERF=1.')

const origin = 'https://ui-performance.deadmans.test'
const dist = resolve(process.env.PERF_DIST_DIR ?? 'dist')
const outputLabel = process.env.PERF_LABEL ?? 'measurement'
const contentTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
}

async function serveFixture(page: Page, assetDelayMs = 0, catalog?: GameQuestionCatalogItem[]) {
  const activity = { connections: 0, requests: [] as string[] }
  const userId = 'a518e557-2910-4111-97fb-86eb7a079101'
  const team = {
    teamId: '5d4cf998-7479-429f-a644-ac55544b024e',
    name: 'Performance team',
    teamSlotIndex: 1,
    teamSlotType: 'public',
    recruitmentOpen: true,
    status: 'forming',
    isPlayed: false,
    isActiveInGame: false,
    members: [
      {
        player: { userId, login: 'performance', displayName: 'Performance player' },
        joinedAtUtc: '2026-09-13T00:00:00Z',
      },
    ],
    pendingInvitations: [],
  }

  await page.routeWebSocket(/\/hubs\/game-board(?:\?|$)/, (socket) => {
    activity.connections += 1
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) socket.send('{}\u001e')
    })
  })

  await page.route(`${origin}/**`, async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    activity.requests.push(path)
    if (path === '/auth/me') {
      await route.fulfill({
        json: {
          userId,
          displayName: 'Performance player',
          roles: catalog ? ['viewer', 'admin'] : ['viewer'],
        },
      })
    } else if (catalog && path === '/api/game/questions/catalog/page') {
      await route.fulfill({ json: catalogPageFixture(catalog, route.request().url()) })
    } else if (catalog && path === '/api/game/questions/categories') {
      await route.fulfill({
        json: [
          {
            id: 'performance-category',
            name: 'Performance screenshots',
            questionCount: catalog.length,
            isProtected: false,
            isLocationCategory: false,
          },
        ],
      })
    } else if (path === '/performance-image.svg' || path === '/performance-thumbnail.svg') {
      const [width, height] = path === '/performance-image.svg' ? [1920, 1080] : [320, 180]
      await route.fulfill({
        contentType: 'image/svg+xml',
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#526558"/></svg>`,
      })
    } else if (path === '/api/game') {
      await route.fulfill({
        json: {
          gameId: 'a0dbc6cb-40b1-4785-bc52-17f55201c406',
          title: 'Performance game',
          status: 'ready',
          version: 1,
          rows: 1,
          cols: 1,
          cells: [],
          rowLabels: ['A'],
          colLabels: ['1'],
        },
      })
    } else if (path === '/api/game/team-queue') {
      await route.fulfill({
        json: {
          gameId: 'a0dbc6cb-40b1-4785-bc52-17f55201c406',
          teams: [
            {
              teamId: team.teamId,
              teamName: team.name,
              teamSlotIndex: 1,
              isPlayed: false,
              finalScore: null,
              playedAtUtc: null,
              participants: [team.members[0]!.player],
            },
          ],
        },
      })
    } else if (path.endsWith('/negotiate')) {
      await route.fulfill({
        json: {
          negotiateVersion: 1,
          connectionId: 'performance',
          connectionToken: 'performance',
          availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
        },
      })
    } else if (path === '/api/game/registration') {
      await route.fulfill({
        json: {
          gameId: 'a0dbc6cb-40b1-4785-bc52-17f55201c406',
          gameStatus: 'ready',
          minPlayersPerTeam: 1,
          maxPlayersPerTeam: 2,
          teamSlots: [],
          teams: [team],
          myTeam: team,
          myPendingInvitations: [],
          myOutgoingInvitations: [],
          canInvitePlayersToMyTeam: false,
          invitablePlayers: [],
        },
      })
    } else if (path.startsWith('/api/') || path.startsWith('/hubs/')) {
      await route.fulfill({ status: 204 })
    } else {
      if (assetDelayMs && path.endsWith('.js')) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, assetDelayMs))
      }
      const file = resolve(
        dist,
        path === '/' || path.startsWith('/panel/') ? 'index.html' : `.${path}`,
      )
      expect(file.startsWith(`${dist}${sep}`)).toBe(true)
      await route.fulfill({
        body: await readFile(file),
        contentType: contentTypes[extname(file)] ?? 'application/octet-stream',
      })
    }
  })
  return activity
}

test('profiles navigation intent and cached return in the production bundle', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const samples = []
  for (const intent of ['click', 'hover'] as const) {
    for (let iteration = 0; iteration < 5; iteration += 1) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
      const activity = await serveFixture(page, 80)
      await page.goto(`${origin}/panel/game-application`)
      await expect(page.getByRole('button', { name: 'Leave team' })).toBeVisible()
      await expect.poll(() => activity.connections).toBe(1)
      const assetsBefore = activity.requests.filter((path) => path.endsWith('.js'))
      const link = page.locator('a[href="/panel/game-team-queue"]:visible')
      if (intent === 'hover') {
        await link.hover()
        await page.waitForTimeout(200)
      }
      const start = performance.now()
      await link.click()
      await expect(page.getByRole('heading', { name: 'Team queue', exact: true })).toBeVisible()
      await expect(page.getByRole('article', { name: 'Performance team' })).toBeVisible()
      const navigationMs = performance.now() - start
      const returnStart = performance.now()
      await page.locator('a[href="/panel/game-application"]:visible').click()
      await expect(page.getByRole('button', { name: 'Leave team' })).toBeVisible()
      samples.push({
        intent,
        navigationMs,
        returnMs: performance.now() - returnStart,
        assetsBefore,
        assetsAfter: activity.requests.filter((path) => path.endsWith('.js')),
        connections: activity.connections,
        apiRequests: activity.requests.filter((path) => path.startsWith('/api/')).length,
      })
      expect(errors).toEqual([])
      expect(activity.connections).toBe(1)
      await page.close()
    }
  }
  await mkdir('../.tmp/agent-work/performance', { recursive: true })
  const report = { bundle: dist, assetDelayMs: 80, hoverLeadMs: 200, samples }
  await writeFile(
    `../.tmp/agent-work/performance/${outputLabel}-navigation.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  )
  console.log(JSON.stringify(report))
})

test('profiles bounded screenshot catalog pages in the production bundle', async ({ browser }) => {
  const catalog: GameQuestionCatalogItem[] = Array.from({ length: 1000 }, (_, index) => ({
    questionId: `image-${index}`,
    questionCode: `image-${index}`,
    categoryId: 'performance-category',
    categoryName: 'Performance screenshots',
    text: `Screenshot ${String(index).padStart(4, '0')}`,
    reward: 5,
    priority: 0,
    isEnabled: true,
    askedTotalCount: 0,
    submissionTotalCount: 0,
    correctSubmissionTotalCount: 0,
    correctPercentage: 0,
    lastAskedAtUtc: null,
    twitchCompatible: true,
    twitchCompatibilityErrorCode: null,
    options: [
      { optionId: 'correct', text: 'Tower', isCorrect: true, sortOrder: 0 },
      { optionId: 'wrong', text: 'Bridge', isCorrect: false, sortOrder: 1 },
    ],
    image: {
      imageUrl: `${origin}/performance-image.svg?image=${index}`,
      thumbnailUrl: `${origin}/performance-thumbnail.svg?image=${index}`,
      mapNames: {},
      optionNames: {},
    },
  }))
  const samples = []
  await mkdir('../.tmp/agent-work/performance', { recursive: true })
  for (const width of [390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const activity = await serveFixture(page, 0, catalog)
    const session = await page.context().newCDPSession(page)
    await session.send('Performance.enable')
    const before = await performanceMetrics(session)
    const startedAt = performance.now()
    await page.goto(`${origin}/panel/catalog-screenshots`)
    const list = page.getByTestId('question-catalog-list')
    await expect(list.getByText('Page 1 of 25')).toBeVisible()
    await expect(list.locator('img')).toHaveCount(40)
    await expect
      .poll(() =>
        list
          .locator('img')
          .first()
          .evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBe(320)
    const firstPageMs = performance.now() - startedAt
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: `../.tmp/agent-work/performance/${outputLabel}-catalog-${width}.png`,
      animations: 'disabled',
    })
    const nextStartedAt = performance.now()
    await list.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(list.getByText('Page 2 of 25')).toBeVisible()
    await expect(list.getByRole('button', { name: /Screenshot 0040/ })).toBeVisible()
    const after = await performanceMetrics(session)
    samples.push({
      width,
      catalogSize: catalog.length,
      renderedRows: await list.locator('img').count(),
      firstPageMs: Number(firstPageMs.toFixed(3)),
      nextPageMs: Number((performance.now() - nextStartedAt).toFixed(3)),
      catalogRequests: activity.requests.filter(
        (path) => path === '/api/game/questions/catalog/page',
      ).length,
      fullCatalogRequests: activity.requests.filter(
        (path) => path === '/api/game/questions/catalog',
      ).length,
      originalRequests: activity.requests.filter((path) => path === '/performance-image.svg')
        .length,
      thumbnailRequests: activity.requests.filter((path) => path === '/performance-thumbnail.svg')
        .length,
      scriptDurationSeconds: delta(after, before, 'ScriptDuration'),
      layoutDurationSeconds: delta(after, before, 'LayoutDuration'),
      jsHeapUsedBytes: after.JSHeapUsedSize,
    })
    expect(
      activity.requests.filter((path) => path === '/api/game/questions/catalog/page'),
    ).toHaveLength(2)
    expect(activity.requests).not.toContain('/api/game/questions/catalog')
    expect(errors).toEqual([])
    await page.close()
  }
  const report = { bundle: dist, samples }
  await writeFile(
    `../.tmp/agent-work/performance/${outputLabel}-catalog.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  )
  console.log(JSON.stringify(report))
})

async function performanceMetrics(session: CDPSession) {
  const result = await session.send('Performance.getMetrics')
  return Object.fromEntries(result.metrics.map(({ name, value }) => [name, value]))
}

function delta(after: Record<string, number>, before: Record<string, number>, name: string) {
  return Number(((after[name] ?? 0) - (before[name] ?? 0)).toFixed(6))
}

test('profiles repeated modal transitions and page scrolling in the production bundle', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 640 })
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
  await serveFixture(page)
  await page.goto(`${origin}/panel/game-application`)
  await expect(page.getByRole('button', { name: 'Leave team' })).toBeVisible()

  const session = await page.context().newCDPSession(page)
  await session.send('Performance.enable')
  const before = await performanceMetrics(session)
  const traceEvents: Array<{ name?: string; dur?: number }> = []
  session.on('Tracing.dataCollected', ({ value }) => traceEvents.push(...value))
  await session.send('Tracing.start', {
    categories: 'devtools.timeline,blink,cc',
    transferMode: 'ReportEvents',
  })

  const iterations = 10
  const startedAt = performance.now()
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    await page.getByRole('button', { name: 'Leave team' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toHaveCount(0)
    await page.evaluate(async () => {
      window.scrollTo(0, document.documentElement.scrollHeight)
      await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()))
      window.scrollTo(0, 0)
      await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()))
    })
  }
  const wallTimeMs = performance.now() - startedAt

  const tracingComplete = new Promise<void>((resolveComplete) => {
    session.once('Tracing.tracingComplete', () => resolveComplete())
  })
  await session.send('Tracing.end')
  await tracingComplete
  const after = await performanceMetrics(session)

  const traceDurationMs = (name: string) =>
    Number(
      (
        traceEvents
          .filter((event) => event.name === name)
          .reduce((total, event) => total + (event.dur ?? 0), 0) / 1000
      ).toFixed(3),
    )

  const report = {
    bundle: dist,
    viewport: { width: 390, height: 640 },
    iterations,
    wallTimeMs: Number(wallTimeMs.toFixed(3)),
    cdp: {
      scriptDurationSeconds: delta(after, before, 'ScriptDuration'),
      taskDurationSeconds: delta(after, before, 'TaskDuration'),
      layoutDurationSeconds: delta(after, before, 'LayoutDuration'),
      recalcStyleDurationSeconds: delta(after, before, 'RecalcStyleDuration'),
      layoutCount: delta(after, before, 'LayoutCount'),
      recalcStyleCount: delta(after, before, 'RecalcStyleCount'),
      jsHeapDeltaBytes: delta(after, before, 'JSHeapUsedSize'),
    },
    trace: {
      functionCallMs: traceDurationMs('FunctionCall'),
      recalculateStylesMs: traceDurationMs('RecalculateStyles'),
      layoutMs: traceDurationMs('Layout'),
      updateLayerTreeMs: traceDurationMs('UpdateLayerTree'),
      paintMs: traceDurationMs('Paint'),
      compositeLayersMs: traceDurationMs('CompositeLayers'),
    },
  }

  await mkdir('../.tmp/ui-audit', { recursive: true })
  await writeFile(
    `../.tmp/ui-audit/${outputLabel}-performance.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  )
  console.log(JSON.stringify(report))
})
