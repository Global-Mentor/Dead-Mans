import { expect, type Page } from '@playwright/test'

export async function expectPanelPageInsets(page: Page) {
  const geometry = await page.locator('main').evaluate((main) => {
    const style = getComputedStyle(main)
    const shell = main.firstElementChild
    if (!shell) throw new Error('Expected a populated page shell')
    const shellStyle = getComputedStyle(shell)
    const mainBounds = main.getBoundingClientRect()
    const shellBounds = shell.getBoundingClientRect()
    return {
      expected: innerWidth < 600 ? 12 : 16,
      insets: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map(
        Number.parseFloat,
      ),
      shellInsets: [shellStyle.paddingLeft, shellStyle.paddingRight, shellStyle.paddingBottom].map(
        Number.parseFloat,
      ),
      centerOffset: shellBounds.x + shellBounds.width / 2 - mainBounds.x - mainBounds.width / 2,
    }
  })
  expect(geometry.insets).toEqual(Array(4).fill(geometry.expected))
  expect(geometry.shellInsets).toEqual([0, 0, 0])
  expect(Math.abs(geometry.centerOffset)).toBeLessThanOrEqual(1)
  for (const title of await page.getByRole('main').getByRole('heading', { level: 1 }).all()) {
    await expect(title).toHaveCSS('font-size', '24px')
  }
}
