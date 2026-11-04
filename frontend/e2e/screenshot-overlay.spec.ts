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
      quizQuestion: {
        ...structuredClone(screenshotQuestion),
        text: 'Какая локация скрывается за этой башней?',
      },
    }
    await page.route('**/api/overlay/snapshot', (route) => route.fulfill({ json: state }))
    const notify = await connectOverlayEvents(page)
    await page.goto(`/overlay?lng=ru#key=${key}`)
    const image = page.getByRole('img', { name: 'Скриншот', exact: true })
    await expect(image).toBeVisible()
    await expect
      .poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth))
      .toBeGreaterThan(100)
    await expect(page.getByText('Правильный ответ', { exact: true })).toHaveCount(0)
    await expect(
      page.getByText('Какая локация скрывается за этой башней?', { exact: true }),
    ).toBeVisible()
    const prompt = page.getByText('Какая локация скрывается за этой башней?', { exact: true })
    const heading = await prompt.boundingBox()
    expect(Math.abs(heading!.x + heading!.width / 2 - width / 2)).toBeLessThan(1)
    await expect(prompt).toHaveCSS('text-align', 'center')
    await expect(page.getByText('!1', { exact: true })).toHaveCSS('width', '28px')
    await expect(page.getByText('!1', { exact: true })).toHaveCSS('height', '28px')
    await expect(page.getByRole('timer')).toHaveText(/^0[01]:[0-5]\d$/)
    await expect(page.getByText('!6', { exact: true })).toBeVisible()
    const lastAnswer = await page.getByText('!6', { exact: true }).boundingBox()
    expect(lastAnswer!.y + lastAnswer!.height).toBeLessThan(page.viewportSize()!.height - 24)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await settleOverlay(page)
    const imageBeforeResult = await image.boundingBox()
    await page.screenshot({ path: info.outputPath('screenshot-open.png'), animations: 'disabled' })
    await page.clock.fastForward(61000)
    state = {
      ...state,
      quizQuestion: { ...state.quizQuestion!, status: 'closed', correctOptionId: 'location-0' },
    }
    notify()
    const correctAnswer = page.getByRole('group', { name: 'Правильный ответ', exact: true })
    await expect(correctAnswer).toBeVisible()
    await expect(page.getByRole('timer')).toHaveText('00:00')
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    await expect(page.getByRole('progressbar')).toBeVisible()
    expect(await image.boundingBox()).toEqual(imageBeforeResult)
    await expect(correctAnswer).toContainText('!1')
    await expect(page.getByText('Правильный ответ', { exact: true })).toHaveCount(0)
    const border = await correctAnswer.evaluate((node) => getComputedStyle(node).borderTopColor)
    const [red, green, blue] = border.match(/\d+/g)!.map(Number)
    expect(green).toBeGreaterThan(red!)
    expect(green).toBeGreaterThan(blue!)
    await page.clock.fastForward(120000)
    await expect(page.getByRole('timer')).toHaveText('00:00')
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

for (const count of [2, 10]) {
  test(`manual screenshot overlay renders ${count} ordinary answers without location translations`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.clock.install({ time: new Date('2026-11-02T12:00:00Z') })
    await page.route('**/api/overlay/snapshot', (route) =>
      route.fulfill({
        json: {
          ...snapshot,
          phase: 'screenshot',
          quizQuestion: {
            ...screenshotQuestion,
            categoryName: 'Предметы',
            text: 'Какой предмет показан на изображении?',
            image: { ...screenshotQuestion.image!, mapNames: {}, optionNames: {} },
            options: Array.from({ length: count }, (_, index) => ({
              optionId: `item-${index}`,
              text: `Предмет охотника: вариант ${index + 1}`,
              displayOrder: index,
            })),
          },
        },
      }),
    )
    await connectOverlayEvents(page)
    await page.goto(`/overlay?lng=ru#key=${key}`)
    await expect(page.getByRole('img', { name: 'Скриншот', exact: true })).toBeVisible()
    await expect(
      page.getByText(`Предмет охотника: вариант ${count}`, { exact: true }),
    ).toBeVisible()
    const last = await page.getByText(`!${count}`, { exact: true }).boundingBox()
    expect(last!.y + last!.height).toBeLessThan(1080 - 24)
    await settleOverlay(page)
    await page.screenshot({ path: info.outputPath(`manual-screenshot-${count}.png`) })
  })
}
