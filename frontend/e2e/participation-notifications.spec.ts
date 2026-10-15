import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { setupNotificationFixture } from './support/notification-fixture.ts'

for (const [locale, width, buttonName] of [
  ['ru', 390, 'Открыть уведомления'],
  ['ru', 768, 'Открыть уведомления'],
  ['ru', 1440, 'Открыть уведомления'],
  ['en', 390, 'Open notifications'],
  ['uk', 390, 'Відкрити сповіщення'],
  ['pl', 390, 'Otwórz powiadomienia'],
] as const) {
  test(`participation notifications arrive quietly and wrap at ${width} in ${locale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    const fixture = await setupNotificationFixture(page, locale)
    await page.goto('/panel/game-application')
    await expect.poll(() => fixture.connected && fixture.reads > 0).toBe(true)
    fixture.notifications = [
      'team_member_assigned',
      'team_member_transferred',
      'team_member_removed',
      'team_disbanded',
    ].map((type, index) => ({
      notificationId: `notice-${index}`,
      type,
      createdAtUtc: '2026-10-15T12:00:00Z',
      teamName: 'Охотники затерянных болот',
      teamSlotIndex: 3,
      previousTeamName: null,
      previousTeamSlotIndex: 2,
    }))
    await fixture.emit()
    await expect(page.getByRole('menu')).not.toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    const button = page.getByRole('button', { name: buttonName })
    await expect(button).toContainText('4')
    await button.click()
    const items = page.getByRole('menuitem')
    await expect(items).toHaveCount(4)
    for (const item of await items.all()) {
      await expect(item).toHaveAttribute('href', '/panel/game-application')
      await expect(item).toBeInViewport()
      expect(await item.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      )
    }
    if (locale === 'ru')
      await expect(items.nth(1)).toContainText(
        'Организатор перевёл вас из команды № 2 в команду «Охотники затерянных болот».',
      )
    await page.evaluate(() => document.fonts.ready)
    await expect(page.getByRole('menu').locator('..')).toHaveCSS('opacity', '1')
    await mkdir('../.tmp/agent-work/notifications', { recursive: true })
    await page.screenshot({
      path: `../.tmp/agent-work/notifications/${locale}-${width}.png`,
      animations: 'disabled',
    })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).not.toBeVisible()
    await expect(button).toBeFocused()
    await expect.poll(() => fixture.notifications.length).toBe(0)
    await button.click()
    await expect(page.getByRole('menuitem', { name: /Охотники затерянных болот/ })).toHaveCount(0)
  })
}
