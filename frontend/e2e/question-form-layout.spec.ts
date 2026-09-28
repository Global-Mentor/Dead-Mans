import { expect, test, type Page } from '@playwright/test'

async function mockLocalUi(page: Page) {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  await page.routeWebSocket(/\/hubs\/game-board/, (socket) => {
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) socket.send('{}\u001e')
    })
  })
  await page.route(
    (url) =>
      url.pathname === '/auth/me' ||
      url.pathname.startsWith('/api/') ||
      url.pathname.includes('/negotiate'),
    async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'abf3680b-ac92-43ce-8c4f-c542f806e520',
            displayName: 'Administrator',
            roles: ['admin', 'viewer'],
          },
        })
      if (path.includes('/negotiate'))
        return route.fulfill({
          json: {
            connectionId: 'ui-layout',
            connectionToken: 'ui-layout',
            negotiateVersion: 1,
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
          },
        })
      if (path === '/api/game/questions/categories')
        return route.fulfill({
          json: [{ id: 'category', name: 'География', questionCount: 0, isProtected: false }],
        })
      if (path === '/api/game/questions/catalog') return route.fulfill({ json: [] })
      return route.fulfill({ status: 204 })
    },
  )
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`page status panels share the same position at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await mockLocalUi(page)
    let expected: { x: number; y: number; width: number } | undefined
    for (const path of ['game-board', 'game-application', 'game-modifiers', 'game-quiz']) {
      await page.goto(`/panel/${path}`)
      const panel = page.getByTestId('page-state-panel')
      await expect(panel).toBeVisible()
      await expect(panel.getByRole('progressbar')).toHaveCount(0)
      await page.evaluate(() => document.fonts.ready)
      const bounds = await panel.boundingBox()
      expect(bounds).not.toBeNull()
      if (!bounds) throw new Error('Status panel is not measurable')
      if (!expected) expected = bounds
      expect(Math.abs(bounds.x - expected.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(bounds.y - expected.y)).toBeLessThanOrEqual(1)
      expect(Math.abs(bounds.width - expected.width)).toBeLessThanOrEqual(1)
    }
  })

  test(`question form is compact and keeps the correct answer first at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport)
    await mockLocalUi(page)
    await page.goto('/panel/catalog-questions')
    const tools = page.getByTestId('catalog-tools').locator('summary')
    if (viewport.width < 1200) await tools.click()
    await page.getByRole('button', { name: 'Добавить вопрос', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('radio')).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Удалить неверный вариант 3', exact: true }).click()
    await expect(dialog.getByLabel('Неверный вариант 2', { exact: true })).toBeFocused()
    await dialog.getByRole('button', { name: 'Добавить вариант', exact: true }).click()
    await expect(dialog.getByLabel('Неверный вариант 3', { exact: true })).toBeFocused()
    await dialog.getByLabel(/^Вопрос\s*\*?$/).fill('Какой город является столицей Польши?')
    await dialog.getByLabel(/^Правильный ответ\s*\*?$/).fill('Варшава')
    for (const [index, text] of ['Краков', 'Гданьск', 'Вроцлав'].entries()) {
      await dialog.getByLabel(`Неверный вариант ${index + 1}`, { exact: true }).fill(text)
    }
    const add = dialog.getByRole('button', { name: 'Добавить вариант', exact: true })
    const remove = dialog.getByRole('button', { name: 'Удалить неверный вариант 3', exact: true })
    expect((await add.boundingBox())!.height).toBeLessThanOrEqual(40)
    expect((await remove.boundingBox())!.width).toBe(44)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: testInfo.outputPath(`question-form-${viewport.width}.png`),
      fullPage: true,
    })
    await remove.click()
    await expect(dialog.getByLabel('Неверный вариант 2', { exact: true })).toBeFocused()
    await add.click()
    await expect(dialog.getByLabel('Неверный вариант 3', { exact: true })).toBeFocused()
    await expect(dialog.getByLabel(/^Правильный ответ\s*\*?$/)).toHaveValue('Варшава')
    const overflow = await dialog.evaluate((element) => element.scrollWidth > element.clientWidth)
    expect(overflow).toBe(false)
  })
}
