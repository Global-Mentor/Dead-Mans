import { expect, test } from '@playwright/test'
import { connectOverlayEvents, key, settleOverlay, snapshot } from './support/overlay-fixture'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`expired modifiers collapse after their last deadline plus 15 seconds (${reducedMotion})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.emulateMedia({ reducedMotion })
    const serverStart = Date.UTC(2026, 9, 13, 10)
    const notify = await connectOverlayEvents(page)
    let elapsed = 0
    let reportedAt = Date.now()
    let pendingElapsed: number | null = 0
    let responseDelayMs = 0
    const updateTime = async (value: number, delayMs = 0) => {
      pendingElapsed = value
      responseDelayMs = delayMs
      const response = page.waitForResponse('**/api/overlay/snapshot')
      notify()
      await response
    }
    await page.route('**/api/overlay/snapshot', async (route) => {
      if (responseDelayMs > 0) {
        const delayMs = responseDelayMs
        responseDelayMs = 0
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
      // Anchor an explicit correction when the response is made, not before negotiation/refetch.
      if (pendingElapsed !== null) {
        elapsed = pendingElapsed
        pendingElapsed = null
        reportedAt = Date.now()
      }
      await route.fulfill({
        json: {
          ...snapshot,
          phase: 'in_progress',
          board: null,
          gameplay: {
            roundId: 'collapse-round',
            gameplayStartedAtUtc: new Date(serverStart).toISOString(),
            serverNowUtc: new Date(serverStart + elapsed + Date.now() - reportedAt).toISOString(),
            modifiers: [
              {
                modifierId: 'solo',
                name: 'Черепаха',
                iconEmoji: '🐢',
                activationCount: 1,
                timers: [{ id: 'one', durationSeconds: 10 }],
              },
              {
                modifierId: 'multi',
                name: 'Проказник',
                iconEmoji: '🙊',
                activationCount: 2,
                timers: [
                  { id: 'two', durationSeconds: 10 },
                  { id: 'three', durationSeconds: 20 },
                ],
              },
              {
                modifierId: 'untimed',
                name: 'Жажда',
                iconEmoji: '🩸',
                activationCount: 1,
                timers: [],
              },
            ],
          },
        },
      })
    })
    await page.goto(`/overlay?lng=ru#key=${key}`)
    const hud = page.getByTestId('overlay-gameplay')
    const solo = hud.locator('[data-modifier-id=solo]')
    const compact = hud.locator('[data-modifier-group=untimed]')
    await expect(hud.getByRole('timer')).toHaveCount(3)
    await settleOverlay(page)
    const original = (await solo.boundingBox())!
    await updateTime(10000)
    await expect(hud.getByRole('timer')).toHaveText(['0:00', '0:00', '0:10'])
    // Observe the transition in its DOM update; locator polling can outlast the animation.
    await hud.evaluate((element) => {
      const observer = new MutationObserver(() => {
        const collapsed = element.querySelector(
          '[data-modifier-group=untimed] [data-modifier-id=solo]',
        )
        if (!collapsed) return
        element.dataset.collapseAnimated = String(
          collapsed.getAnimations().some((animation) => animation.playState === 'running'),
        )
        observer.disconnect()
      })
      observer.observe(element, { childList: true, subtree: true })
    })
    await updateTime(24000)
    await expect(hud.getByRole('timer')).toHaveText(['0:00', '0:00', '0:00'])
    await expect(compact.getByRole('listitem')).toHaveCount(1)
    expect((await solo.boundingBox())!.width).toBeCloseTo(original.width, 0)
    await expect(compact.getByRole('listitem')).toHaveCount(2)
    await expect(hud).toHaveAttribute(
      'data-collapse-animated',
      String(reducedMotion === 'no-preference'),
    )
    await settleOverlay(page)
    expect((await solo.boundingBox())!.width).toBeLessThan(original.width * 0.51)
    await expect(hud.getByRole('timer')).toHaveText(['0:00', '0:00'])
    // The group waits for its longest independent timer, not the first expiry.
    await updateTime(34000)
    await expect(compact.getByRole('listitem')).toHaveCount(2)
    await expect(hud.getByRole('timer')).toHaveCount(0)
    await settleOverlay(page)
    await expect(compact.getByRole('heading')).toHaveText(['Жажда', 'Черепаха', 'Проказник ×2'])
    await expect(hud.getByRole('listitem')).toHaveCount(3)
    await page.screenshot({
      path: `../.tmp/agent-work/overlay/collapsed-${reducedMotion}.png`,
      omitBackground: true,
    })
    pendingElapsed = 35000
    await page.reload()
    await expect(compact.getByRole('listitem')).toHaveCount(3)
    await expect(hud.getByRole('timer')).toHaveCount(0)
    // An authoritative clock correction can restore a live timer without duplicating the row.
    await updateTime(5000, 1200)
    await expect(hud.getByRole('timer')).toHaveText(['0:05', '0:05', '0:15'])
    await expect(hud.getByRole('listitem')).toHaveCount(3)
  })
}
