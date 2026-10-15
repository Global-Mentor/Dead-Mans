import { expect, test, type Page, type Locator } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import type { components } from '../src/shared/api/contracts/generated'

import {
  key,
  catalogGameplay,
  snapshot,
  connectOverlayEvents,
  settleOverlay,
  type Snapshot,
} from './support/overlay-fixture'

async function centeredSceneBounds(page: Page, scene: Locator) {
  const bounds = (await scene.boundingBox())!
  const region = (await page.getByTestId('overlay-scene-region').boundingBox())!
  expect(bounds.x + bounds.width / 2).toBeCloseTo(region.x + region.width / 2, 0)
  expect(bounds.y + bounds.height / 2).toBeCloseTo(region.y + region.height / 2, 0)
  expect(bounds.y).toBeGreaterThanOrEqual(region.y - 1)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(region.y + region.height + 1)
  return bounds
}

async function briefingBounds(page: Page, scene = page.getByTestId('overlay-round-layout')) {
  const bounds = (await scene.boundingBox())!
  const team = (await page.getByTestId('overlay-team').boundingBox())!
  const region = (await page.getByTestId('overlay-scene-region').boundingBox())!
  expect(bounds.y - (team.y + team.height)).toBeCloseTo(12, 0)
  expect(bounds.x + bounds.width / 2).toBeCloseTo(team.x + team.width / 2, 0)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(region.y + region.height + 1)
  return bounds
}

test.beforeEach(async ({ page }) => {
  await page.route('**/hubs/game-overlay/**', (route) => route.fulfill({ status: 503 }))
})

