import { expect, test, type CDPSession } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import {
  connectOverlayEvents,
  key,
  settleOverlay,
  snapshot,
  type Snapshot,
} from './support/overlay-fixture'

test.skip(!process.env.MEASURE_OVERLAY_PERF, 'Run explicitly with MEASURE_OVERLAY_PERF=1.')

const origin = 'https://overlay-performance.deadmans.test'
const dist = resolve(process.env.PERF_DIST_DIR ?? 'dist')
const label = process.env.PERF_LABEL ?? 'overlay'
const soakMs = Math.max(15000, Number(process.env.OVERLAY_SOAK_MS ?? 300000))
const contentTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
}

async function metrics(cdp: CDPSession) {
  const result = await cdp.send('Performance.getMetrics')
  return Object.fromEntries(result.metrics.map(({ name, value }) => [name, value]))
}

async function styleRuleCount(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    Array.from(document.styleSheets).reduce((count, sheet) => count + sheet.cssRules.length, 0),
  )
}

test('profiles countdown work and retained resources across scene cycles in production', async ({
  page,
}) => {
  test.setTimeout(soakMs + 120000)
  await page.setViewportSize({ width: 1920, height: 1080 })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const start = Date.now()
  let phase: Snapshot['phase'] = 'in_progress'
  let requests = 0
  const modifiers = Array.from({ length: 30 }, (_, index) => ({
    modifierId: `modifier-${index}`,
    name: `Модификатор ${index + 1}`,
    iconEmoji: '🐢',
    activationCount: 2,
    timers: index < 5 ? [{ id: `timer-${index}`, durationSeconds: 3600 }] : [],
  }))
  await page.route(`${origin}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/overlay/snapshot') {
      requests += 1
      return route.fulfill({
        json: {
          ...snapshot,
          phase,
          board: phase === 'select_card' ? snapshot.board : null,
          gameplay:
            phase === 'in_progress'
              ? {
                  roundId: 'performance-round',
                  gameplayStartedAtUtc: new Date(start).toISOString(),
                  serverNowUtc: new Date().toISOString(),
                  modifiers,
                }
              : null,
          round:
            phase === 'preparing'
              ? {
                  id: 'performance-round',
                  title: 'Карточка',
                  cost: 210,
                  columnLabel: 'Охота',
                  rowLabel: 'Хардкор',
                  imageUrl: '/brand/share-card.png',
                  modifiers: [],
                }
              : null,
        },
      })
    }
    if (path.startsWith('/api/') || path.startsWith('/auth/'))
      throw new Error(`Unexpected overlay request: ${path}`)
    const file = resolve(dist, path === '/overlay' ? 'index.html' : `.${path}`)
    expect(file.startsWith(`${dist}${sep}`)).toBe(true)
    return route.fulfill({
      body: await readFile(file),
      contentType: contentTypes[extname(file)] ?? 'application/octet-stream',
    })
  })
  const notify = await connectOverlayEvents(page)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  await page.goto(`${origin}/overlay?lng=ru#key=${key}`)
  await expect(page.getByRole('timer')).toHaveCount(5)
  await settleOverlay(page)
  await cdp.send('HeapProfiler.collectGarbage')
  const before = await metrics(cdp)
  const beforeDom = await cdp.send('Memory.getDOMCounters')
  const beforeStyleRules = await styleRuleCount(page)
  const frameIntervals = await page.evaluate(async (duration) => {
    const frames: number[] = []
    await new Promise<void>((resolveFrames) => {
      const start = performance.now()
      let previous = start
      const step = (now: number) => {
        frames.push(now - previous)
        previous = now
        if (now - start >= duration) resolveFrames()
        else requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    })
    return frames.sort((a, b) => a - b)
  }, soakMs)
  const after = await metrics(cdp)
  const afterStyleRules = await styleRuleCount(page)
  expect(afterStyleRules).toBe(beforeStyleRules)
  const cycles = []
  for (let cycle = 0; cycle < 20; cycle += 1) {
    for (const nextPhase of ['preparing', 'select_card', 'in_progress'] as const) {
      phase = nextPhase
      const received = requests
      notify()
      await expect.poll(() => requests).toBeGreaterThan(received)
      await expect(
        page.getByTestId(
          nextPhase === 'preparing'
            ? 'overlay-round-layout'
            : nextPhase === 'select_card'
              ? 'overlay-board'
              : 'overlay-gameplay',
        ),
      ).toBeVisible()
      await settleOverlay(page)
    }
    if (cycle % 5 === 4) {
      await cdp.send('HeapProfiler.collectGarbage')
      cycles.push({
        cycle: cycle + 1,
        metrics: await metrics(cdp),
        dom: await cdp.send('Memory.getDOMCounters'),
      })
    }
  }
  const last = cycles.at(-1)!
  expect(last.dom.nodes).toBeLessThan(beforeDom.nodes + 200)
  expect(last.dom.jsEventListeners).toBeLessThanOrEqual(beforeDom.jsEventListeners + 10)
  expect(errors).toEqual([])
  const report = {
    bundle: dist,
    soakMs,
    browser: await page.context().browser()!.version(),
    before,
    after,
    beforeDom,
    styleRules: { before: beforeStyleRules, afterCountdown: afterStyleRules },
    cycles,
    requests,
    frameMs: {
      median: frameIntervals[Math.floor(frameIntervals.length / 2)],
      p95: frameIntervals[Math.floor(frameIntervals.length * 0.95)],
      max: frameIntervals.at(-1),
    },
    workMs: Object.fromEntries(
      ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].map((name) => [
        name,
        ((after[name] ?? 0) - (before[name] ?? 0)) * 1000,
      ]),
    ),
  }
  await mkdir('../.tmp/agent-work/performance', { recursive: true })
  await writeFile(
    `../.tmp/agent-work/performance/${label}.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  )
})
