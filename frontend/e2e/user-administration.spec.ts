import { expect, test, type Page } from '@playwright/test'

async function mockUsers(page: Page, beforeList?: (query: URLSearchParams) => Promise<void>) {
  const users = Array.from({ length: 76 }, (_, i) => ({
    userId: String(i),
    displayName:
      i === 0 ? 'Очень длинное имя администратора' : 'Игрок ' + String(i).padStart(2, '0'),
    twitchLogin: 'hidden_login_' + String(i).padStart(2, '0'),
    isActive: i % 7 !== 0,
    roles:
      i === 0
        ? ['viewer', 'moderator', 'admin', 'superadmin']
        : i % 8 === 2
          ? ['viewer', 'moderator', 'admin']
          : i % 4 === 0
            ? ['viewer', 'moderator']
            : ['viewer'],
    isPermanentSuperAdmin: i === 0,
    createdAtUtc: '2026-10-05T12:00:00Z',
    lastLoginAtUtc: i % 2 === 0 ? '2026-10-06T12:00:00Z' : null,
  }))
  const requests: URLSearchParams[] = []
  await page.routeWebSocket(/\/hubs\/game-board(?:\?|$)/, (socket) =>
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) socket.send('{}\u001e')
    }),
  )
  await page.route(
    (url) =>
      url.pathname === '/auth/me' ||
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/hubs/'),
    async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'abf3680b-ac92-43ce-8c4f-c542f806e520',
            displayName: 'Owner',
            roles: ['viewer', 'moderator', 'admin', 'superadmin'],
          },
        })
      if (url.pathname.endsWith('/access') && route.request().method() === 'PUT') {
        const user = users.find((user) => user.userId === url.pathname.split('/').at(-2))
        if (!user)
          return route.fulfill({
            status: 404,
            json: { code: 'role_administration.user_not_found', error: 'not found' },
          })
        user.isActive = route.request().postDataJSON().isActive
        return route.fulfill({ json: user })
      }
      if (url.pathname === '/api/admin/users') {
        const query = url.searchParams
        requests.push(query)
        await beforeList?.(query)
        let items = users.filter(
          (user) =>
            !query.get('search') ||
            [user.displayName, user.twitchLogin].some((value) =>
              value.toLowerCase().includes(query.get('search')!.toLowerCase()),
            ),
        )
        if (query.has('hasLoggedIn'))
          items = items.filter(
            (user) => Boolean(user.lastLoginAtUtc) === (query.get('hasLoggedIn') === 'true'),
          )
        if (query.has('isActive'))
          items = items.filter((user) => user.isActive === (query.get('isActive') === 'true'))
        if (query.has('role'))
          items = items.filter((user) => user.roles.includes(query.get('role')!))
        if (query.get('sort') === 'roleDesc' || query.get('sort') === 'roleAsc') {
          const rank = (user: (typeof users)[number]) =>
            ['viewer', 'moderator', 'admin', 'superadmin'].findLastIndex((role) =>
              user.roles.includes(role),
            )
          const direction = query.get('sort') === 'roleDesc' ? -1 : 1
          items.sort((a, b) => direction * (rank(a) - rank(b)))
        }
        const pageSize = Number(query.get('pageSize') || 25)
        const pageNumber = Math.min(
          Number(query.get('page') || 1),
          Math.max(1, Math.ceil(items.length / pageSize)),
        )
        return route.fulfill({
          json: {
            items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
            page: pageNumber,
            pageSize,
            totalCount: items.length,
            summary: {
              totalUsers: users.length,
              loggedInUsers: users.filter((user) => user.lastLoginAtUtc).length,
              newUsers: users.length,
            },
          },
        })
      }
      return route.fulfill({ status: 204 })
    },
  )
  return { requests, users }
}
for (const { width, height } of [
  { width: 390, height: 1000 },
  { width: 768, height: 1000 },
  { width: 1440, height: 1000 },
  { width: 390, height: 600 },
  { width: 320, height: 700 },
  { width: 1440, height: 720 },
]) {
  test(
    'user registry filters and numbered pages at ' + width + 'x' + height,
    async ({ page }, info) => {
      await page.setViewportSize({ width, height })
      await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
      const { requests } = await mockUsers(page)
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto('/panel/role-administration')
      await expect(
        page.getByRole('table', { name: 'Роли пользователей', exact: true }),
      ).toBeVisible()
      const pages = page.getByRole('navigation', { name: 'Страницы пользователей' })
      if (height >= 720)
        await expect.poll(() => Number(requests.at(-1)?.get('pageSize'))).toBeGreaterThan(1)
      await pages.getByRole('button', { name: 'Страница 2', exact: true }).click()
      await expect(pages.getByRole('button', { name: 'Страница 2', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      )
      await pages.getByRole('button', { name: 'Далее', exact: true }).click()
      const pageSize = Number(requests.at(-1)?.get('pageSize'))
      await expect(
        page.getByRole('row', {
          name: 'Игрок ' + String(pageSize * 2).padStart(2, '0'),
          exact: true,
        }),
      ).toBeVisible()
      await expect(pages.getByRole('button', { name: 'Страница 3', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      )
      await page.getByRole('combobox', { name: 'Вход в приложение' }).click()
      await page.getByRole('option', { name: 'Не входили', exact: true }).click()
      await expect(page.getByRole('row', { name: 'Игрок 01', exact: true })).toBeVisible()
      await expect.poll(() => requests.at(-1)?.get('page')).toBe('1')
      await expect.poll(() => requests.at(-1)?.get('hasLoggedIn')).toBe('false')
      await expect(
        page.getByRole('row', { name: 'Игрок 01', exact: true }).getByText('Не входил'),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Сбросить' }).click()
      await page.getByRole('combobox', { name: 'Доступ' }).click()
      await page.getByRole('option', { name: 'Заблокирован', exact: true }).click()
      await expect.poll(() => requests.at(-1)?.get('isActive')).toBe('false')
      await expect(page.getByRole('row', { name: 'Игрок 01', exact: true })).toHaveCount(0)
      await page.getByRole('button', { name: 'Сбросить' }).click()
      await page.getByRole('textbox', { name: 'Имя или Twitch-логин' }).fill('hidden_login_02')
      await expect(page.getByRole('row', { name: 'Игрок 02', exact: true })).toBeVisible()
      await expect.poll(() => requests.at(-1)?.get('search')).toBe('hidden_login_02')
      await expect(page.getByRole('row', { name: 'Игрок 01', exact: true })).toHaveCount(0)
      await page.getByRole('button', { name: 'Сбросить' }).click()
      await page.getByRole('button', { name: 'Последний вход', exact: true }).click()
      await expect.poll(() => requests.at(-1)?.get('sort')).toBe('lastLoginDesc')
      await expect
        .poll(() =>
          page.evaluate(() => {
            const frame = document.querySelector('[data-user-list]')!
            const last = document.querySelector('tbody tr:last-child')!
            return (
              document.documentElement.scrollWidth <= innerWidth &&
              document.documentElement.scrollHeight <= innerHeight + 1 &&
              frame.getBoundingClientRect().bottom <=
                frame.parentElement!.getBoundingClientRect().bottom + 1 &&
              last.getBoundingClientRect().bottom <= innerHeight
            )
          }),
        )
        .toBe(true)
      const row = page.locator('tbody tr').first()
      const actionsCellBox = (await row.getByRole('cell').last().boundingBox())!
      const rowBox = (await row.boundingBox())!
      expect(rowBox.x + rowBox.width - actionsCellBox.x - actionsCellBox.width).toBeLessThanOrEqual(
        17,
      )
      if (width >= 900) {
        await expect(page.getByRole('columnheader')).toHaveText([
          'Пользователь',
          'Роли',
          'В системе с',
          'Последний вход',
          'Доступ',
          'Действия',
        ])
        expect(
          await page
            .locator('thead th, tbody td')
            .evaluateAll((cells) =>
              cells.every((cell) => getComputedStyle(cell).textAlign === 'center'),
            ),
        ).toBe(true)
      }
      await page.screenshot({
        path: info.outputPath('users.png'),
        fullPage: true,
        animations: 'disabled',
      })
      const count = Math.ceil(76 / Number(requests.at(-1)?.get('pageSize')))
      await pages.getByRole('button', { name: 'Страница ' + count, exact: true }).click()
      await expect(page.getByRole('row', { name: 'Игрок 75', exact: true })).toBeVisible()
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1))
        .toBe(true)
      await page.screenshot({
        path: info.outputPath('last-page.png'),
        fullPage: true,
        animations: 'disabled',
      })
      expect(errors).toEqual([])
    },
  )
}

test('new chat identities appear on automatic refresh', async ({ page }) => {
  await page.clock.install()
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  const { users } = await mockUsers(page)
  await page.goto('/panel/role-administration')
  await expect(
    page.getByRole('group', { name: 'Всего', exact: true }).getByText('76', { exact: true }),
  ).toBeVisible()
  users.unshift({
    ...users[0]!,
    userId: 'new-chat-user',
    displayName: 'Новый зритель',
    twitchLogin: 'new_chatter',
    roles: ['viewer'],
    isActive: true,
    isPermanentSuperAdmin: false,
    lastLoginAtUtc: null,
  })
  await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/users'),
    page.clock.runFor(31_000),
  ])
  await expect(page.getByRole('row', { name: 'Новый зритель', exact: true })).toBeVisible()
  await expect(
    page.getByRole('group', { name: 'Всего', exact: true }).getByText('77', { exact: true }),
  ).toBeVisible()
})

test('resizing keeps the current records reachable without vertical scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  const { requests } = await mockUsers(page)
  await page.goto('/panel/role-administration')
  await expect.poll(() => Number(requests.at(-1)?.get('pageSize'))).toBeGreaterThan(1)
  const pages = page.getByRole('navigation', { name: 'Страницы пользователей' })
  await pages.getByRole('button', { name: 'Страница 3', exact: true }).click()
  await expect(pages.getByRole('button', { name: 'Страница 3', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  const anchor = (await page.locator('tbody tr').first().getAttribute('aria-label'))!
  const size = Number(requests.at(-1)?.get('pageSize'))
  await page.setViewportSize({ width: 390, height: 600 })
  await expect.poll(() => Number(requests.at(-1)?.get('pageSize'))).toBeLessThan(size)
  await expect(page.getByRole('row', { name: anchor, exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(
    true,
  )
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect.poll(() => page.locator('tbody tr').count()).toBeGreaterThan(1)
  await expect(page.getByRole('row', { name: anchor, exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(
    true,
  )
})

for (const language of ['pl', 'uk']) {
  test('translated registry fits a narrow screen in ' + language, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 700 })
    await page.addInitScript((language) => localStorage.setItem('i18nextLng', language), language)
    await mockUsers(page)
    await page.goto('/panel/role-administration')
    await expect(page.getByRole('table')).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollHeight <= innerHeight + 1 &&
            document.documentElement.scrollWidth <= innerWidth,
        ),
      )
      .toBe(true)
    await page.screenshot({
      path: info.outputPath('users-' + language + '.png'),
      fullPage: true,
      animations: 'disabled',
    })
  })
}

for (const width of [390, 768, 1440]) {
  test('block and unblock with confirmation at ' + width, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
    await mockUsers(page)
    await page.goto('/panel/role-administration')
    const row = page.getByRole('row', { name: 'Игрок 01', exact: true })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Заблокировать: Игрок 01', exact: true }).click()
    const confirmation = page.getByRole('dialog', { name: 'Заблокировать Игрок 01?' })
    await expect(confirmation).toBeVisible()
    await page.screenshot({
      path: info.outputPath('block-confirmation.png'),
      animations: 'disabled',
    })
    await confirmation.getByRole('button', { name: 'Отмена' }).click()
    await expect(confirmation).toBeHidden()
    await row.getByRole('button', { name: 'Заблокировать: Игрок 01', exact: true }).click()
    await confirmation.getByRole('button', { name: 'Заблокировать', exact: true }).click()
    await expect(confirmation).toBeHidden()
    await expect(row.getByText('Заблокирован', { exact: true })).toBeVisible()
    await row.getByRole('button', { name: 'Разблокировать: Игрок 01', exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Разблокировать Игрок 01?' })
      .getByRole('button', { name: 'Разблокировать', exact: true })
      .click()
    await expect(row.getByText('Разрешён', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: info.outputPath('access-actions.png'),
      animations: 'disabled',
      fullPage: true,
    })
  })
}

for (const width of [390, 768, 1440]) {
  test('sort users by highest role at ' + width, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
    const { requests, users } = await mockUsers(page)
    await page.goto('/panel/role-administration')
    await expect(page.getByRole('row', { name: users[0].displayName, exact: true })).toBeVisible()
    const pages = page.getByRole('navigation', { name: 'Страницы пользователей' })
    await pages.getByRole('button', { name: 'Страница 2', exact: true }).click()
    await expect.poll(() => requests.at(-1)?.get('page')).toBe('2')
    const roleHeader = page.getByRole('columnheader', { name: 'Роли', exact: true })
    const rank = (user: (typeof users)[number]) =>
      ['viewer', 'moderator', 'admin', 'superadmin'].findLastIndex((role) =>
        user.roles.includes(role),
      )
    for (const sort of ['roleDesc', 'roleAsc']) {
      await roleHeader.getByRole('button', { name: 'Роли', exact: true }).click()
      await expect.poll(() => requests.at(-1)?.get('sort')).toBe(sort)
      await expect.poll(() => requests.at(-1)?.get('page')).toBe('1')
      await expect(roleHeader).toHaveAttribute(
        'aria-sort',
        sort === 'roleDesc' ? 'descending' : 'ascending',
      )
      const expected = [...users].sort(
        (a, b) => (sort === 'roleDesc' ? -1 : 1) * (rank(a) - rank(b)),
      )
      const rowNames = () =>
        page
          .locator('tbody tr')
          .evaluateAll((rows) => rows.map((row) => row.getAttribute('aria-label')))
      await expect
        .poll(rowNames)
        .toEqual(
          expected
            .slice(0, Number(requests.at(-1)?.get('pageSize')))
            .map((user) => user.displayName),
        )
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      ).toBe(true)
      await page.screenshot({
        path: info.outputPath(sort + '.png'),
        animations: 'disabled',
        fullPage: true,
      })
      await pages.getByRole('button', { name: 'Страница 2', exact: true }).click()
      await expect.poll(() => requests.at(-1)?.get('page')).toBe('2')
      const size = Number(requests.at(-1)?.get('pageSize'))
      await expect
        .poll(rowNames)
        .toEqual(expected.slice(size, size * 2).map((user) => user.displayName))
    }
  })
}

for (const width of [390, 768, 1440]) {
  test(
    'filters retain the table and layout during slow requests at ' + width,
    async ({ page }, info) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
      let pending: Promise<void> | undefined
      const { requests } = await mockUsers(page, async () => {
        await pending
      })
      await page.goto('/panel/role-administration')
      const table = page.getByRole('table', { name: 'Роли пользователей', exact: true })
      const list = page.locator('[data-user-list]')
      const search = page.getByRole('textbox', { name: 'Имя или Twitch-логин' })
      const pagination = page.getByRole('navigation', { name: 'Страницы пользователей' })
      await expect.poll(() => Number(requests.at(-1)?.get('pageSize'))).toBeGreaterThan(1)
      await expect(list).toHaveAttribute('aria-busy', 'false')
      await table.evaluate((element) => element.setAttribute('data-retained', 'true'))
      const position = async () => ({
        tableTop: (await table.boundingBox())?.y,
        searchTop: (await search.boundingBox())?.y,
        paginationTop: (await pagination.boundingBox())?.y,
      })
      const actions = [
        async () => {
          await page.getByRole('combobox', { name: 'Доступ' }).click()
          await page.getByRole('option', { name: 'Разрешён', exact: true }).click()
        },
        async () => {
          await page
            .getByRole('columnheader', { name: 'Роли', exact: true })
            .getByRole('button')
            .click()
        },
        async () => {
          await pagination.getByRole('button', { name: 'Страница 2', exact: true }).click()
        },
        async () => {
          await search.fill('hidden_login_01')
        },
      ]
      for (const [index, action] of actions.entries()) {
        const before = await position()
        const beforeRows = await page.locator('tbody tr').allTextContents()
        const requestCount = requests.length
        let release = () => {}
        pending = new Promise<void>((resolve) => {
          release = resolve
        })
        try {
          await action()
          await expect.poll(() => requests.length).toBeGreaterThan(requestCount)
          await expect(list).toHaveAttribute('aria-busy', 'true')
          await expect(table).toHaveAttribute('data-retained', 'true')
          await expect(page.getByText('Загрузка пользователей...', { exact: true })).toHaveCount(0)
          expect(await page.locator('tbody tr').allTextContents()).toEqual(beforeRows)
          expect(await position()).toEqual(before)
          await expect(
            pagination.getByRole('button', { name: 'Страница 1', exact: true }),
          ).toBeDisabled()
          if (index === 0)
            await page.screenshot({
              path: info.outputPath('filter-pending.png'),
              animations: 'disabled',
              fullPage: true,
            })
        } finally {
          pending = undefined
          release()
        }
        await expect(list).toHaveAttribute('aria-busy', 'false')
        await expect(table).toHaveAttribute('data-retained', 'true')
        expect(await position()).toEqual(before)
      }
      await expect(page.getByRole('row', { name: 'Игрок 01', exact: true })).toBeVisible()
      await expect(page.locator('tbody tr')).toHaveCount(1)
      await page.screenshot({
        path: info.outputPath('filter-complete.png'),
        animations: 'disabled',
        fullPage: true,
      })
    },
  )
}

for (const viewport of [
  { width: 390, height: 1000 },
  { width: 768, height: 1000 },
  { width: 1440, height: 1000 },
  { width: 1569, height: 1244 },
]) {
  test(
    'cached access filters keep empty and populated layouts stable at ' + viewport.width,
    async ({ page }, info) => {
      await page.setViewportSize(viewport)
      await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
      const { users, requests } = await mockUsers(page)
      users.length = 13
      users.forEach((user) => {
        user.isActive = true
      })
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto('/panel/role-administration')
      const table = page.getByRole('table', { name: 'Роли пользователей', exact: true })
      const list = page.locator('[data-user-list]')
      const access = page.getByRole('combobox', { name: 'Доступ' })
      await expect.poll(() => Number(requests.at(-1)?.get('pageSize'))).toBeGreaterThan(1)
      await expect(list).toHaveAttribute('aria-busy', 'false')
      await table.evaluate((element) => element.setAttribute('data-retained', 'true'))
      const before = await list.boundingBox()
      const capacity = requests.at(-1)?.get('pageSize')
      for (let repetition = 0; repetition < 3; repetition++) {
        for (const label of ['Заблокирован', 'Разрешён']) {
          await access.click()
          expect(await list.boundingBox()).toEqual(before)
          await page.getByRole('option', { name: label, exact: true }).click()
          await expect(list).toHaveAttribute('aria-busy', 'false')
          if (label === 'Заблокирован') {
            await expect(
              page.getByText('Нет пользователей по выбранным фильтрам.', { exact: true }),
            ).toBeVisible()
            await expect(page.locator('tbody tr[aria-label]')).toHaveCount(0)
          } else {
            await expect(page.locator('tbody tr[aria-label]').first()).toBeVisible()
            await expect(
              page.getByText('Нет пользователей по выбранным фильтрам.', { exact: true }),
            ).toHaveCount(0)
          }
          await expect(table).toHaveAttribute('data-retained', 'true')
          expect(await list.boundingBox()).toEqual(before)
          expect(requests.at(-1)?.get('pageSize')).toBe(capacity)
          expect(errors).toEqual([])
          if (repetition === 0)
            await page.screenshot({
              path: info.outputPath(
                label === 'Заблокирован' ? 'empty-access.png' : 'allowed-access.png',
              ),
              animations: 'disabled',
              fullPage: true,
            })
        }
      }
    },
  )
}
