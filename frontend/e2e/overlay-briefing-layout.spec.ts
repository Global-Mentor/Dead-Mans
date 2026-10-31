import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import {
  connectOverlayEvents,
  key,
  settleOverlay,
  snapshot,
  type Snapshot,
} from './support/overlay-fixture'

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]) {
  test(`card keeps full width, proportional height and equal adjacent panels at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const notify = await connectOverlayEvents(page)
    await page.route('**/media/layout-card.svg', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#282827"/><rect x="24" y="24" width="352" height="552" fill="#626052"/><path d="M200 70 340 300 200 530 60 300Z" fill="#b5a679"/></svg>',
      }),
    )
    const card = {
      id: 'layout-round',
      title: 'Карточка',
      cost: 300,
      columnLabel: 'Охота',
      rowLabel: 'Хардкор',
      imageUrl: '/media/layout-card.svg',
      modifiers: [
        { id: 'activation', modifierId: 'modifier', name: 'Первая пуля', iconEmoji: null },
      ],
    }
    const summary: NonNullable<Snapshot['summary']> = {
      roundId: card.id,
      card,
      isFinal: false,
      teamName: snapshot.team!.name,
      teamSlotIndex: 1,
      killsCount: 2,
      bountyCount: 1,
      killsScore: 600,
      bountyScore: 300,
      scoreDetails: {
        scoreUnit: 300,
        killsScore: 600,
        bountyScore: 300,
        modifierKillDelta: 0,
        modifierKillScore: 0,
        modifierScoreDelta: 0,
        emptyCardPenaltyApplied: false,
        emptyCardPenaltyScore: 0,
        penaltyTotal: 0,
        bonusDelta: 0,
        totalKillCount: 2,
        finalScore: 900,
        calculationLines: [
          { kind: 'kills', activationCount: 0, pointsDelta: 600, runningTotal: 600, operands: [] },
          {
            kind: 'bounties',
            activationCount: 0,
            pointsDelta: 300,
            runningTotal: 900,
            operands: [],
          },
        ],
      },
    }
    let frame: Snapshot = { ...snapshot, board: null, phase: 'card_opened', round: card }
    await page.route('**/api/overlay/snapshot', (route) => route.fulfill({ json: frame }))
    const handshake = page.waitForResponse(
      (response) =>
        response.url().includes('/hubs/game-overlay') &&
        response.request().method() === 'POST' &&
        Boolean(response.request().postData()?.includes('"protocol"')) &&
        response.status() === 200,
    )
    await page.goto(`/overlay?lng=ru#key=${key}`)
    await handshake
    await mkdir('../.tmp/agent-work/overlay', { recursive: true })
    let openingBounds: { x: number; y: number; width: number; height: number } | undefined
    for (const phase of [
      'card_opened',
      'awaiting_modifiers',
      'reviewing_results',
      'showing_results',
    ] as const) {
      const results = phase === 'reviewing_results' || phase === 'showing_results'
      frame = {
        ...snapshot,
        board: null,
        phase,
        ...(results
          ? { summary: { ...summary, isFinal: phase === 'showing_results' } }
          : { round: card }),
      }
      notify()
      const scene = page.getByTestId(results ? 'overlay-summary' : 'overlay-round-layout')
      await expect(scene).toBeVisible()
      await expect(scene.getByTestId('overlay-round-phase')).toContainText(
        {
          card_opened: 'Карточка открыта',
          awaiting_modifiers: 'Выбор модификаторов',
          reviewing_results: 'Подведение итогов',
          showing_results: 'Итоги раунда',
        }[phase],
      )
      await expect(scene.getByRole('img')).toBeVisible()
      await settleOverlay(page)
      const left = (await scene.getByTestId('overlay-card').boundingBox())!
      const right = (await scene
        .getByTestId(results ? 'overlay-results' : 'overlay-modifiers')
        .boundingBox())!
      expect(left.x + left.width).toBeLessThan(right.x)
      expect(left.y).toBeCloseTo(right.y, 0)
      expect(left.width).toBeCloseTo(right.width, 0)
      expect(left.height).toBeCloseTo(right.height, 0)
      for (const panel of ['overlay-card', results ? 'overlay-results' : 'overlay-modifiers']) {
        expect(
          await scene
            .getByTestId(panel)
            .evaluate((element) => element.scrollWidth - element.clientWidth),
        ).toBeLessThanOrEqual(1)
      }
      const media = await scene.getByRole('img').evaluate((element: HTMLImageElement) => {
        const image = element.getBoundingClientRect()
        const frame = element.parentElement!.getBoundingClientRect()
        return {
          width: image.width,
          height: image.height,
          availableWidth: frame.width,
          ratio: element.naturalWidth / element.naturalHeight,
        }
      })
      expect(media.width).toBeCloseTo(media.availableWidth, 0)
      expect(media.width / media.height).toBeCloseTo(media.ratio, 2)
      const region = (await page.getByTestId('overlay-scene-region').boundingBox())!
      expect(left.y + left.height).toBeLessThanOrEqual(region.y + region.height + 1)
      if (viewport.width >= 1280) {
        if (!openingBounds) openingBounds = left
        expect(left.x).toBeCloseTo(openingBounds.x, 0)
        expect(left.y).toBeCloseTo(openingBounds.y, 0)
        expect(left.width).toBeCloseTo(openingBounds.width, 0)
        expect(left.height).toBeCloseTo(openingBounds.height, 0)
        const mediaFrame = (await scene.getByTestId('overlay-card-image').boundingBox())!
        // The image fills the frame apart from its standard padding and border.
        expect(mediaFrame.height - media.height).toBeLessThanOrEqual(27)
      }
      await page.screenshot({
        path: `../.tmp/agent-work/overlay/layout-${viewport.width}-${phase}.png`,
      })
    }
    expect(errors).toEqual([])
  })
}