test('summary starts with zero modifier rows, updates a partial total and holds results until presentation ends', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') })
  await page.addInitScript(() => window.localStorage.setItem('i18nextLng', 'ru'))
  const notify = await connectOverlayEvents(page)
  const score: components['schemas']['GameRoundScoreDetailsDto'] = {
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
    calculationLines: [
      { kind: 'kills', activationCount: 0, pointsDelta: 0, runningTotal: 0, operands: [] },
      { kind: 'bounties', activationCount: 0, pointsDelta: 0, runningTotal: 0, operands: [] },
      ...['Хард', 'Жажда', 'Первая пуля'].map((name, index) => ({
        kind: 'modifierPoints' as const,
        modifierId: `modifier-${index}`,
        modifierName: name,
        activationCount: 1,
        pointsDelta: 0,
        runningTotal: 0,
        operands: [],
      })),
    ],
  }
  const summary: NonNullable<Snapshot['summary']> = {
    roundId: 'review-round',
    isFinal: false,
    card: {
      id: 'review-round',
      title: 'Открытая карточка',
      cost: 100,
      imageUrl: '/brand/share-card.png',
      columnLabel: 'Охота',
      rowLabel: '100',
      modifiers: [],
    },
    teamName: 'Охотники болот',
    teamSlotIndex: 1,
    killsCount: 0,
    bountyCount: 0,
    killsScore: 0,
    bountyScore: 0,
    scoreDetails: score,
  }
  let frame: Snapshot = snapshot
  let denied = false
  await page.route('**/api/overlay/snapshot', (route) => {
    if (denied) return route.fulfill({ status: 401 })
    return route.fulfill({ json: frame })
  })
  await page.goto(`/overlay#key=${key}`)
  const centralBounds = []
  const board = page.getByTestId('overlay-board')
  await expect(board).toBeVisible()
  await settleOverlay(page)
  centralBounds.push(await centeredSceneBounds(page, board))
  for (const phase of ['card_opened', 'awaiting_modifiers', 'preparing'] as const) {
    frame = { ...snapshot, phase, board: null, round: summary.card }
    notify()
    const layout = page.getByTestId('overlay-round-layout')
    await expect(layout).toBeVisible()
    await expect(page.getByTestId('overlay-round-phase')).toContainText(
      phase === 'card_opened'
        ? 'Карточка открыта'
        : phase === 'awaiting_modifiers'
          ? 'Выбор модификаторов'
          : 'Подготовка к игре',
    )
    await settleOverlay(page)
    await expect(page.getByTestId('overlay-backdrop')).toHaveCSS('opacity', '0.9')
    centralBounds.push(await briefingBounds(page))
  }
  frame = { ...snapshot, phase: 'reviewing_results', board: null, summary }
  notify()
  const panel = page.getByTestId('overlay-summary')
  const breakdown = panel.getByTestId('round-score-breakdown')
  await expect(panel).toContainText('Подведение итогов')
  await expect(panel.getByTestId('overlay-summary-total').getByRole('status')).toHaveText('0')
  await expect(breakdown).toContainText('Хард')
  await expect(breakdown).toContainText('Жажда')
  await expect(breakdown).toContainText('Первая пуля')
  await expect(panel).not.toContainText('Результат ещё не подтверждён')
  await expect(page.getByTestId('overlay-team')).toBeVisible()
  await settleOverlay(page)
  await expect(page.getByTestId('overlay-backdrop')).toHaveCSS('opacity', '0.9')
  const bounds = await briefingBounds(page, panel)
  const team = (await page.getByTestId('overlay-team').boundingBox())!
  const image = (await panel.getByRole('img').boundingBox())!
  centralBounds.push(bounds)
  for (const scene of centralBounds) {
    expect(scene.x + scene.width / 2).toBeCloseTo(960, 0)
    expect(scene.width).toBeGreaterThanOrEqual(1000)
    expect(scene.width).toBeLessThanOrEqual(1153)
    expect(scene.height).toBeGreaterThanOrEqual(719)
    expect(scene.height).toBeLessThanOrEqual(1000)
  }
  expect(
    Math.max(...centralBounds.map((scene) => scene.height)) -
      Math.min(...centralBounds.map((scene) => scene.height)),
  ).toBeLessThanOrEqual(240)
  expect(bounds.width).toBeCloseTo(1152, 0)
  expect(bounds.height).toBeCloseTo(720, 0)
  expect(image.width).toBeGreaterThan(480)
  expect(team.y).toBeLessThan(image.y)
  expect(team.y).toBeCloseTo(24, 0)
  expect(team.x).toBeCloseTo(bounds.x, 0)
  expect(team.width).toBeCloseTo(bounds.width, 0)
  await expect(page.getByRole('heading', { name: 'Охотники болот' })).toHaveCount(1)
  const cardTitle = panel.getByRole('heading', { name: 'Охота: 100' })
  const cardHeader = cardTitle.locator('..').locator('..')
  const scoreHeader = panel.getByRole('heading', { name: 'Подведение итогов' }).locator('..')
  const cardHeaderBounds = (await cardHeader.boundingBox())!
  const scoreHeaderBounds = (await scoreHeader.boundingBox())!
  const scoreBounds = (await breakdown.boundingBox())!
  expect(Math.abs(cardHeaderBounds.y - scoreHeaderBounds.y)).toBeLessThan(1)
  expect(Math.abs(cardHeaderBounds.height - scoreHeaderBounds.height)).toBeLessThan(1)
  const leftSection = panel
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Охота: 100' }) })
  const rightSection = panel.getByRole('region', { name: 'Подведение итогов' })
  await expect(rightSection).not.toContainText('Охотники болот')
  const leftBounds = (await leftSection.boundingBox())!
  const rightBounds = (await rightSection.boundingBox())!
  expect(leftBounds.y).toBeCloseTo(rightBounds.y, 0)
  expect(leftBounds.height).toBeCloseTo(rightBounds.height, 0)
  expect(leftBounds.width).toBeCloseTo(rightBounds.width, 0)
  await expect(rightSection.getByTestId('round-score-breakdown')).toBeVisible()
  await expect(leftSection.getByRole('img')).toBeVisible()
  expect(team.y + team.height).toBeLessThan(scoreHeaderBounds.y)
  expect(scoreBounds.y - scoreHeaderBounds.y - scoreHeaderBounds.height).toBeLessThan(20)
  const typography = (element: HTMLElement | SVGElement) => {
    const style = getComputedStyle(element)
    return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight]
  }
  expect(await panel.getByText('Стоимость: 100 очк.').evaluate(typography)).toEqual(
    await cardTitle.evaluate(typography),
  )
  expect(Math.abs(bounds.x + bounds.width / 2 - 960)).toBeLessThan(2)
  await mkdir('../.tmp/agent-work/overlay', { recursive: true })
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/summary-zero.png',
    omitBackground: true,
  })
  const updated = {
    ...score,
    killsScore: 300,
    modifierKillDelta: 1,
    modifierKillScore: 100,
    modifierScoreDelta: 45,
    totalKillCount: 4,
    finalScore: 445,
    calculationLines: score.calculationLines!.map((line, index) => ({
      ...line,
      pointsDelta: [300, 0, 0, 45, 100][index]!,
      runningTotal: [300, 300, 300, 345, 445][index]!,
    })),
  }
  frame = {
    ...frame,
    summary: { ...summary, killsCount: 3, killsScore: 300, scoreDetails: updated },
  }
  notify()
  await expect(panel.getByTestId('overlay-summary-total').getByRole('status')).toHaveText('445')
  await expect(panel.getByTestId('overlay-summary-total')).toContainText(
    'Предварительный счёт раунда',
  )
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/summary-live.png',
    omitBackground: true,
  })
  frame = {
    ...frame,
    phase: 'showing_results',
    summary: {
      ...frame.summary!,
      isFinal: true,
    },
  }
  notify()
  await expect(panel).toContainText('Итоги раунда')
  await expect(panel.getByRole('status')).toHaveText('Заработано: 445 очк.')
  await page.reload()
  await expect(panel).toContainText('Итоги раунда')
  await settleOverlay(page)
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/summary-finale.png',
    omitBackground: true,
  })
  await expect(page.getByTestId('overlay-backdrop')).toHaveCSS('opacity', '0.9')
  const finalFooter = panel.getByTestId('overlay-summary-total')
  await expect(finalFooter.getByRole('status')).toHaveText('Заработано: 445 очк.')
  const footerBounds = (await finalFooter.boundingBox())!
  const resultsBounds = (await panel.getByRole('region', { name: 'Итоги раунда' }).boundingBox())!
  expect(
    resultsBounds.y + resultsBounds.height - footerBounds.y - footerBounds.height,
  ).toBeLessThan(20)
  await page.clock.fastForward(60000)
  notify()
  await expect(panel).toContainText('Итоги раунда')
  frame = {
    ...frame,
    summary: { ...frame.summary!, scoreDetails: { ...updated, finalScore: -500 } },
  }
  notify()
  await expect(finalFooter.getByRole('status')).toHaveText('Штраф: 500 очк.')
  await expect(finalFooter.getByRole('heading')).toHaveText('Финальный счёт раунда')
  await expect(finalFooter).not.toContainText('Заработано')
  await settleOverlay(page)
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/summary-penalty.png',
    omitBackground: true,
  })
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport)
    await settleOverlay(page)
    const resized = (await panel.boundingBox())!
    expect(resized.x + resized.width / 2).toBeCloseTo(viewport.width / 2, 0)
    await briefingBounds(page, panel)
    expect(resized.y).toBeGreaterThanOrEqual(23)
    expect(resized.y + resized.height).toBeLessThanOrEqual(viewport.height - 23)
  }
  await page.setViewportSize({ width: 1920, height: 1080 })
  frame = { ...snapshot, team: { ...snapshot.team!, name: 'Следующая команда' } }
  notify()
  await expect(page.getByTestId('overlay-board')).toBeVisible({ timeout: 9000 })
  await expect(panel).toHaveCount(0)
  await expect(page.getByTestId('overlay-team')).toContainText('Следующая команда')
  denied = true
  notify()
  await expect(page.getByTestId('overlay-team')).toHaveCount(0)
})
test('gameplay hides the team and restores server-anchored modifier countdowns', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  const clientStart = Date.UTC(2030, 0, 1)
  const serverStart = Date.UTC(2026, 9, 13, 10)
  const fixtureStartedAt = Date.now()
  let serverAdjustmentMs = 0
  await page.clock.install({ time: new Date(clientStart) })
  await page.addInitScript(() => {
    const intervals = new Set<number>()
    const originalSet = window.setInterval.bind(window)
    const originalClear = window.clearInterval.bind(window)
    window.setInterval = (handler, timeout, ...args) => {
      const id = originalSet(handler, timeout, ...args)
      if (timeout === 1000) intervals.add(id)
      return id
    }
    window.clearInterval = (id) => {
      if (id !== undefined) intervals.delete(id)
      originalClear(id)
    }
    Object.defineProperty(window, '__overlaySecondIntervalCount', { get: () => intervals.size })
  })
  const notify = await connectOverlayEvents(page)
  let phase: Snapshot['phase'] = 'in_progress'
  let denied = false
  await page.route('**/api/overlay/snapshot', async (route) => {
    if (denied) return route.fulfill({ status: 401 })
    return route.fulfill({
      json: {
        ...snapshot,
        phase,
        board: null,
        round:
          phase === 'preparing'
            ? {
                id: 'live-round',
                title: 'Карточка',
                cost: 210,
                imageUrl: '/brand/share-card.png',
                columnLabel: 'Охота',
                rowLabel: 'Хардкор',
                modifiers: [],
              }
            : null,
        gameplay:
          phase === 'in_progress'
            ? {
                roundId: 'live-round',
                gameplayStartedAtUtc: new Date(serverStart).toISOString(),
                serverNowUtc: new Date(
                  serverStart + 30000 + Date.now() - fixtureStartedAt + serverAdjustmentMs,
                ).toISOString(),
                modifiers: [
                  {
                    modifierId: 'turtle',
                    name: 'Черепаха',
                    iconEmoji: '🐢',
                    activationCount: 2,
                    timers: [{ id: 'aggregate', durationSeconds: 120 }],
                  },
                  {
                    modifierId: 'prokaznik',
                    name: 'Проказник',
                    iconEmoji: '🙊',
                    activationCount: 1,
                    timers: [{ id: 'aggregate', durationSeconds: 300 }],
                  },
                  {
                    modifierId: 'corpses',
                    name: 'Трупы',
                    iconEmoji: '🪦',
                    activationCount: 1,
                    timers: [],
                  },
                  {
                    modifierId: 'independent',
                    name: 'Отдельные таймеры',
                    iconEmoji: null,
                    activationCount: 3,
                    timers: [
                      { id: 'one', durationSeconds: 60 },
                      { id: 'two', durationSeconds: 90 },
                      { id: 'three', durationSeconds: 60 },
                    ],
                  },
                ],
              }
            : null,
      },
    })
  })
  await page.goto(`/overlay?lng=ru#key=${key}`)
  const sidebar = page.getByTestId('overlay-gameplay')
  await expect(sidebar.getByRole('listitem')).toHaveCount(4)
  await expect(sidebar.getByRole('heading', { name: 'Черепаха ×2', exact: true })).toBeVisible()
  await expect(sidebar).not.toContainText('Всего:')
  await expect(page.getByTestId('overlay-team')).toBeHidden()
  await expect(sidebar.getByRole('heading', { level: 4 })).toHaveText([
    'Черепаха ×2',
    'Проказник',
    'Отдельные таймеры ×3',
    'Трупы',
  ])
  for (const list of await sidebar.getByRole('list').all()) {
    expect(
      await list.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
    ).toBe((await list.getAttribute('data-modifier-group')) === 'timed' ? 1 : 2)
  }
  await expect(
    sidebar.locator('[aria-hidden="true"]').getByText('🐢', { exact: true }),
  ).toBeVisible()
  const timedTiles = sidebar.getByRole('list').first().getByRole('listitem')
  const heights = await timedTiles.evaluateAll((elements) =>
    elements.map((el) => el.getBoundingClientRect().height),
  )
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1)
  await expect(sidebar.getByRole('timer')).toHaveCount(4)
  const turtle = sidebar.getByRole('timer', { name: 'Оставшееся время: Черепаха', exact: true })
  expect(
    await turtle.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(28)
  const seconds = async () => {
    const [minutes, remainder] = (await turtle.innerText()).split(':').map(Number)
    return minutes! * 60 + remainder!
  }
  expect(await seconds()).toBeGreaterThanOrEqual(85)
  expect(await seconds()).toBeLessThanOrEqual(90)
  await settleOverlay(page)
  const list = (await sidebar.boundingBox())!
  expect(list.y).toBeCloseTo(24, 0)
  expect(list.x + list.width).toBeCloseTo(1896, 0)
  expect(list.y + list.height).toBeLessThanOrEqual(1057)
  await expect(page.getByTestId('overlay-card')).toHaveCount(0)
  await expect(page.getByTestId('overlay-board')).toHaveCount(0)
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, '__overlaySecondIntervalCount')))
    .toBe(1)
  await page.screenshot({ path: '../.tmp/agent-work/overlay/gameplay.png', omitBackground: true })
  const firstTick = await seconds()
  await expect.poll(seconds, { timeout: 3000 }).toBeLessThan(firstTick)
  const before = await seconds()
  serverAdjustmentMs += 60000
  notify()
  await expect.poll(seconds).toBeLessThanOrEqual(before - 59)
  expect(await seconds()).toBeGreaterThanOrEqual(before - 62)
  const beforeReload = await seconds()
  await page.reload()
  await expect(turtle).toBeVisible()
  expect(await seconds()).toBeLessThanOrEqual(beforeReload + 1)
  expect(await seconds()).toBeGreaterThanOrEqual(beforeReload - 3)
  serverAdjustmentMs += 300000
  notify()
  await expect(sidebar.getByRole('timer')).toHaveCount(0)
  await expect(sidebar.getByRole('listitem')).toHaveCount(4)
  await expect(sidebar.locator('[data-modifier-group=untimed]').getByRole('listitem')).toHaveCount(
    4,
  )
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, '__overlaySecondIntervalCount')))
    .toBe(0)
  phase = 'preparing'
  notify()
  await expect(page.getByTestId('overlay-round-phase')).toHaveText('Этап раунда:Подготовка к игре')
  await expect(sidebar).toHaveCount(0)
  await expect(page.getByTestId('overlay-team')).toBeVisible()
  denied = true
  notify()
  await expect(page.getByTestId('overlay-team')).toHaveCount(0)
})

