import { expect, type Page } from '@playwright/test'
import type { components } from '../../src/shared/api/contracts/generated'

export const key = 'a'.repeat(64)
export type Snapshot = components['schemas']['GameOverlaySnapshotDto']
export const snapshot: Snapshot = {
  round: null,
  gameId: 'game-1',
  phase: 'select_card',
  team: {
    name: 'Охотники болот',
    slotIndex: 1,
    players: ['EdiLarios', 'NightHunter', 'BayouWalker'],
  },
  board: {
    rowLabels: ['100', '200', '300'],
    colLabels: ['Оружие', 'Охота', 'Испытания', 'Награда', 'Удача'],
    cells: Array.from({ length: 15 }, (_, index) => ({
      imageUrl: null,
      result: null,
      row: Math.floor(index / 5),
      col: index % 5,
      cost: (Math.floor(index / 5) + 1) * 100,
      state: index === 0 ? 'open' : 'closed',
      title: index === 0 ? 'Старая винтовка' : null,
    })),
  },
}

export async function connectOverlayEvents(page: Page) {
  const messages: string[] = []
  let wake: (() => void) | undefined
  let firstPoll = true
  const send = (message: unknown) => {
    messages.push(`${JSON.stringify(message)}\u001e`)
    wake?.()
  }
  await page.route('**/hubs/game-overlay**', async (route) => {
    const request = route.request()
    expect(request.headers()['x-overlay-key']).toBe(key)
    expect(request.url()).not.toContain(key)
    if (request.url().includes('/negotiate')) {
      firstPoll = true
      return route.fulfill({
        json: {
          negotiateVersion: 1,
          connectionId: 'overlay',
          connectionToken: 'overlay',
          availableTransports: [{ transport: 'LongPolling', transferFormats: ['Text'] }],
        },
      })
    }
    if (request.method() === 'DELETE') return route.fulfill({ status: 202 })
    if (request.method() === 'POST') {
      if (request.postData()?.includes('"protocol"')) send({})
      return route.fulfill({ status: 200, body: '' })
    }
    if (firstPoll) {
      firstPoll = false
      return route.fulfill({ status: 200, body: '' })
    }
    if (messages.length === 0)
      await new Promise<void>((resolve) => {
        wake = resolve
      })
    wake = undefined
    await route
      .fulfill({ status: 200, contentType: 'text/plain', body: messages.splice(0).join('') })
      .catch(() => {})
  })
  return (message: unknown = { type: 1, target: 'frameChanged', arguments: [] }) => send(message)
}

export async function settleOverlay(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => {})),
    )
  })
}

const catalog = [
  ['Черепаха', '🐢', 120],
  ['Проказник', '🙊', 300],
  ['Провокация', '📢', 300],
  ['Фейерверк', '🎆', 300],
  ['Жажда', '🩸', 0],
  ['Расходник', '📦', 0],
  ['Трупы', '🪦', 0],
  ['Навыки', '⚙️', 0],
  ['Первая пуля', '🔫', 0],
  ['Диарея', '💩', 0],
  ['Кэп', '🔇', 0],
  ['Крыса', '🐀', 0],
  ['Шот', '🥠', 0],
  ['Подъём', '☠️', 0],
  ['Хард75', '💀', 0],
] as const
export const catalogGameplay: NonNullable<Snapshot['gameplay']> = {
  roundId: 'catalog-round',
  gameplayStartedAtUtc: '2026-10-13T10:00:00Z',
  serverNowUtc: '2026-10-13T10:00:30Z',
  modifiers: catalog.map(([name, iconEmoji, durationSeconds], index) => ({
    modifierId: `catalog-${index}`,
    name,
    iconEmoji,
    activationCount: index === 0 ? 2 : 1,
    timers: durationSeconds ? [{ id: `timer-${index}`, durationSeconds }] : [],
  })),
}
