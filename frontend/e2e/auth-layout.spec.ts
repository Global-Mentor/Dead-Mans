import { expect, test } from '@playwright/test'

for (const width of [1440, 768, 390, 320]) {
  test(`sign-in and callback failure remain usable at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
    await page.route('**/auth/me', (route) => route.fulfill({ status: 401 }))
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Sign in with Twitch' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: info.outputPath('sign-in.png'),
      fullPage: true,
      animations: 'disabled',
    })
    await page.goto('/auth/callback?status=failed&reason=access_denied')
    const back = page.getByRole('button', { name: 'Back to sign-in' })
    await expect(back).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: info.outputPath('callback-error.png'),
      fullPage: true,
      animations: 'disabled',
    })
    await back.click()
    await expect(page.getByRole('button', { name: 'Sign in with Twitch' })).toBeVisible()
  })
}
