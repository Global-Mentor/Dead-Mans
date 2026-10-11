import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

async function mockEmptyDatabase(page: Page, owner = true, locale = 'ru') {
  await page.addInitScript((language) => localStorage.setItem('i18nextLng', language), locale)
  await page.routeWebSocket(/\/hubs\//, (socket) =>
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) socket.send('{}\u001e')
    }),
  )
  await page.route(
    (url) =>
      url.pathname === '/auth/me' ||
      url.pathname.startsWith('/api/') ||
      url.pathname.includes('/negotiate'),
    async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'abf3680b-ac92-43ce-8c4f-c542f806e520',
            displayName: owner ? 'Owner' : 'Viewer',
            roles: owner ? ['viewer', 'moderator', 'admin', 'superadmin'] : ['viewer'],
          },
        })
      if (url.pathname.includes('/negotiate'))
        return route.fulfill({
          json: {
            negotiateVersion: 1,
            connectionId: 'empty-panel',
            connectionToken: 'empty-panel',
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }],
          },
        })
      if (url.pathname === '/api/admin/users')
        return route.fulfill({
          json: {
            items: [],
            page: 1,
            pageSize: Number(url.searchParams.get('pageSize') ?? 1),
            totalCount: 0,
            summary: { totalUsers: 0, loggedInUsers: 0, newUsers: 0 },
          },
        })
      if (url.pathname === '/api/game/modifiers/history')
        return route.fulfill({ json: { items: [], nextCursor: null } })
      if (url.pathname.endsWith('/integrations/twitch/status'))
        return route.fulfill({ json: { enabled: false } })
      if (
        url.pathname.endsWith('/catalog') ||
        url.pathname.endsWith('/categories') ||
        url.pathname.endsWith('/history/games') ||
        url.pathname.endsWith('/questions/available') ||
        url.pathname.endsWith('/notifications')
      )
        return route.fulfill({ json: [] })
      return route.fulfill({ status: 204 })
    },
  )
}

const emptyRoutes = [
  ['game-board', 'Игра пока не опубликована.'],
  ['game-round', 'Игра пока не опубликована.'],
  ['game-team-queue', 'Текущей игры пока нет.'],
  ['game-leaderboard', 'Результаты команд появятся после начала игры.'],
  ['game-history', 'История появится после завершения первой игры.'],
  ['game-application', 'Приём заявок закрыт.'],
  ['game-modifiers', 'Активной игры нет.'],
  ['game-quiz', 'Активной игры нет.'],
  ['game-setup', 'Сейчас нет игры в статусе черновика.'],
  ['admin-modifiers', 'Сейчас нет игры в статусе черновика.'],
  ['admin-questions', 'Сейчас нет игры в статусе черновика.'],
  ['team-registrations', 'Приём заявок команд пока не открыт.'],
  ['catalog-questions', 'Вопросов пока нет.'],
  ['catalog-modifiers', 'Модификаторов пока нет.'],
  ['modifier-history', 'История модификаторов'],
  ['role-administration', 'Пользователей пока нет.'],
] as const

