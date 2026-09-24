import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

test.beforeAll(async () => {
  await mkdir('../.tmp/header-design', { recursive: true })
})

test('round navigation is translated before any board bundle is loaded', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  await page.route(
    (url) => url.pathname === '/auth/me' || url.pathname.startsWith('/api/'),
    (route) =>
      route.fulfill(
        new URL(route.request().url()).pathname === '/auth/me'
          ? {
              json: {
                userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
                displayName: 'Охотник',
                roles: ['viewer'],
              },
            }
          : { status: 204 },
      ),
  )
  await page.goto('/panel/game-application')
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Текущий раунд', exact: true }),
  ).toHaveAttribute('href', '/panel/game-round')
})

for (const width of [320, 390, 768, 1200, 1440, 1920]) {
  test(`header navigation stays usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
    await page.route(
      (url) => url.pathname === '/auth/me' || url.pathname.startsWith('/api/'),
      async (route) => {
        const path = new URL(route.request().url()).pathname
        await route.fulfill(
          path === '/auth/me'
            ? {
                json: {
                  userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
                  displayName: 'EdiLarios',
                  roles: ['admin', 'viewer'],
                },
              }
            : { status: 204 },
        )
      },
    )
    await page.goto('/panel/game-board')
    const header = page.getByRole('banner')
    await expect(header).toBeVisible()
    const compact = width < 1200
    if (!compact) {
      const navigation = header.getByRole('navigation', { name: 'Основная навигация' })
      const navigationBox = await navigation.boundingBox()
      expect(Math.abs(navigationBox!.x + navigationBox!.width / 2 - width / 2)).toBeLessThan(1)
      await expect(navigation.getByRole('link').nth(0)).toHaveText('Доска')
      await expect(navigation.getByRole('link').nth(1)).toHaveText('Текущий раунд')
    }
    const headerBox = await header.boundingBox()
    expect(headerBox?.height).toBeLessThanOrEqual(compact ? 51 : 59)
    const controls = header.locator('a:visible, button:visible')
    const boxes = await controls.evaluateAll((elements) =>
      elements.map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect()
        return { x, y, width, height }
      }),
    )
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
    for (let index = 1; index < boxes.length; index++) {
      expect(boxes[index].x).toBeGreaterThanOrEqual(boxes[index - 1].x + boxes[index - 1].width - 1)
    }
    await expect(page.getByText('Игровое поле сейчас недоступно.')).toBeVisible()
    await header.screenshot({
      path: `../.tmp/header-design/header-${width}.png`,
      animations: 'disabled',
    })
    const trigger = header.getByRole('button', {
      name: compact ? 'Открыть навигацию' : 'История',
      exact: true,
    })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const history = page.getByRole('menuitem', { name: 'История игр', exact: true })
    await expect(history).toBeVisible()
    if (compact) {
      await expect(page.getByRole('menuitem', { name: 'Доска', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      )
      await expect(page.getByRole('menuitem').nth(1)).toHaveText('Текущий раунд')
      await page.screenshot({
        path: `../.tmp/header-design/menu-${width}.png`,
        animations: 'disabled',
      })
    }
    await history.click()
    await expect(page).toHaveURL(/\/panel\/game-history$/)
    await expect(page.getByRole('menu')).toHaveCount(0)
    if (compact) await expect(trigger).toContainText('История игр')
    await header.getByRole('button', { name: 'Администрирование', exact: true }).click()
    await expect(page.getByRole('menuitem', { name: 'Команды', exact: true })).toBeVisible()
    await page.getByRole('menu').screenshot({
      path: `../.tmp/header-design/administration-${width}.png`,
      animations: 'disabled',
    })
    await page.keyboard.press('Escape')
    await expect(
      header.getByRole('button', { name: 'Администрирование', exact: true }),
    ).toBeFocused()
    await header.getByRole('button', { name: 'Открыть уведомления' }).click()
    const notificationBox = await page.getByRole('menu').boundingBox()
    expect(notificationBox!.x).toBeGreaterThanOrEqual(0)
    expect(notificationBox!.x + notificationBox!.width).toBeLessThanOrEqual(width)
    await page.keyboard.press('Escape')
    await header.getByRole('button', { name: 'EdiLarios', exact: true }).click()
    await expect(page.getByRole('menuitem', { name: 'Выйти' })).toBeVisible()
    await page.keyboard.press('Escape')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