test('gameplay HUD keeps a full catalog readable in less than a tenth of Full HD', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  const notify = await connectOverlayEvents(page)
  const gameplay = structuredClone(catalogGameplay)
  await page.route('**/api/overlay/snapshot', (route) =>
    route.fulfill({
      json: { ...snapshot, phase: 'in_progress', board: null, gameplay },
    }),
  )
  await page.goto(`/overlay?lng=ru#key=${key}`)
  const hud = page.getByTestId('overlay-gameplay')
  await expect(hud.getByRole('listitem')).toHaveCount(15)
  await settleOverlay(page)
  const bounds = (await hud.boundingBox())!
  expect((bounds.width * bounds.height) / (1920 * 1080)).toBeLessThan(0.1)
  await expect(hud.getByRole('heading', { name: 'Черепаха ×2', exact: true })).toBeVisible()
  for (const heading of await hud.getByRole('heading').all()) {
    expect(await heading.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    expect(
      await heading.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(14)
  }
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/gameplay-catalog.png',
    omitBackground: true,
  })
  await hud.screenshot({
    path: '../.tmp/agent-work/overlay/gameplay-hud.png',
    omitBackground: true,
  })
  gameplay.serverNowUtc = '2026-10-13T10:10:00Z'
  notify()
  await expect(hud.getByRole('timer')).toHaveCount(0)
  await expect(hud.locator('[data-expired="true"]')).toHaveCount(4)
  expect(
    await hud
      .locator('[data-expired="true"]')
      .evaluateAll((items) => items.map((item) => getComputedStyle(item).opacity)),
  ).toEqual(['1', '1', '1', '1'])
  await settleOverlay(page)
  await expect(hud.getByRole('listitem')).toHaveCount(15)
  expect((await hud.boundingBox())!.height).toBeLessThan(bounds.height)
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/gameplay-expired.png',
    omitBackground: true,
  })
  gameplay.modifiers = []
  notify()
  await expect(hud.getByRole('listitem')).toHaveCount(0)
  await expect(hud).toHaveText('')
  await expect(page.getByTestId('overlay-team')).toBeHidden()
})

for (const count of [17, 30]) {
  test(`${count} gameplay modifiers fit in a narrow HUD without pages`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/overlay/snapshot', (route) =>
      route.fulfill({
        json: {
          ...snapshot,
          phase: 'in_progress',
          board: null,
          round: null,
          gameplay: {
            roundId: 'dense-live-round',
            gameplayStartedAtUtc: '2026-10-13T10:00:00Z',
            serverNowUtc: '2026-10-13T10:00:30Z',
            modifiers: Array.from({ length: count }, (_, index) => ({
              modifierId: `modifier-${index}`,
              name: `Модификатор ${index + 1} с длинным названием`,
              iconEmoji: ['🐢', '🙊', '🎆', '⚔️'][index % 4],
              activationCount: 1,
              timers:
                count === 17 && index % 4 === 0
                  ? [{ id: `timer-${index}`, durationSeconds: 300 }]
                  : [],
            })),
          },
        },
      }),
    )
    await page.goto(`/overlay?lng=ru#key=${key}`)
    const sidebar = page.getByTestId('overlay-gameplay')
    const items = sidebar.getByRole('listitem')
    await expect(items).toHaveCount(count)
    await expect(sidebar.getByRole('timer')).toHaveCount(count === 17 ? 5 : 0)
    await expect(sidebar).not.toContainText('Всего:')
    for (const list of await sidebar.getByRole('list').all()) {
      expect(
        await list.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
      ).toBe((await list.getAttribute('data-modifier-group')) === 'timed' ? 1 : 2)
      const heights = await list
        .getByRole('listitem')
        .evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().height))
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1)
    }
    await settleOverlay(page)
    await expect(page.getByTestId('overlay-team')).toBeHidden()
    expect((await sidebar.boundingBox())!.y).toBeCloseTo(24, 0)
    expect((await sidebar.boundingBox())!.width).toBeLessThanOrEqual(360)
    expect((await sidebar.boundingBox())!.height).toBeLessThanOrEqual(count === 17 ? 720 : 960)
    for (const item of await items.all()) {
      const bounds = (await item.boundingBox())!
      expect(bounds.y).toBeGreaterThanOrEqual(24)
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(1057)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(1897)
    }
    await page.screenshot({
      path: `../.tmp/agent-work/overlay/gameplay-compact-${count}.png`,
      omitBackground: true,
    })
  })
}