for (const width of [390, 768, 1440]) {
  test(`empty panel routes remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await mockEmptyDatabase(page)
    let stateBounds: { x: number; y: number; width: number } | undefined
    for (const [route, message] of emptyRoutes) {
      await page.goto(`/panel/${route}`)
      await expect(page.getByRole('main')).toContainText(message)
      await expect(page.getByRole('main')).not.toContainText('Не удалось')
      await page.evaluate(() => document.fonts.ready)
      const panel = page.getByTestId('page-state-panel').first()
      await expect(panel).toBeVisible()
      await expect(panel.getByRole('heading', { level: 1 })).toHaveCount(1)
      const bounds = await panel.boundingBox()
      if (!bounds) throw new Error(`Missing state panel on ${route}`)
      stateBounds ??= bounds
      expect(
        Math.abs(bounds.x - stateBounds.x),
        `${route} horizontal placement`,
      ).toBeLessThanOrEqual(1)
      expect(Math.abs(bounds.y - stateBounds.y), `${route} vertical placement`).toBeLessThanOrEqual(
        1,
      )
      expect(
        Math.abs(bounds.width - stateBounds.width),
        `${route} state width`,
      ).toBeLessThanOrEqual(1)
      const titleSize = await panel
        .getByRole('heading', { level: 1 })
        .evaluate((title) => getComputedStyle(title).fontSize)
      expect(titleSize, `${route} title scale`).toBe('24px')
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        route,
      ).toBe(true)
      {
        await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveCount(1)
        if (route === 'game-history') {
          await expect(page.getByRole('textbox', { name: 'Поиск игр' })).toHaveCount(0)
          await expect(page.getByText(/Выберите завершённую игру/)).toHaveCount(0)
        }
        if (route.startsWith('admin-')) {
          await expect(
            page.getByRole('link', { name: 'Настройка доски', exact: true }),
          ).toHaveAttribute('href', '/panel/game-setup')
        }
        await page.screenshot({
          path: path.resolve(
            import.meta.dirname,
            '../../.tmp/agent-work/empty-states',
            `${route}-${width}.png`,
          ),
        })
      }
    }
    expect(errors).toEqual([])
  })
}

test('empty setup keeps creation reachable without duplicate prompts', async ({ page }) => {
  await mockEmptyDatabase(page)
  await page.goto('/panel/admin-questions')
  await page.getByRole('link', { name: 'Настройка доски', exact: true }).click()
  await expect(page).toHaveURL(/\/panel\/game-setup$/)
  await page.getByRole('button', { name: 'Создать игру', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Название игры' })).toBeFocused()
  await page.getByRole('button', { name: 'Назад', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Создать игру', exact: true })).toBeVisible()
  await expect(page.getByText('Черновика пока нет', { exact: true })).toHaveCount(0)
})

for (const width of [390, 1440]) {
  test(`catalog loading, error and empty states keep the same layout at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 600 })
    await mockEmptyDatabase(page)
    let finishLoading = () => {}
    const loading = new Promise<void>((resolve) => {
      finishLoading = resolve
    })
    let failed = true
    await page.route(
      (url) => url.pathname === '/api/game/questions/catalog',
      async (route) => {
        await loading
        await route.fulfill(failed ? { status: 503 } : { json: [] })
      },
    )
    await page.goto('/panel/catalog-questions')
    const panel = page.getByTestId('page-state-panel')
    await expect(panel.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(panel.getByRole('progressbar')).toHaveCount(1)
    const initial = await panel.boundingBox()
    if (!initial) throw new Error('Missing loading panel')
    finishLoading()
    await expect(panel.getByRole('alert')).toBeVisible()
    failed = false
    await panel.getByRole('button', { name: 'Повторить', exact: true }).click()
    await expect(panel).toContainText('Вопросов пока нет. Добавьте первый.')
    const final = await panel.boundingBox()
    if (!final) throw new Error('Missing empty panel')
    expect(Math.abs(final.x - initial.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(final.y - initial.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(final.width - initial.width)).toBeLessThanOrEqual(1)
    await expect(page.getByRole('textbox', { name: 'Поиск вопросов' })).toHaveCount(0)
    const actions = panel.getByRole('button', { name: 'Изменение категории', exact: true })
    await expect(actions).toBeVisible()
    expect(
      await actions.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        const region = element.closest('[role="group"]')
        return !region || bounds.bottom <= region.getBoundingClientRect().bottom
      }),
    ).toBe(true)
  })
}

test('a failed history request remains an error and can be retried to an empty state', async ({
  page,
}) => {
  await mockEmptyDatabase(page)
  let failed = true
  await page.route('**/api/game/history/games', (route) =>
    failed ? route.fulfill({ status: 503 }) : route.fulfill({ json: [] }),
  )
  await page.goto('/panel/game-history')
  await expect(page.getByRole('main')).toContainText('Не удалось загрузить архив игр.')
  await expect(page.getByText(/История появится после завершения/)).toHaveCount(0)
  failed = false
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(page.getByRole('main')).toContainText(
    'История появится после завершения первой игры.',
  )
})

for (const route of ['game-setup', 'admin-modifiers', 'admin-questions']) {
  test(`draft loading can fail again and recover through retry on ${route}`, async ({ page }) => {
    await mockEmptyDatabase(page)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    let failed = true
    await page.route('**/api/game/setup', (request) =>
      request.fulfill(failed ? { status: 503 } : { status: 204 }),
    )
    await page.goto(`/panel/${route}`)
    const retry = page.getByRole('button', { name: 'Повторить', exact: true })
    await expect(retry).toBeVisible()
    const failedRetry = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/game/setup' && response.status() === 503,
    )
    await retry.click()
    await failedRetry
    await expect(retry).toBeVisible()
    failed = false
    await retry.click()
    await expect(page.getByTestId('page-state-panel')).toContainText(
      'Сейчас нет игры в статусе черновика.',
    )
    expect(errors).toEqual([])
  })
}

for (const [locale, message] of [
  ['en', 'History will appear after the first game finishes.'],
  ['ru', 'История появится после завершения первой игры.'],
  ['uk', 'Історія з’явиться після завершення першої гри.'],
  ['pl', 'Historia pojawi się po zakończeniu pierwszej gry.'],
] as const) {
  test(`empty history has a localized title for a viewer in ${locale}`, async ({ page }) => {
    await mockEmptyDatabase(page, false, locale)
    await page.goto('/panel/game-history')
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByTestId('page-state-panel')).not.toContainText(
      /gameHistory\.|navigation\./,
    )
    await expect(page.getByTestId('page-state-panel')).toContainText(message)
    await expect(page.getByRole('button', { name: 'Администрирование' })).toHaveCount(0)
  })
}
