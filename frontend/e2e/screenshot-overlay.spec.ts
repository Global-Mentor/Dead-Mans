import { expect, test } from '@playwright/test'
import {
  connectOverlayEvents,
  key,
  settleOverlay,
  snapshot,
  type Snapshot,
} from './support/overlay-fixture.ts'
import { screenshotQuestion } from './support/screenshot-fixture.ts'

for (const width of [390, 768, 1440, 1920]) {
  test(`screenshot overlay reveals and retains the result until hidden at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 900 })
    await page.clock.install({ time: new Date('2026-11-02T12:00:00Z') })
    let state: Snapshot = {
      ...snapshot,
      phase: 'screenshot',
      quizQuestion: structuredClone(screenshotQuestion),
    }
    await page.route('**/api/overlay/snapshot', (route) => route.fulfill({ json: state }))
    const notify = await connectOverlayEvents(page)
    await page.goto(`/overlay?lng=ru#key=${key}`)
    const image = page.getByRole('img', { name: 'Скриншот локации', exact: true })
    await expect(image).toBeVisible()
    await expect
      .poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth))
      .toBeGreaterThan(100)
    await expect(page.getByText('Правильный ответ', { exact: true })).toHaveCount(0)
    await expect(page.getByText('!6', { exact: true })).toBeVisible()
    const lastAnswer = await page.getByText('!6', { exact: true }).boundingBox()
    expect(lastAnswer!.y + lastAnswer!.height).toBeLessThan(page.viewportSize()!.height - 24)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await settleOverlay(page)
    await page.screenshot({ path: info.outputPath('screenshot-open.png'), animations: 'disabled' })
    await page.clock.fastForward(61000)
    state = {
      ...state,
      quizQuestion: { ...screenshotQuestion, status: 'closed', correctOptionId: 'location-0' },
    }
    notify()
    await expect(page.getByText('Правильный ответ', { exact: true })).toBeVisible()
    await page.clock.fastForward(120000)
    await expect(image).toBeVisible()
    await page.screenshot({
      path: info.outputPath('screenshot-result.png'),
      animations: 'disabled',
    })
    state = snapshot
    notify()
    await expect(image).toHaveCount(0)
    await expect(page.getByText('Охотники болот', { exact: true })).toBeVisible()
  })
}

test('screenshot overlay reports missing media without losing answer options', async ({ page }) => {
  await page.route('**/api/overlay/snapshot', (route) =>
    route.fulfill({
      json: {
        ...snapshot,
        phase: 'screenshot',
        quizQuestion: {
          ...screenshotQuestion,
          image: { ...screenshotQuestion.image, imageUrl: '/missing-image.png' },
        },
      },
    }),
  )
  await page.route('**/missing-image.png', (route) => route.fulfill({ status: 404 }))
  await connectOverlayEvents(page)
  await page.goto(`/overlay?lng=ru#key=${key}`)
  await expect(page.getByText('Изображение недоступно', { exact: true })).toBeVisible()
  await expect(page.getByText('!6', { exact: true })).toBeVisible()
})