test('modifier events update the card immediately, coalesce bursts and preserve idle DOM', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  const notify = await connectOverlayEvents(page)
  let frame: Snapshot = {
    ...snapshot,
    phase: 'awaiting_modifiers',
    board: null,
    round: {
      id: 'round-1',
      columnLabel: 'Оружие',
      rowLabel: 'Хардкор',
      title: 'Последний выстрел',
      cost: 300,
      imageUrl: '/brand/share-card.png',
      modifiers: [],
    },
  }
  let requests = 0
  await page.route('**/api/overlay/snapshot', (route) => {
    requests += 1
    return route.fulfill({ json: frame })
  })
  await page.goto(`/overlay?lng=ru#key=${key}`)
  await expect(page.getByTestId('overlay-card')).toBeVisible()
  await expect(page.getByTestId('overlay-modifiers-header')).toHaveText(
    'Активные модификаторыВсего: 0',
  )
  await page.waitForTimeout(700)
  const initialRequests = requests
  frame = {
    ...frame,
    round: {
      ...frame.round!,
      modifiers: [
        {
          id: 'activation-1',
          modifierId: 'modifier-1',
          name: 'Без права на ошибку',
          iconEmoji: '🎯',
        },
        {
          id: 'activation-2',
          modifierId: 'modifier-2',
          name: 'Ночная охота',
          iconEmoji: '🌙',
        },
      ],
    },
  }
  const started = Date.now()
  for (let i = 0; i < 50; i += 1) notify()
  await expect(page.getByText('Без права на ошибку')).toBeVisible({ timeout: 1500 })
  expect(Date.now() - started).toBeLessThan(1500)
  await page.waitForTimeout(500)
  expect(requests - initialRequests).toBe(1)
  const image = page.getByTestId('overlay-card').getByRole('img')
  await expect(image).toBeVisible()
  await settleOverlay(page)
  const imageSize = await image.evaluate((el: HTMLImageElement) => ({
    width: el.getBoundingClientRect().width,
    height: el.getBoundingClientRect().height,
    naturalRatio: el.naturalWidth / el.naturalHeight,
    frameHeight: el.parentElement!.parentElement!.getBoundingClientRect().height,
  }))
  expect(imageSize.width / imageSize.height).toBeCloseTo(imageSize.naturalRatio, 2)
  expect(imageSize.frameHeight - imageSize.height).toBeLessThanOrEqual(27)
  const card = await page.getByTestId('overlay-card').boundingBox()
  const modifiers = await page.getByTestId('overlay-modifiers').boundingBox()
  expect(modifiers!.x + modifiers!.width).toBeLessThan(card!.x)
  expect(card!.x + card!.width).toBeLessThanOrEqual(1920)
  expect(card!.y + card!.height).toBeLessThanOrEqual(1080)
  const description = (await page.getByTestId('overlay-card-description').boundingBox())!
  const modifierHeader = (await page.getByTestId('overlay-modifiers-header').boundingBox())!
  expect(modifierHeader.height).toBeCloseTo(description.height, 0)
  expect(modifierHeader.y).toBeCloseTo(description.y, 0)
  await expect(page.getByTestId('overlay-card-description')).toHaveText(
    'Оружие: ХардкорСтоимость: 300 очк.',
  )
  const group = await briefingBounds(page)
  expect(group.x + group.width / 2).toBeCloseTo(960, 0)
  const teamBounds = (await page.getByTestId('overlay-team').boundingBox())!
  expect(teamBounds.x + teamBounds.width / 2).toBeCloseTo(960, 0)
  expect(teamBounds.y).toBeCloseTo(24, 0)
  await page.screenshot({ path: '../.tmp/agent-work/overlay/modifiers.png', omitBackground: true })
  await page.evaluate(() => {
    const element = document.querySelector('[data-testid="obs-overlay"]')!
    element.setAttribute('data-mutations', '0')
    new MutationObserver((records) => {
      element.setAttribute(
        'data-mutations',
        String(Number(element.getAttribute('data-mutations')) + records.length),
      )
    }).observe(element, { childList: true, subtree: true, characterData: true })
  })
  const settled = requests
  await page.waitForTimeout(3000)
  expect(requests).toBe(settled)
  notify()
  await expect.poll(() => requests).toBe(settled + 1)
  await page.waitForTimeout(300)
  await expect(page.getByTestId('obs-overlay')).toHaveAttribute('data-mutations', '0')
  const beforeReconnect = requests
  notify({ type: 7 })
  await expect.poll(() => requests, { timeout: 5000 }).toBeGreaterThan(beforeReconnect)
  frame = { ...frame, round: { ...frame.round!, modifiers: frame.round!.modifiers.slice(1) } }
  notify()
  await expect(page.getByText('Без права на ошибку')).toHaveCount(0, { timeout: 1500 })
  const layout = page.getByTestId('overlay-round-layout')
  await layout.evaluate((element) => element.setAttribute('data-preparation-probe', 'retained'))
  const beforePreparation = (await layout.boundingBox())!
  frame = { ...frame, phase: 'preparing' }
  notify()
  await expect(page.getByTestId('overlay-round-phase')).toHaveText('Этап раунда:Подготовка к игре')
  await expect(layout).toHaveAttribute('data-preparation-probe', 'retained')
  await expect(page.getByTestId('overlay-card').getByRole('img')).toBeVisible()
  await expect(page.getByTestId('overlay-modifiers').getByRole('listitem')).toHaveCount(1)
  await expect(page.getByText('Ночная охота', { exact: true })).toBeVisible()
  await settleOverlay(page)
  const preparing = (await layout.boundingBox())!
  expect(preparing.x).toBeCloseTo(beforePreparation.x, 0)
  expect(preparing.y).toBeCloseTo(beforePreparation.y, 0)
  expect(preparing.width).toBeCloseTo(beforePreparation.width, 0)
  expect(preparing.height).toBeCloseTo(beforePreparation.height, 0)
  await page.screenshot({ path: '../.tmp/agent-work/overlay/preparing.png', omitBackground: true })
  frame = { ...frame, phase: 'in_progress', round: null }
  notify()
  await expect(page.getByTestId('overlay-card')).toHaveCount(0, { timeout: 1500 })
  await expect(page.getByTestId('overlay-modifiers')).toHaveCount(0)
  await expect(page.getByTestId('overlay-team')).toBeHidden()
  await expect(page.getByTestId('overlay-backdrop')).toHaveCSS('opacity', '0')
})

test('opened portrait card fits its frame without vertical letterboxing', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.route('**/media/overlay-portrait.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="570" height="642"><rect width="570" height="642" fill="#282827"/><rect x="24" y="24" width="522" height="594" fill="#626052"/></svg>',
    }),
  )
  await page.route('**/api/overlay/snapshot', (route) =>
    route.fulfill({
      json: {
        ...snapshot,
        phase: 'card_opened',
        board: null,
        round: {
          id: 'portrait-round',
          columnLabel: 'Аватар',
          rowLabel: 'Хардкор',
          title: 'Аватар: Хардкор',
          cost: 210,
          imageUrl: '/media/overlay-portrait.svg',
          modifiers: [],
        },
      },
    }),
  )
  await page.goto(`/overlay?lng=ru#key=${key}`)
  const image = page.getByTestId('overlay-card').getByRole('img')
  const phase = page.getByTestId('overlay-round-phase')
  await expect(phase).toHaveText('Этап раунда:Карточка открыта')
  await expect(image).toBeVisible()
  await settleOverlay(page)
  const phaseBounds = (await phase.boundingBox())!
  const description = (await page.getByTestId('overlay-card-description').boundingBox())!
  expect(phaseBounds.y + phaseBounds.height).toBeLessThan(description.y)
  expect(phaseBounds.x + phaseBounds.width / 2).toBeCloseTo(960, 0)
  const size = await image.evaluate((el: HTMLImageElement) => ({
    width: el.getBoundingClientRect().width,
    height: el.getBoundingClientRect().height,
    frameHeight: el.parentElement!.parentElement!.getBoundingClientRect().height,
  }))
  expect(size.width / size.height).toBeCloseTo(570 / 642, 2)
  expect(size.frameHeight - size.height).toBeLessThanOrEqual(27)
  const card = (await page.getByTestId('overlay-card').boundingBox())!
  expect(card.y + card.height).toBeLessThanOrEqual(1080)
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/portrait-card.png',
    omitBackground: true,
  })
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport)
    await settleOverlay(page)
    await briefingBounds(page)
    const fittedImage = (await image.boundingBox())!
    expect(fittedImage.y + fittedImage.height).toBeLessThanOrEqual(viewport.height - 23)
  }
})

