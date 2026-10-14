import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import {
  key,
  snapshot,
  connectOverlayEvents,
  settleOverlay,
  type Snapshot,
} from './support/overlay-fixture'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`test logo waits for loading before revealing (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
    let releaseImage = () => {}
    const imageReady = new Promise<void>((resolve) => {
      releaseImage = resolve
    })
    await page.route('**/brand/share-card.svg', async (route) => {
      await imageReady
      await route.continue()
    })
    await page.route('**/api/overlay/snapshot', (route) =>
      route.fulfill({
        json: { gameId: null, phase: 'test', team: null, board: null, round: null },
      }),
    )
    const notify = await connectOverlayEvents(page)
    await page.goto(`/overlay#key=${key}`, { waitUntil: 'domcontentloaded' })
    const scene = page.getByTestId('overlay-test-scene')
    const logo = scene.locator('img')
    await expect(scene.getByRole('status')).toBeVisible()
    await expect(logo).toHaveCSS('visibility', 'hidden')
    await scene.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished))
    })
    releaseImage()
    await expect(logo).toBeVisible()
    if (reducedMotion === 'reduce') {
      await expect(logo).toHaveCSS('animation-name', 'none')
      await expect(logo).toHaveCSS('opacity', '1')
      return
    }
    await logo.evaluate((element) => {
      const animation = element.getAnimations()[0]!
      animation.id = 'logo-reveal'
      animation.pause()
      animation.currentTime = 0
    })
    await expect(logo).toHaveCSS('opacity', '0')
    await logo.evaluate((element) => {
      element.getAnimations()[0]!.currentTime = 350
    })
    const opacity = await logo.evaluate((element) => Number(getComputedStyle(element).opacity))
    expect(opacity).toBeGreaterThan(0)
    expect(opacity).toBeLessThan(1)
    await logo.evaluate((element) => {
      element.getAnimations()[0]!.finish()
    })
    await expect(logo).toHaveCSS('opacity', '1')
    const refreshed = page.waitForResponse('**/api/overlay/snapshot')
    notify()
    await refreshed
    expect(await logo.evaluate((element) => element.getAnimations()[0]!.id)).toBe('logo-reveal')
    await expect(logo).toHaveCSS('opacity', '1')
  })
}

test('overlay test replaces the live scene, survives reloads and restores the current phase', async ({
  page,
  context,
}) => {
  let enabled = false
  let fail = false
  let revoked = false
  let frame: Snapshot = snapshot
  let notify = () => {}
  await context.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  await context.route(
    (url) => url.pathname === '/auth/me' || url.pathname.startsWith('/api/'),
    async (route) => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      if (path === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
            displayName: 'Owner',
            roles: ['admin', 'viewer'],
          },
        })
      if (path === '/api/overlay/test') {
        if (request.method() === 'PUT') {
          expect(request.headers()['x-dead-mans-api-client']).toBe('1')
          if (fail) return route.fulfill({ status: 503 })
          enabled = request.postDataJSON().enabled
          await route.fulfill({ json: { hasKey: true, enabled } })
          notify()
          return
        }
        return route.fulfill({ json: { hasKey: true, enabled } })
      }
      if (path === '/api/overlay/snapshot') {
        if (revoked) return route.fulfill({ status: 401 })
        return route.fulfill({
          json: enabled
            ? { gameId: null, phase: 'test', team: null, board: null, round: null }
            : frame,
        })
      }
      return route.fulfill({ status: 204 })
    },
  )
  const overlay = await context.newPage()
  await overlay.setViewportSize({ width: 1920, height: 1080 })
  notify = await connectOverlayEvents(overlay)
  await overlay.goto(`/overlay#key=${key}`)
  await expect(overlay.getByTestId('overlay-board')).toBeVisible()
  await page.goto('/panel/game-overlay')
  await page.getByRole('button', { name: 'Test Overlay' }).click()
  await expect(overlay.getByTestId('overlay-test-scene')).toBeVisible()
  await expect(overlay.getByTestId('overlay-board')).toHaveCount(0)
  await expect(overlay.getByTestId('overlay-team')).toHaveCount(0)
  const logo = overlay.getByRole('img', { name: 'Логотип Deadman’s - тест оверлея' })
  await expect(logo).toBeVisible()
  await expect(logo).toHaveAttribute('src', '/brand/share-card.svg')
  await settleOverlay(overlay)
  const bounds = (await logo.boundingBox())!
  expect(bounds.x + bounds.width / 2).toBeCloseTo(960, 0)
  expect(bounds.y + bounds.height / 2).toBeCloseTo(540, 0)
  await mkdir('../.tmp/agent-work/overlay', { recursive: true })
  await overlay.screenshot({ path: '../.tmp/agent-work/overlay/test-mode-1920.png' })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Завершить тест' })).toBeVisible()
  await overlay.reload()
  await expect(overlay.getByTestId('overlay-test-scene')).toBeVisible()
  frame = {
    ...snapshot,
    phase: 'card_opened',
    board: null,
    round: {
      id: 'opened',
      title: 'Открытая карточка',
      cost: 210,
      imageUrl: '/brand/share-card.png',
      columnLabel: 'Охота',
      rowLabel: '210',
      modifiers: [],
    },
  }
  fail = true
  await page.getByRole('button', { name: 'Завершить тест' }).click()
  await expect(
    page.getByText('Не удалось загрузить или изменить тестовый режим. Попробуйте ещё раз.'),
  ).toBeVisible()
  await expect(overlay.getByTestId('overlay-test-scene')).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Завершить тест' }).click()
  await expect(overlay.getByTestId('overlay-test-scene')).toHaveCount(0)
  await expect(overlay.getByTestId('overlay-round-layout')).toBeVisible()
  await expect(overlay.getByTestId('overlay-board')).toHaveCount(0)
  await page.getByRole('button', { name: 'Test Overlay' }).click()
  await expect(overlay.getByTestId('overlay-test-scene')).toBeVisible()
  revoked = true
  notify()
  await expect(overlay.getByTestId('overlay-test-scene')).toHaveCount(0)
})
