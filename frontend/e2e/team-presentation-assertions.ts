import { expect, type Locator } from '@playwright/test'

export async function expectTeamPresentation(profile: Locator, count: number) {
  await expect(profile).toBeVisible()
  await expect(profile.getByRole('listitem')).toHaveCount(count)
  // The outer team surface owns highlights; the title must never mask them.
  const title = profile.getByTestId('team-title').getByRole('heading')
  await expect(title).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(title).toHaveCSS('background-image', 'none')
  const geometry = await profile.evaluate((element) => {
    const frame = element.getBoundingClientRect()
    const title = element.querySelector('h3')!.getBoundingClientRect()
    const list = element.querySelector('ul')!.getBoundingClientRect()
    return {
      centerOffset: title.left + title.width / 2 - frame.left - frame.width / 2,
      titleBottom: title.bottom,
      listTop: list.top,
      fits: element.scrollWidth <= element.clientWidth + 1,
      players: [...element.querySelectorAll('li')].map((player) => {
        const rect = player.getBoundingClientRect()
        return {
          width: rect.width,
          left: rect.left,
          top: rect.top,
          bottom: rect.bottom,
          fits: player.scrollWidth <= player.clientWidth + 1,
        }
      }),
    }
  })
  expect(Math.abs(geometry.centerOffset)).toBeLessThanOrEqual(1)
  expect(geometry.listTop).toBeGreaterThan(geometry.titleBottom)
  expect(geometry.fits).toBe(true)
  for (const player of geometry.players) {
    expect(player.width).toBeCloseTo(geometry.players[0]!.width, 0)
    expect(player.fits).toBe(true)
  }
  // A small roster is one balanced row or one column, never a stranded last player.
  const horizontal = geometry.players.every(
    (player) => Math.abs(player.top - geometry.players[0]!.top) <= 1,
  )
  if (!horizontal) {
    for (const [index, player] of geometry.players.entries()) {
      expect(player.left).toBeCloseTo(geometry.players[0]!.left, 0)
      if (index) expect(player.top).toBeGreaterThanOrEqual(geometry.players[index - 1]!.bottom)
    }
  }
}