test('all modifier groups reflow to two columns without paging and missing images have a fallback', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.route('**/missing-card.png', (route) => route.fulfill({ status: 404 }))
  await page.route('**/api/overlay/snapshot', (route) =>
    route.fulfill({
      json: {
        ...snapshot,
        phase: 'card_opened',
        board: null,
        round: {
          id: 'round-2',
          columnLabel: 'Колонка с длинным названием для проверки размеров',
          rowLabel: 'Строка с длинным названием',
          cost: 300,
          title: 'Карточка с длинным названием для проверки размеров',
          imageUrl: '/missing-card.png',
          modifiers: Array.from({ length: 18 }, (_, index) => ({
            id: String(index),
            modifierId: `modifier-${index}`,
            name: `Модификатор ${index + 1} с очень длинным названием`,
            iconEmoji: null,
          })),
        },
      },
    }),
  )
  await page.goto(`/overlay?lng=ru#key=${key}`)
  await expect(page.getByText('Изображение недоступно')).toBeVisible()
  const items = page.getByTestId('overlay-modifiers').getByRole('listitem')
  await expect(items).toHaveCount(18)
  await settleOverlay(page)
  await expect
    .poll(async () =>
      page
        .getByTestId('overlay-modifiers')
        .getByRole('list')
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
    )
    .toBe(2)
  await expect(page.getByText('Модификатор 18 с очень длинным названием')).toBeVisible()
  const list = await page.getByTestId('overlay-modifiers').boundingBox()
  expect(list!.y + list!.height).toBeLessThanOrEqual(1080)
  const last = await page.getByText('Модификатор 18 с очень длинным названием').boundingBox()
  expect(last!.y + last!.height).toBeLessThanOrEqual(1080)
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/modifiers-long.png',
    omitBackground: true,
  })
  await page.waitForTimeout(6500)
  await expect(items).toHaveCount(18)
  await expect(
    page.getByText('Модификатор 1 с очень длинным названием', { exact: true }),
  ).toBeVisible()
})

test('repeated activations share an identity group, omit activators and update on cancellation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  const notify = await connectOverlayEvents(page)
  const makeActivation = (id: string, modifierId: string) => ({
    id,
    modifierId,
    name: 'Прокачник',
    iconEmoji: '🎯',
  })
  let frame: Snapshot = {
    ...snapshot,
    phase: 'card_opened',
    board: null,
    round: {
      id: 'stack-round',
      columnLabel: 'Охота',
      rowLabel: 'Хардкор',
      title: 'Карточка',
      cost: 210,
      imageUrl: '/brand/share-card.png',
      modifiers: [
        makeActivation('a1', 'm1'),
        makeActivation('a2', 'm1'),
        makeActivation('a3', 'm1'),
        makeActivation('a4', 'm2'),
      ],
    },
  }
  await page.route('**/api/overlay/snapshot', (route) => route.fulfill({ json: frame }))
  await page.goto(`/overlay?lng=ru#key=${key}`)
  const modifiers = page.getByTestId('overlay-modifiers')
  const phase = page.getByTestId('overlay-round-phase')
  await expect(phase).toHaveText('Этап раунда:Карточка открыта')
  await phase.evaluate((element) => element.setAttribute('data-phase-probe', 'retained'))
  frame = { ...frame, phase: 'awaiting_modifiers' }
  notify()
  await expect(phase).toHaveText('Этап раунда:Выбор модификаторов')
  await expect(phase).toHaveAttribute('data-phase-probe', 'retained')
  await expect(modifiers.getByRole('listitem')).toHaveCount(2)
  await expect(modifiers.getByRole('heading', { name: 'Прокачник', exact: true })).toHaveCount(2)
  await expect(modifiers.getByLabel('Прокачник ×3')).toHaveText('×3')
  await expect(modifiers.getByText(/Player One|Player Two|Player Three/)).toHaveCount(0)
  await settleOverlay(page)
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/stacked-modifiers.png',
    omitBackground: true,
  })
  frame = {
    ...frame,
    round: { ...frame.round!, modifiers: frame.round!.modifiers.filter((m) => m.id !== 'a2') },
  }
  notify()
  await expect(modifiers.getByLabel('Прокачник ×2')).toHaveText('×2')
  await expect(modifiers.getByText(/Player One|Player Two|Player Three/)).toHaveCount(0)
  frame = {
    ...frame,
    round: { ...frame.round!, modifiers: frame.round!.modifiers.filter((m) => m.id !== 'a3') },
  }
  notify()
  await expect(modifiers.getByLabel('Прокачник ×2')).toHaveCount(0)
  await expect(modifiers.getByRole('listitem')).toHaveCount(2)
})

for (const count of [3, 7, 45]) {
  test(`${count} distinct groups remain visible together in the Full HD frame`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/overlay/snapshot', (route) =>
      route.fulfill({
        json: {
          ...snapshot,
          phase: 'awaiting_modifiers',
          board: null,
          round: {
            id: 'dense-round',
            columnLabel: 'Охота',
            rowLabel: 'Хардкор',
            title: 'Карточка',
            cost: 210,
            imageUrl: '/brand/share-card.png',
            modifiers: Array.from({ length: count }, (_, index) => ({
              id: `a-${index}`,
              modifierId: `m-${index}`,
              name: `Модификатор ${index + 1}`,
              iconEmoji: null,
            })),
          },
        },
      }),
    )
    await page.goto(`/overlay?lng=ru#key=${key}`)
    const section = page.getByTestId('overlay-modifiers')
    await expect(section.getByRole('listitem')).toHaveCount(count)
    const total = page
      .getByTestId('overlay-modifiers-header')
      .getByText(`Всего: ${count}`, { exact: true })
    await expect(total).toBeVisible()
    await expect(total).toHaveCSS('border-top-width', '0px')
    await expect(page.getByTestId('overlay-card').getByRole('img')).toBeVisible()
    await settleOverlay(page)
    const columnCount = await section
      .getByRole('list')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    expect(columnCount).toBe(count === 3 ? 1 : 2)
    if (count === 7) {
      const list = (await section.getByRole('list').boundingBox())!
      const image = (await page.getByTestId('overlay-card-image').boundingBox())!
      expect(list.height).toBeLessThanOrEqual(image.height)
      expect(Math.abs(list.y - image.y)).toBeLessThanOrEqual(1)
    }
    for (const item of await section.getByRole('listitem').all()) {
      const box = (await item.boundingBox())!
      expect(box.y).toBeGreaterThanOrEqual(23)
      expect(box.y + box.height).toBeLessThanOrEqual(1057)
    }
    await page.screenshot({
      path: `../.tmp/agent-work/overlay/modifiers-${count}.png`,
      omitBackground: true,
    })
  })
}

test('an event replaces a stale initial request without waiting for its response', async ({
  page,
}) => {
  const notify = await connectOverlayEvents(page)
  let requests = 0
  let release: (() => void) | undefined
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/overlay/snapshot', async (route) => {
    requests += 1
    if (requests === 1) {
      await held
      await route.fulfill({ json: snapshot }).catch(() => {})
      return
    }
    await route.fulfill({
      json: {
        ...snapshot,
        phase: 'awaiting_modifiers',
        board: null,
        round: {
          id: 'fresh',
          title: 'Свежая карточка',
          columnLabel: 'Свежая карточка',
          rowLabel: 'Разминка',
          cost: 100,
          imageUrl: null,
          modifiers: [],
        },
      },
    })
  })
  try {
    await page.goto(`/overlay?lng=ru#key=${key}`)
    await expect.poll(() => requests).toBeGreaterThan(0)
    notify()
    await expect(page.getByText('Свежая карточка: Разминка')).toBeVisible({ timeout: 1500 })
    release?.()
    await page.waitForTimeout(200)
    await expect(page.getByTestId('overlay-board')).toHaveCount(0)
    await expect(page.getByText('Свежая карточка: Разминка')).toBeVisible()
  } finally {
    release?.()
  }
})

