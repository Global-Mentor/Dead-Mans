import { expect, test, type CDPSession, type Page, type Route } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

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

async function serveFixture(page: Page) {
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
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) socket.send('{}\u001e')
    })
  })

  await page.route(`${origin}/**`, async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/me') {
      await route.fulfill({
        json: { userId, displayName: 'Performance player', roles: ['viewer'] },
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
}

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
