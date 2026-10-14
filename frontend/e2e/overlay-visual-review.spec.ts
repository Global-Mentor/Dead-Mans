import { expect, test } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  catalogGameplay,
  connectOverlayEvents,
  key,
  settleOverlay,
  snapshot,
  type Snapshot,
} from './support/overlay-fixture'

// Local review assets from https://www.huntshowdown.com/media/images are never shipped.
test.skip(!process.env.OVERLAY_BACKGROUND_DIR, 'Supply local review backgrounds explicitly.')
test.use({
  viewport: { width: 1920, height: 1080 },
  video: { mode: 'on', size: { width: 1920, height: 1080 } },
})

for (const background of ['hunt-day.jpg', 'hunt-dark.jpg', 'hunt-interior.png']) {
  test(`reviews the overlay against ${background}`, async ({ page }) => {
    const output = '../.tmp/agent-work/overlay'
    await mkdir(output, { recursive: true })
    await page.route('**/review-background', async (route) =>
      route.fulfill({
        body: await readFile(resolve(process.env.OVERLAY_BACKGROUND_DIR!, background)),
        contentType: background.endsWith('.png') ? 'image/png' : 'image/jpeg',
      }),
    )
    const notify = await connectOverlayEvents(page)
    let frame: Snapshot = {
      ...snapshot,
      phase: 'in_progress',
      board: null,
      gameplay: catalogGameplay,
    }
    await page.route('**/api/overlay/snapshot', (route) => route.fulfill({ json: frame }))
    await page.goto(`/overlay?lng=ru#key=${key}`)
    await page.evaluate(async () => {
      const image = new Image()
      image.src = '/review-background'
      await image.decode()
      document.body.style.background = 'url(/review-background) center / cover fixed'
    })
    const hud = page.getByTestId('overlay-gameplay')
    await expect(hud.getByRole('listitem')).toHaveCount(15)
    await settleOverlay(page)
    await page.screenshot({ path: `${output}/composite-${background}.png` })
    frame = { ...frame, gameplay: { ...catalogGameplay, serverNowUtc: '2026-10-13T11:00:00Z' } }
    notify()
    await expect(hud.getByRole('timer')).toHaveCount(0)
    // Expiry must not make the surface transparent on bright game footage.
    for (const row of await hud.locator('[data-expired="true"]').all()) {
      expect(await row.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    }
    await settleOverlay(page)
    await page.screenshot({ path: `${output}/composite-expired-${background}.png` })
    if (background === 'hunt-day.jpg') {
      frame = snapshot
      notify()
      await expect(page.getByTestId('overlay-board')).toBeVisible()
      await settleOverlay(page)
      await page.waitForTimeout(900)
      const round = {
        id: 'review-round',
        title: 'Карточка',
        cost: 210,
        columnLabel: 'Охота',
        rowLabel: 'Хардкор',
        imageUrl: '/brand/share-card.png',
        modifiers: [] as NonNullable<Snapshot['round']>['modifiers'],
      }
      for (const phase of ['card_opened', 'awaiting_modifiers', 'preparing'] as const) {
        if (phase === 'awaiting_modifiers')
          round.modifiers = catalogGameplay.modifiers.map((modifier, i) => ({
            id: `activation-${i}`,
            modifierId: modifier.modifierId,
            name: modifier.name,
            iconEmoji: modifier.iconEmoji,
          }))
        frame = { ...snapshot, phase, board: null, round }
        notify()
        await expect(page.getByTestId('overlay-round-phase')).toContainText(
          phase === 'card_opened'
            ? 'Карточка открыта'
            : phase === 'preparing'
              ? 'Подготовка к игре'
              : 'Выбор модификаторов',
        )
        await settleOverlay(page)
        await page.screenshot({ path: `${output}/composite-${phase}.png` })
        await page.waitForTimeout(900)
      }
      frame = { ...snapshot, phase: 'in_progress', board: null, gameplay: catalogGameplay }
      notify()
      await expect(hud).toBeVisible()
      await settleOverlay(page)
      await page.waitForTimeout(1500)
    }
    const video = page.video()
    await page.close()
    await video?.saveAs(`${output}/transitions-${background}.webm`)
  })
}
