import { expect, test, type Page } from '@playwright/test'

async function setupBoard(page: Page, missingMedia = false, currentGame = false) {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  await page.routeWebSocket(/\/hubs\//, (socket) =>
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) socket.send('{}\u001e')
    }),
  )
  let board = {
    gameId: 'draft-1',
    title: 'Вечерняя охота: испытания команды',
    status: 'draft',
    version: 7,
    rows: 5,
    cols: 5,
    rowLabels: ['100', '200', '300', '400', '500'],
    colLabels: ['Охота', 'Выживание', 'Команда', 'Трофеи', 'Финал'],
    cells: Array.from({ length: 25 }, (_, i) => ({
      id: 'cell-' + i,
      row: Math.floor(i / 5),
      col: i % 5,
      title: '',
      cost: 100,
      state: 'available',
      media:
        missingMedia && i === 0
          ? []
          : [{ id: 'media-' + i, url: '/fixture-card.svg', mimeType: 'image/svg+xml' }],
    })),
    enabledModifierIds: [],
    enabledQuestionIds: [],
    quizAnswerDurationSeconds: 60,
  }
  const publications: unknown[] = []
  let writes = 0
  await page.route('**/fixture-card.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#313e38"/><circle cx="100" cy="115" r="55" fill="#b69963"/><path d="M0 280 100 130 200 280" fill="#151f1b"/></svg>',
    }),
  )
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
            roles: ['viewer', 'admin'],
          },
        })
      if (path.includes('/negotiate'))
        return route.fulfill({
          json: {
            negotiateVersion: 1,
            connectionId: 'board',
            connectionToken: 'board',
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }],
          },
        })
      if (path === '/api/game' && currentGame)
        return route.fulfill({ json: { ...board, gameId: 'current-1', status: 'ready' } })
      if (path === '/api/game/setup') {
        if (route.request().method() === 'PUT') {
          const request = route.request().postDataJSON()
          writes++
          board = {
            ...board,
            ...request,
            version: board.version + 1,
            cells: request.cells.map((cell: { id: string }) => ({
              ...cell,
              state: 'available',
              media: board.cells.find((c) => c.id === cell.id)?.media ?? [],
            })),
          }
        }
        return route.fulfill({ json: board })
      }
      if (path === '/api/game/lifecycle/open-registration') {
        publications.push(route.request().postDataJSON())
        return route.fulfill({
          status: 409,
          json: { code: 'game_setup.stale_version', error: 'stale' },
        })
      }
      return route.fulfill({ status: 204 })
    },
  )
  return { publications, writes: () => writes, board: () => board }
}