test('OBS frame is anonymous, transparent and follows server phases', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  let frame: Snapshot = { gameId: null, phase: 'idle', team: null, board: null, round: null }
  const authRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/auth/')) authRequests.push(request.url())
  })
  await page.route('**/api/overlay/snapshot', (route) => {
    expect(route.request().headers()['x-overlay-key']).toBe(key)
    expect(route.request().url()).not.toContain(key)
    return route.fulfill({ json: frame })
  })
  await page.goto(`/overlay?lng=ru#key=${key}`)
  await expect(page.getByTestId('obs-overlay')).toBeVisible()
  await expect(page.getByTestId('overlay-team')).toHaveCount(0)
  frame = snapshot
  await expect(page.getByText('Охотники болот')).toBeVisible()
  await expect(page.getByTestId('overlay-board')).toBeVisible()
  await settleOverlay(page)
  await expect(page.getByRole('button')).toHaveCount(0)
  const backdrop = page.getByTestId('overlay-backdrop')
  await expect(backdrop).toHaveCSS('opacity', '0.9')
  await expect(backdrop).toHaveCSS('filter', 'none')
  await expect(backdrop).toHaveCSS('backdrop-filter', 'none')
  await expect(backdrop).toHaveCSS('pointer-events', 'none')
  expect(await backdrop.boundingBox()).toEqual({ x: 0, y: 0, width: 1920, height: 1080 })
  expect(authRequests).toEqual([])
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgba(0, 0, 0, 0)',
  )
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toBe('none')
  const board = await page.getByTestId('overlay-board').boundingBox()
  expect(board).not.toBeNull()
  expect(board!.y + board!.height).toBeLessThanOrEqual(1080)
  await page.evaluate(() => document.fonts.ready)
  await mkdir('../.tmp/agent-work/overlay', { recursive: true })
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/select-card.png',
    omitBackground: true,
  })
  const team = page.getByTestId('overlay-team')
  const selectedTeam = (await team.boundingBox())!
  expect(Math.abs(selectedTeam.width - board!.width)).toBeLessThan(1)
  await team.evaluate((element) => element.setAttribute('data-phase-probe', 'retained'))
  let briefingTeamHeight: number | undefined
  for (const phase of [
    'card_opened',
    'awaiting_modifiers',
    'preparing',
    'in_progress',
    'reviewing_results',
  ] as const) {
    const refresh = page.waitForResponse(
      async (response) =>
        new URL(response.url()).pathname === '/api/overlay/snapshot' &&
        (await response.json()).phase === phase,
    )
    frame = { ...snapshot, phase, board: null }
    await refresh
    await expect(page.getByTestId('overlay-board')).toHaveCount(0)
    await expect(team).toHaveAttribute('data-phase-probe', 'retained')
    if (phase === 'in_progress') {
      await expect(team).toBeHidden()
      continue
    }
    await expect(team).toBeVisible()
    await settleOverlay(page)
    const bounds = (await team.boundingBox())!
    expect(bounds.x).toBeCloseTo((1920 - 1152) / 2, 0)
    expect(bounds.y).toBeCloseTo(selectedTeam.y, 0)
    expect(bounds.width).toBeCloseTo(1152, 0)
    await expect(team).toContainText('Активная команда')
    briefingTeamHeight ??= bounds.height
    expect(bounds.height).toBeCloseTo(briefingTeamHeight, 0)
  }
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/card-opened.png',
    omitBackground: true,
  })
  await page.reload()
  await expect(page.getByTestId('overlay-team')).toBeVisible()
  await expect(page.getByTestId('overlay-board')).toHaveCount(0)
  frame = { gameId: null, phase: 'idle', team: null, board: null, round: null }
  await expect(page.getByTestId('overlay-team')).toHaveCount(0)
})

test('revocation clears the frame and stops polling', async ({ page }) => {
  let denied = false
  let requests = 0
  await page.route('**/api/overlay/snapshot', (route) => {
    requests += 1
    return route.fulfill(denied ? { status: 401 } : { json: snapshot })
  })
  await page.goto(`/overlay#key=${key}`)
  await expect(page.getByTestId('overlay-team')).toBeVisible()
  denied = true
  await expect(page.getByTestId('overlay-team')).toHaveCount(0)
  await expect(page.getByTestId('overlay-backdrop')).toHaveCount(0)
  const count = requests
  await page.waitForTimeout(2500)
  expect(requests).toBe(count)
})

test('outage retains briefly, expires and recovers without reloading', async ({ page }) => {
  test.setTimeout(60000)
  let offline = false
  await page.route('**/api/overlay/snapshot', (route) =>
    route.fulfill(offline ? { status: 503 } : { json: snapshot }),
  )
  await page.goto(`/overlay#key=${key}`)
  await expect(page.getByTestId('overlay-team')).toBeVisible()
  offline = true
  await page.waitForTimeout(3000)
  await expect(page.getByTestId('overlay-team')).toBeVisible()
  await expect(page.getByTestId('overlay-team')).toHaveCount(0, { timeout: 20000 })
  offline = false
  await expect(page.getByTestId('overlay-team')).toBeVisible({ timeout: 35000 })
})

test('missing key stays transparent without requesting game data', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url())
  })
  await page.goto('/overlay')
  await expect(page.getByTestId('obs-overlay')).toBeVisible()
  await expect(page.getByTestId('overlay-team')).toHaveCount(0)
  expect(requests).toEqual([])
})

