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

    const primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' })
    const compactNavigation = viewport.width < 1200
    if (compactNavigation) {
      await primaryNavigation.getByRole('button', { name: 'Open navigation' }).click()
    }
    for (const label of ['Game', 'Leaderboard', 'Apply', 'Modifiers', 'Quiz']) {
      await expect(
        compactNavigation
          ? page.getByRole('menuitem', { name: label, exact: true })
          : primaryNavigation.getByRole('link', { name: label, exact: true }),
      ).toBeVisible()
    }
    if (!compactNavigation) await primaryNavigation.getByRole('button', { name: 'History' }).click()
    await expect(page.getByRole('menuitem', { name: 'Game history', exact: true })).toBeVisible()
    await expect(
      page.getByRole('menuitem', { name: 'Modifier history', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')

    await page.screenshot({
      path: `../.tmp/ui-audit/after/gallery-${viewport.label}.png`,
      fullPage: true,
      animations: 'disabled',
    })

    const administrationButton = page.getByRole('button', {
      name: 'Administration',
      exact: true,
    })
    await administrationButton.click()
    const administrationMenu = page.getByRole('menu')
    for (const label of [
      'Board setup',
      'Teams',
      'Current game modifiers',
      'Current game questions',
      'Modifier catalog',
      'Question catalog',
    ]) {
      await expect(administrationMenu.getByRole('menuitem', { name: label })).toBeAttached()
    }
    await expect(administrationMenu.getByRole('menuitem', { name: 'User roles' })).toHaveCount(0)
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Gallery' }).click()
    const profileMenu = page.getByRole('menu')
    await expect(profileMenu.getByText('Access roles')).toBeVisible()
    await expect(profileMenu.getByText('Administrator')).toBeVisible()
    await expect(profileMenu.getByText('Participant')).toBeVisible()
    await expect(profileMenu.getByRole('combobox', { name: 'Interface language' })).toBeVisible()
    await expect(profileMenu.getByRole('menuitem', { name: 'Log out' })).toBeVisible()
    await page.keyboard.press('Escape')

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