for (const width of [390, 768, 1440]) {
  test('board readiness and separate consents at ' + width + 'px', async ({ page }, info) => {
    await page.setViewportSize({ width, height: 950 })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const server = await setupBoard(page)
    await page.goto('/panel/game-setup')
    await expect(page.getByRole('textbox', { name: 'Название игры' })).toHaveValue(
      'Вечерняя охота: испытания команды',
    )
    await expect(page.getByText('25 / 25', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Модификаторы', exact: true }).last(),
    ).toHaveAttribute('href', '/panel/admin-modifiers')
    await expect(page.getByRole('heading', { name: 'Игровая таблица' })).toHaveCount(0)
    for (const name of ['Подпись колонки 1', 'Подпись строки 1']) {
      const field = page.getByRole('textbox', { name, exact: true })
      const bounds = await field.locator('..').boundingBox()
      expect(bounds?.height).toBeLessThanOrEqual(48)
    }
    const cardField = await page
      .getByRole('textbox', { name: 'Стоимость карточки', exact: true })
      .first()
      .boundingBox()
    expect(cardField!.width).toBeGreaterThan(120)
    const statuses = await page.getByText('Черновик', { exact: true }).boundingBox()
    const title = await page.getByRole('textbox', { name: 'Название игры' }).boundingBox()
    expect(statuses!.y).toBeLessThan(title!.y)
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const boardRegion = page.getByRole('region', { name: 'Игровая таблица' })
    const initialTitleY = (await page
      .getByRole('textbox', { name: 'Название игры' })
      .boundingBox())!.y
    await boardRegion.evaluate((element) => {
      element.scrollTop = 250
    })
    expect(await boardRegion.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    expect((await page.getByRole('textbox', { name: 'Название игры' }).boundingBox())!.y).toBe(
      initialTitleY,
    )
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    await boardRegion.evaluate((element) => {
      element.scrollTop = 0
    })
    await page.screenshot({ path: info.outputPath('board.png'), fullPage: false })
    await page.getByRole('button', { name: 'Открыть регистрацию', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const confirm = dialog.getByRole('button', { name: 'Открыть регистрацию' })
    await expect(confirm).toBeDisabled()
    await dialog.getByRole('checkbox', { name: /без модификаторов/ }).check()
    await expect(confirm).toBeDisabled()
    await dialog.getByRole('checkbox', { name: /без вопросов/ }).check()
    await expect(confirm).toBeEnabled()
    await page.screenshot({ path: info.outputPath('consents.png'), fullPage: false })
    await confirm.click()
    await expect(dialog.getByText(/Черновик изменился после проверки/)).toBeVisible()
    await expect(dialog.getByRole('checkbox', { name: /без вопросов/ })).toBeChecked()
    expect(server.publications).toEqual([
      {
        gameId: 'draft-1',
        expectedVersion: 7,
        allowWithoutModifiers: true,
        allowWithoutQuestions: true,
      },
    ])
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await page.getByRole('button', { name: /Строки и колонки/ }).click()
    await expect(page.getByRole('combobox', { name: 'Действие' })).toContainText('Удалить')
    await expect(page.getByRole('combobox', { name: 'Объект' })).toContainText('Строка')
    await expect(page.getByRole('combobox', { name: 'Позиция' })).toContainText('500')
    await page.getByRole('combobox', { name: 'Действие' }).click()
    await page.getByRole('option', { name: 'Добавить', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Добавить', exact: true }).click()
    await expect.poll(server.writes).toBe(1)
    expect(server.board().rowLabels).toHaveLength(6)
    await expect(
      page.getByRole('button', { name: 'Открыть регистрацию', exact: true }),
    ).toBeDisabled()
    await page.getByRole('button', { name: /Строки и колонки/ }).click()
    await expect(page.getByRole('combobox', { name: 'Действие' })).toContainText('Удалить')
    await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click()
    await expect(page.getByRole('dialog').getByText(/карточки.*изображения/i)).toBeVisible()
    expect(server.writes()).toBe(1)
    await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click()
    await expect.poll(server.writes).toBe(2)
    expect(server.board().rowLabels).toHaveLength(5)
    expect(errors).toEqual([])
  })
}

test('one missing media file blocks publication', async ({ page }) => {
  const server = await setupBoard(page, true, true)
  await page.goto('/panel/game-setup')
  await expect(page.getByText(/Без медиа: 1/)).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Открыть регистрацию', exact: true }),
  ).toBeDisabled()
  expect(server.publications).toEqual([])
  const hint = page.getByRole('button', { name: 'Открыть регистрацию', exact: true }).locator('..')
  await hint.hover()
  await expect(page.getByRole('tooltip')).toContainText('Без медиа: 1')
  await expect(page.getByText(/Уже идёт регистрация или игра/)).toHaveCount(0)
  await page.mouse.move(0, 0)
  await hint.focus()
  await expect(page.getByRole('tooltip')).toContainText('Без медиа: 1')
})

test('card cost uses manual numeric input without increment controls', async ({ page }) => {
  const server = await setupBoard(page)
  await page.goto('/panel/game-setup')
  const cost = page.getByRole('textbox', { name: 'Стоимость карточки', exact: true }).first()
  await expect(cost).toHaveAttribute('inputmode', 'numeric')
  await expect(cost).toHaveAttribute('type', 'text')
  await cost.fill('230')
  await cost.press('ArrowUp')
  await expect(cost).toHaveValue('230')
  await cost.press('Tab')
  await expect.poll(() => server.board().cells[0]?.cost).toBe(230)
})

test('image click previews, and only explicit upload actions open the file chooser', async ({
  page,
}, info) => {
  await setupBoard(page, true)
  await page.goto('/panel/game-setup')
  let chooserCount = 0
  page.on('filechooser', () => chooserCount++)
  await page.getByText('Перетащите изображение или нажмите «Загрузить»').click()
  const preview = page.getByRole('button', { name: 'Открыть изображение', exact: true }).first()
  await preview.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('img')).toHaveAttribute('src', /fixture-card.svg/)
  await page.screenshot({ path: info.outputPath('image-preview.png'), animations: 'disabled' })
  expect(chooserCount).toBe(0)
  await page.keyboard.press('Escape')
  await expect(preview).toBeFocused()
  await preview.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Заменить', exact: true }).first().click()
  await chooser
  expect(chooserCount).toBe(1)
  const uploadChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Загрузить', exact: true }).click()
  await uploadChooser
  expect(chooserCount).toBe(2)
})

test('short desktop keeps both scroll areas reachable without moving the page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 600 })
  await setupBoard(page)
  await page.goto('/panel/game-setup')
  const open = page.getByRole('button', { name: 'Открыть регистрацию', exact: true })
  await open.scrollIntoViewIfNeeded()
  await expect(open).toBeInViewport()
  const board = page.getByRole('region', { name: 'Игровая таблица' })
  const y = (await open.boundingBox())!.y
  await board.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(
    page.getByRole('textbox', { name: 'Подпись строки 5', exact: true }),
  ).toBeInViewport()
  expect((await open.boundingBox())!.y).toBe(y)
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
})