for (const width of [390, 768, 1440]) {
  test(`overlay link management at ${width}px`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.setViewportSize({ width, height: 1000 })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
    let issued = 0
    let revoked = false
    let testEnabled = false
    await page.route(
      (url) => url.pathname === '/auth/me' || url.pathname.startsWith('/api/'),
      (route) => {
        const path = new URL(route.request().url()).pathname
        if (path === '/auth/me')
          return route.fulfill({
            json: {
              userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
              displayName: 'Owner',
              roles: ['admin', 'viewer'],
            },
          })
        if (path === '/api/overlay/test') {
          if (route.request().method() === 'PUT')
            testEnabled = route.request().postDataJSON().enabled
          return route.fulfill({ json: { hasKey: issued > 0 && !revoked, enabled: testEnabled } })
        }
        if (path === '/api/overlay/key') {
          testEnabled = false
          expect(route.request().headers()['x-dead-mans-api-client']).toBe('1')
          if (route.request().method() === 'DELETE') {
            revoked = true
            return route.fulfill({ status: 204 })
          }
          issued += 1
          return route.fulfill({ json: { key: (issued === 1 ? 'a' : 'b').repeat(64) } })
        }
        return route.fulfill({ status: 204 })
      },
    )
    await page.goto('/panel/game-overlay')
    await expect(page.getByRole('heading', { name: 'Оверлей OBS' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Запустить тест' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Копировать ссылку' })).toBeDisabled()
    await mkdir('../.tmp/agent-work/overlay', { recursive: true })
    await page.screenshot({
      path: `../.tmp/agent-work/overlay/settings-empty-${width}.png`,
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Создать ссылку' }).click()
    const link = page.getByLabel('Секретная ссылка OBS')
    await expect(link).toHaveValue(`http://localhost:5180/overlay?lng=ru#key=${'a'.repeat(64)}`)
    await page.getByRole('button', { name: 'Копировать ссылку' }).click()
    await expect(page.getByRole('button', { name: 'Скопировано', exact: true })).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await link.inputValue())
    await page.getByRole('button', { name: 'Новая ссылка' }).click()
    await expect(link).toHaveValue(`http://localhost:5180/overlay?lng=ru#key=${'b'.repeat(64)}`)
    expect(issued).toBe(2)
    await page.getByRole('button', { name: 'Запустить тест' }).click()
    await expect(page.getByRole('button', { name: 'Завершить тест' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(
      'rgba(0, 0, 0, 0)',
    )
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({
      path: `../.tmp/agent-work/overlay/settings-${width}.png`,
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Завершить тест' }).click()
    await expect(page.getByRole('button', { name: 'Запустить тест' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await page.getByRole('button', { name: 'Отозвать ссылку' }).click()
    await expect(page.getByText('Ссылка отозвана.')).toBeVisible()
    await expect(link).toHaveCount(0)
    expect(revoked).toBe(true)
  })
}

test('largest supported board stays within the Full HD frame', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  const board = {
    rowLabels: Array.from({ length: 20 }, (_, index) => `${index + 1}00`),
    colLabels: Array.from({ length: 12 }, () => 'Очень длинная категория'),
    cells: Array.from({ length: 240 }, (_, index) => ({
      imageUrl: null,
      result: null,
      row: Math.floor(index / 12),
      col: index % 12,
      cost: 100,
      state: 'closed',
      title: null,
    })),
  }
  await page.route('**/api/overlay/snapshot', (route) =>
    route.fulfill({ json: { ...snapshot, board } }),
  )
  await page.goto(`/overlay?lng=ru#key=${key}`)
  await expect(page.getByTestId('overlay-board')).toBeVisible()
  await settleOverlay(page)
  const box = await page.getByTestId('overlay-board').boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(23)
  expect(box!.y + box!.height).toBeLessThanOrEqual(1057)
  expect(box!.x + box!.width / 2).toBeCloseTo(960, 0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(1920)
  const strip = (await page.getByTestId('overlay-team').boundingBox())!
  expect(Math.abs(strip.width - box!.width)).toBeLessThan(1)
  expect(Math.abs(strip.x - box!.x)).toBeLessThan(1)
  await expect(page.locator('[data-state="closed"]')).toHaveCount(240)
})

test('board has a backdrop, readable row names and live revealed-card results', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  const notify = await connectOverlayEvents(page)
  const board: NonNullable<Snapshot['board']> = {
    rowLabels: ['Разминка', 'Риск', 'Тактика', 'Хардкор', 'Финал'],
    colLabels: ['Бомбардир', 'Пиромант', 'Токсик', 'Вампир', 'Аватар', 'Всё могу x2'],
    cells: Array.from({ length: 30 }, (_, index) => ({
      row: Math.floor(index / 6),
      col: index % 6,
      cost: 110 + Math.floor(index / 6) * 30,
      state: index === 0 ? 'open' : index === 1 ? 'cancelled' : 'closed',
      title: index < 2 ? 'Открытая карточка' : null,
      imageUrl: index < 2 ? '/brand/share-card.png' : null,
      result:
        index === 0
          ? { teamName: 'Северный ветер', teamSlotIndex: 1, finalScore: 330, penaltyTotal: 0 }
          : null,
    })),
  }
  await page.route('**/api/overlay/snapshot', (route) =>
    route.fulfill({ json: { ...snapshot, board } }),
  )
  await page.goto(`/overlay?lng=ru#key=${key}`)
  const field = page.getByTestId('overlay-board')
  await expect(field).toBeVisible()
  await expect(field.getByTestId('played-cell-result-points')).toContainText('330')
  await expect(field.getByTestId('played-cell-team')).toHaveText('Северный ветер')
  await expect(field.locator('[data-state="cancelled"]')).toContainText(
    'Отменена: техническая причина',
  )
  await expect(field.locator('[data-state="closed"]').first()).not.toContainText('Закрыта')
  expect(await field.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
    'rgba(0, 0, 0, 0)',
  )
  expect(await field.evaluate((el) => getComputedStyle(el, '::before').maskImage)).toBe('none')
  expect(await field.evaluate((el) => getComputedStyle(el).filter)).toBe('none')
  expect(await field.evaluate((el) => getComputedStyle(el, '::after').backgroundImage)).not.toBe(
    'none',
  )
  const row = field.locator('[data-board-row-label]').first()
  expect((await row.boundingBox())!.width).toBeGreaterThanOrEqual(72)
  expect(await row.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Alegreya')
  await page.evaluate(() => document.fonts.ready)
  await settleOverlay(page)
  const bounds = await centeredSceneBounds(page, field)
  expect(bounds.x + bounds.width / 2).toBeCloseTo(960, 0)
  const boardRegion = (await page.getByTestId('overlay-scene-region').boundingBox())!
  expect(bounds.height).toBeCloseTo(boardRegion.height, 0)
  const team = page.getByTestId('overlay-team')
  const teamBounds = (await team.boundingBox())!
  expect(Math.abs(teamBounds.width - bounds.width)).toBeLessThan(1)
  expect(Math.abs(teamBounds.x - bounds.x)).toBeLessThan(1)
  expect(teamBounds.y + teamBounds.height + 10).toBeLessThanOrEqual(bounds.y)
  expect(teamBounds.x + teamBounds.width / 2).toBeCloseTo(960, 0)
  expect(teamBounds.y).toBeCloseTo(24, 0)
  const heading = (await team.getByRole('heading', { name: 'Активная команда' }).boundingBox())!
  const name = (await team.getByRole('heading', { name: snapshot.team!.name }).boundingBox())!
  expect(heading.y + heading.height).toBeLessThan(name.y)
  const players = await team.getByRole('listitem').all()
  expect(players).toHaveLength(3)
  let previousRight = name.x + name.width
  for (const player of players) {
    const bounds = (await player.boundingBox())!
    expect(bounds.x).toBeGreaterThanOrEqual(previousRight)
    expect(bounds.y).toBeGreaterThanOrEqual(teamBounds.y)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(teamBounds.y + teamBounds.height)
    previousRight = bounds.x + bounds.width
  }
  await mkdir('../.tmp/agent-work/overlay', { recursive: true })
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/board-states.png',
    omitBackground: true,
  })
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/board-backdrop-preview.png',
    style: 'html { background: linear-gradient(120deg, #8a927e, #364c48 60%, #a39474); }',
  })
  board.cells[2] = {
    ...board.cells[2]!,
    state: 'open',
    title: 'Новая карточка',
    imageUrl: '/brand/share-card.png',
  }
  notify()
  await expect(field.locator('[data-state="open"]')).toHaveCount(2)
  await expect(field.getByText('Новая карточка', { exact: true })).toBeVisible()

  await page.setViewportSize({ width: 1920, height: 900 })
  await expect.poll(async () => (await field.boundingBox())!.height).toBeLessThan(853)
  await settleOverlay(page)
  const resized = (await field.boundingBox())!
  const resizedTeam = (await team.boundingBox())!
  expect(Math.abs(resizedTeam.width - resized.width)).toBeLessThan(1)
  const resizedRegion = (await page.getByTestId('overlay-scene-region').boundingBox())!
  expect(resized.height).toBeCloseTo(resizedRegion.height, 0)
  expect(resized.width).toBeLessThan(bounds.width)
  expect(resized.x + resized.width / 2).toBeCloseTo(960, 0)
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`overlay scenes animate phase changes and keep refreshes stable (${reducedMotion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion })
    await page.setViewportSize({ width: 1920, height: 1080 })
    const notify = await connectOverlayEvents(page)
    let frame = snapshot
    let requests = 0
    await page.route('**/api/overlay/snapshot', (route) => {
      requests += 1
      return route.fulfill({ json: frame })
    })
    await page.goto(`/overlay?lng=ru#key=${key}`)
    const field = page.getByTestId('overlay-board')
    await expect(field).toBeVisible()
    await settleOverlay(page)
    const presence = page.locator('[data-overlay-presence]').filter({ has: field })
    const motion = await presence.evaluate((el) => ({
      duration: getComputedStyle(el).animationDuration,
      name: getComputedStyle(el).animationName,
      transform: getComputedStyle(el).transform,
    }))
    expect(motion.name === 'none').toBe(reducedMotion === 'reduce')
    expect(motion.transform).toBe('none')
    if (reducedMotion === 'no-preference') expect(motion.duration).toBe('0.36s')
    await page.evaluate(() => {
      document.documentElement.dataset.overlayAnimationStarts = '0'
      document.addEventListener('animationstart', () => {
        const root = document.documentElement
        root.dataset.overlayAnimationStarts = String(
          Number(root.dataset.overlayAnimationStarts) + 1,
        )
      })
    })
    const before = requests
    notify()
    await expect.poll(() => requests).toBe(before + 1)
    await page.waitForTimeout(100)
    await expect(page.locator('html')).toHaveAttribute('data-overlay-animation-starts', '0')
    frame = {
      ...snapshot,
      phase: 'card_opened',
      board: null,
      round: {
        id: 'motion-round',
        columnLabel: 'Охота',
        rowLabel: 'Разминка',
        title: 'Новая карточка',
        cost: 100,
        imageUrl: null,
        modifiers: [],
      },
    }
    notify()
    await expect(page.getByTestId('overlay-card')).toBeVisible()
    await expect(field).toHaveCount(0)
    await settleOverlay(page)
    const starts = Number(await page.locator('html').getAttribute('data-overlay-animation-starts'))
    // Departing scene, arriving scene, and the newly displayed phase label.
    expect(starts).toBe(reducedMotion === 'reduce' ? 0 : 3)
    frame = snapshot
    notify()
    await expect(field).toBeVisible()
    await expect(page.getByTestId('overlay-card')).toHaveCount(0)
    await settleOverlay(page)
    expect((await field.boundingBox())!.x + (await field.boundingBox())!.width / 2).toBeCloseTo(
      960,
      0,
    )
  })
}

for (const [language, cost, played, points, activeTeam] of [
  ['en', '100 pts', 'Played', '330 pts', 'Active team'],
  ['ru', '100 очк.', 'Сыграно', '330 очк.', 'Активная команда'],
  ['uk', '100 оч.', 'Зіграно', '330 очк.', 'Активна команда'],
  ['pl', '100 pkt', 'Rozegrano', '330 pkt', 'Aktywna drużyna'],
] as const) {
  test(`direct OBS entry translates card values without game-page locales in ${language}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    const unexpectedLocales: string[] = []
    await page.route('**/*game-board-translations*', (route) => {
      unexpectedLocales.push(route.request().url())
      return route.abort()
    })
    await page.route('**/api/overlay/snapshot', (route) =>
      route.fulfill({
        json: {
          ...snapshot,
          board: {
            ...snapshot.board,
            cells: snapshot.board!.cells.map((cell, index) =>
              index === 0
                ? {
                    ...cell,
                    result: {
                      teamName: 'Северный ветер',
                      teamSlotIndex: 1,
                      finalScore: 330,
                      penaltyTotal: 0,
                    },
                  }
                : cell,
            ),
          },
        },
      }),
    )
    await page.goto(`/overlay?lng=${language}#key=${key}`)
    const field = page.getByTestId('overlay-board')
    await expect(
      page.getByTestId('overlay-team').getByRole('heading', { name: activeTeam }),
    ).toBeVisible()
    await expect(field.locator('[data-state="closed"]').first()).toHaveText(cost)
    await expect(field.getByTestId('played-cell-result-label')).toHaveText(played)
    await expect(field.getByTestId('played-cell-result-points')).toHaveText(points)
    await expect(field).not.toContainText(/gameBoard\.|boardCard\.|\{\{/)
    expect(unexpectedLocales).toEqual([])
    await page.evaluate(() => document.fonts.ready)
    await settleOverlay(page)
    if (language === 'ru') {
      await mkdir('../.tmp/agent-work/overlay', { recursive: true })
      await page.screenshot({
        path: '../.tmp/agent-work/overlay/card-translations.png',
        omitBackground: true,
      })
    }
  })
}

test('horizontal team strip wraps long names and reserves board space', async ({ page }) => {
  const team = {
    ...snapshot.team!,
    name: 'Очень длинное название команды охотников из далёких болот',
    players: [
      'LongHunterNameWithoutSpaces123456789',
      'ЕщёОдинОченьДлинныйНикОхотника',
      'ThirdHunterWithLongDisplayName',
    ],
  }
  await page.route('**/api/overlay/snapshot', (route) =>
    route.fulfill({ json: { ...snapshot, team } }),
  )
  await page.goto(`/overlay?lng=ru#key=${key}`)
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport)
    const strip = page.getByTestId('overlay-team')
    const board = page.getByTestId('overlay-board')
    await expect(strip.getByRole('heading', { name: team.name })).toBeVisible()
    await expect(board).toBeVisible()
    await settleOverlay(page)
    const stripBounds = (await strip.boundingBox())!
    const boardBounds = await centeredSceneBounds(page, board)
    expect(Math.abs(stripBounds.width - boardBounds.width)).toBeLessThan(1)
    expect(Math.abs(stripBounds.x - boardBounds.x)).toBeLessThan(1)
    expect(stripBounds.x + stripBounds.width / 2).toBeCloseTo(viewport.width / 2, 0)
    expect(stripBounds.y).toBeCloseTo(24, 0)
    expect(stripBounds.height).toBeLessThan(180)
    expect(boardBounds.y).toBeGreaterThanOrEqual(stripBounds.y + stripBounds.height + 10)
    expect(boardBounds.y + boardBounds.height).toBeLessThanOrEqual(viewport.height - 23)
    for (const name of team.players) {
      const player = strip.getByText(name, { exact: true })
      await expect(player).toBeVisible()
      expect(
        await player.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBe(true)
    }
    await page.screenshot({
      path: `../.tmp/agent-work/overlay/team-strip-${viewport.width}.png`,
      omitBackground: true,
    })
  }
})

test('completed preparation clears OBS until gameplay starts, including after reload', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  const notify = await connectOverlayEvents(page)
  let frame: Snapshot = {
    ...snapshot,
    phase: 'preparing',
    board: null,
    round: {
      id: 'ready-round',
      columnLabel: 'Охота',
      rowLabel: '100',
      cost: 100,
      title: 'Охота: 100',
      imageUrl: '/brand/share-card.png',
      modifiers: [],
    },
  }
  await page.route('**/api/overlay/snapshot', (route) => route.fulfill({ json: frame }))
  await page.goto(`/overlay?lng=ru#key=${key}`)
  await expect(page.getByTestId('overlay-round-layout')).toBeVisible()
  await expect(page.getByTestId('overlay-backdrop')).toHaveCSS('opacity', '0.9')
  frame = { ...frame, phase: 'preparation_completed', round: null }
  notify()
  for (const reload of [false, true]) {
    if (reload) await page.reload()
    await expect(page.getByTestId('overlay-team')).toBeHidden()
    await expect(page.getByTestId('overlay-backdrop')).toHaveCSS('opacity', '0')
    await expect(page.getByTestId('overlay-round-layout')).toHaveCount(0)
    await expect(page.getByTestId('overlay-board')).toHaveCount(0)
    await expect(page.getByTestId('overlay-summary')).toHaveCount(0)
    await expect(page.getByRole('heading').first()).toBeHidden()
  }
  await page.screenshot({
    path: '../.tmp/agent-work/overlay/preparation-completed.png',
    omitBackground: true,
  })
  frame = { ...frame, phase: 'in_progress', gameplay: catalogGameplay }
  notify()
  await expect(page.getByTestId('overlay-gameplay')).toBeVisible()
  await expect(page.getByTestId('overlay-backdrop')).toHaveCSS('opacity', '0')
})
