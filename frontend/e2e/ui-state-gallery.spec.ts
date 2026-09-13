import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { expectUnifiedTypography } from './typography-assertions.ts'

test.beforeAll(async () => {
  await mkdir('../.tmp/ui-audit/after', { recursive: true })
})

async function mockGalleryApi(page: Page) {
  await page.route(
    (url: URL) => url.pathname === '/auth/me' || url.pathname.startsWith('/api/'),
    async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/auth/me') {
        await route.fulfill({
          json: {
            userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
            displayName: 'Gallery',
            roles: ['admin', 'viewer'],
          },
        })
      } else {
        await route.fulfill({ status: 204 })
      }
    },
  )
}

for (const viewport of [
  { width: 1440, height: 900, label: 'desktop' },
  { width: 390, height: 844, label: 'mobile' },
  { width: 320, height: 640, label: 'narrow-short' },
]) {
  test(`shared UI gallery remains usable on ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
    await mockGalleryApi(page)
    await page.goto('/panel/__ui-states')

    await expect(page.locator('main h1')).toBeVisible()
    await expectUnifiedTypography(page)
    await expect(page.locator('button button, button a, a button, a a')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    await page.screenshot({
      path: `../.tmp/ui-audit/after/gallery-${viewport.label}.png`,
      fullPage: true,
      animations: 'disabled',
    })

    const opener = page.getByRole('button', { name: 'Open', exact: true }).last()
    await opener.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(
      await dialog
        .getByRole('button', { name: 'Cancel' })
        .evaluate((element) => getComputedStyle(element).borderImageSource),
    ).not.toBe('none')
    await page.screenshot({
      path: `../.tmp/ui-audit/after/gallery-dialog-${viewport.label}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()
  })
}

test('shared UI gallery renders every supported locale at increased scale', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  await mockGalleryApi(page)

  for (const locale of ['en', 'ru', 'uk', 'pl']) {
    await page.addInitScript((language) => localStorage.setItem('i18nextLng', language), locale)
    await page.goto('/panel/__ui-states')
    await expect(page.locator('main h1')).toBeVisible()
    await expectUnifiedTypography(page)
    await page.evaluate(() => {
      document.body.style.zoom = '1.25'
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
