import { expect, test, type Page } from '@playwright/test'

async function mockAdmin(page: Page) {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
  await page.routeWebSocket(/\/hubs\//, (socket) =>
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) socket.send('{}\u001e')
    }),
  )
  const questions = Array.from({ length: 12 }, (_, i) => ({
    questionId: `question-${i}`,
    questionCode: `q-${i}`,
    categoryId: 'geography',
    categoryName: 'Geography',
    text: `Question ${i + 1}: a deliberately long description for a readable catalogue`,
    options: [
      { optionId: 'a', text: 'Warsaw', isCorrect: true, sortOrder: 0 },
      { optionId: 'b', text: 'Krakow', isCorrect: false, sortOrder: 1 },
    ],
    reward: 10,
    priority: 0,
    isEnabled: true,
    askedTotalCount: 2,
    submissionTotalCount: 5,
    correctSubmissionTotalCount: 3,
    correctPercentage: 60,
    lastAskedAtUtc: null,
  }))
  const modifiers = Array.from({ length: 9 }, (_, i) => ({
    id: `modifier-${i}`,
    category: 'round',
    name: `Night watch ${i + 1}`,
    description:
      'A long instruction for the host and the active team. Complete the round without changing equipment.',
    activationCost: 3,
    activationLimit: { count: 2 },
    conflictingModifierIds: [],
    iconEmoji: null,
    activationCommand: '!watch',
    isLockedByActiveGame: false,
    revision: 1,
    normalizedTags: ['team'],
    behaviorV2: {
      schemaVersion: 2,
      kind: 'rule',
      phase: 'round',
      performer: 'activeTeam',
      requiresHostMonitoring: false,
      rule: 'Complete the challenge.',
      stackingPolicy: 'aggregateParameters',
      resolution: { type: 'ruleStatus' },
      reward: 'none',
      formulaReference: null,
    },
  }))
  let setup = {
    gameId: 'draft',
    title: 'Night watch · September',
    status: 'draft',
    version: 1,
    rows: 2,
    cols: 2,
    rowLabels: ['100', '200'],
    colLabels: ['Hunt', 'Survive'],
    cells: Array.from({ length: 4 }, (_, i) => ({
      id: `cell-${i}`,
      row: Math.floor(i / 2),
      col: i % 2,
      title: `Challenge ${i + 1}`,
      cost: i < 2 ? 100 : 200,
      state: 'available',
      media: [],
    })),
    enabledModifierIds: ['modifier-0'],
    enabledQuestionIds: ['question-0'],
    quizAnswerDurationSeconds: 60,
  }
  let writes = 0
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
            connectionId: 'admin-test',
            connectionToken: 'admin-test',
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }],
          },
        })
      if (path === '/api/game/setup') {
        if (route.request().method() === 'PUT') {
          writes++
          const request = route.request().postDataJSON()
          setup = {
            ...setup,
            ...request,
            cells: request.cells.map((cell: object) => ({
              ...cell,
              media: [],
              state: 'available',
            })),
            version: setup.version + 1,
          }
        }
        return route.fulfill({ json: setup })
      }
      if (path === '/api/game/questions/categories')
        return route.fulfill({
          json: [
            {
              id: 'geography',
              name: 'Geography',
              questionCount: questions.length,
              isProtected: false,
            },
          ],
        })
      if (path === '/api/game/questions/catalog') return route.fulfill({ json: questions })
      if (path === '/api/game/modifiers/catalog') return route.fulfill({ json: modifiers })
      if (route.request().method() !== 'GET' && !path.includes('/negotiate'))
        return route.fulfill({ status: 409, json: { code: 'test.save_refused' } })
      return route.fulfill({ status: 204 })
    },
  )
  return { writes: () => writes }
}

for (const width of [320, 390, 768, 1440]) {
  test(`filled administration and catalogues at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const server = await mockAdmin(page)
    for (const path of [
      'game-setup',
      'admin-questions',
      'admin-modifiers',
      'catalog-questions',
      'catalog-modifiers',
    ]) {
      await page.goto(`/panel/${path}`)
      if (path === 'game-setup') {
        const name = page.getByRole('textbox', { name: 'Game name' })
        await expect(name).toHaveValue('Night watch · September')
        await name.fill('Night watch · reviewed')
        await name.press('Tab')
        await expect.poll(server.writes).toBeGreaterThan(0)
      } else if (path.includes('questions')) {
        await expect(
          page.getByText('Question 1: a deliberately long description for a readable catalogue', {
            exact: true,
          }),
        ).toBeVisible()
      } else if (path === 'admin-modifiers') {
        await expect(
          page.getByRole('checkbox', { name: 'Night watch 1 (3)', exact: true }),
        ).toBeChecked()
      } else {
        await expect(page.getByText('Night watch 1', { exact: true })).toBeVisible()
      }
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.screenshot({
        path: info.outputPath(`${path}.png`),
        fullPage: true,
        animations: 'disabled',
      })
      if (path === 'catalog-questions') {
        await page.getByRole('button', { name: 'Edit', exact: true }).first().click()
        const dialog = page.getByRole('dialog').first()
        await dialog.getByRole('textbox', { name: /^Question\s*\*?$/ }).fill('Unsaved question')
        await page.keyboard.press('Escape')
        const confirmation = page.getByRole('dialog').last()
        await expect(
          confirmation.getByRole('button', { name: 'Discard', exact: true }),
        ).toBeVisible()
        await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
        await expect(dialog.getByRole('textbox', { name: /^Question\s*\*?$/ })).toHaveValue(
          'Unsaved question',
        )
        await dialog.getByRole('button', { name: 'Save', exact: true }).click()
        await expect(dialog.getByRole('alert')).toBeVisible()
        await expect(dialog.getByRole('textbox', { name: /^Question\s*\*?$/ })).toHaveValue(
          'Unsaved question',
        )
        await page.screenshot({
          path: info.outputPath('question-save-error.png'),
          animations: 'disabled',
        })
      }
    }
    expect(errors).toEqual([])
  })
}

for (const width of [320, 390, 768, 1440]) {
  test(`independent role edits survive background refresh at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
    const users = ['Owner', 'First player', 'Second player with a long display name'].map(
      (displayName, i) => ({
        userId: `user-${i}`,
        displayName,
        twitchLogin: `player${i}`,
        roles: i === 0 ? ['viewer', 'admin', 'superadmin'] : ['viewer'],
        isActive: true,
        isPermanentSuperAdmin: i === 0,
      }),
    )
    let releaseFirst: (() => void) | undefined
    let failSecond = true
    let saves = 0
    await page.route(
      (url) =>
        url.pathname === '/auth/me' ||
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/hubs/'),
      async (route) => {
        const path = new URL(route.request().url()).pathname
        if (path === '/auth/me')
          return route.fulfill({
            json: {
              userId: 'abf3680b-ac92-43ce-8c4f-c542f806e520',
              displayName: 'Owner',
              roles: ['viewer', 'admin', 'superadmin'],
            },
          })
        if (path === '/api/admin/users')
          return route.fulfill({ json: { items: users, page: 1, pageSize: 25, totalCount: 3 } })
        if (path.endsWith('/roles')) {
          saves++
          if (path.includes('user-1'))
            await new Promise<void>((resolve) => {
              releaseFirst = resolve
            })
          if (path.includes('user-2') && failSecond) {
            failSecond = false
            return route.fulfill({ status: 409, json: { code: 'test.refused' } })
          }
          const user = users.find((user) => path.includes(user.userId))!
          user.roles = ['viewer', ...route.request().postDataJSON().roles]
          return route.fulfill({ json: user })
        }
        return route.fulfill({ status: 204 })
      },
    )
    await page.goto('/panel/role-administration')
    const row = (name: string) => page.getByRole('row', { name, exact: true })
    const owner = row('Owner'),
      first = row('First player'),
      second = row('Second player with a long display name')
    await expect(
      owner.getByRole('checkbox', { name: 'Super administrator', exact: true }),
    ).toBeDisabled()
    await first.getByRole('checkbox', { name: 'Moderator', exact: true }).check()
    await second.getByRole('checkbox', { name: 'Super administrator', exact: true }).check()
    await expect(second.getByRole('checkbox', { name: 'Administrator', exact: true })).toBeChecked()
    await page.setViewportSize({ width: width < 900 ? 1440 : 390, height: 1000 })
    await expect(first.getByRole('checkbox', { name: 'Moderator', exact: true })).toBeChecked()
    await expect(
      second.getByRole('checkbox', { name: 'Super administrator', exact: true }),
    ).toBeChecked()
    await page.setViewportSize({ width, height: 1000 })
    await first.getByRole('button', { name: 'Save roles', exact: true }).click()
    await expect(first.getByRole('button', { name: 'Save roles', exact: true })).toBeDisabled()
    await second.getByRole('button', { name: 'Save roles', exact: true }).click()
    await expect(second.getByRole('alert')).toBeVisible()
    await expect.poll(() => Boolean(releaseFirst)).toBe(true)
    releaseFirst!()
    await expect(first.getByRole('status')).toBeVisible()
    await expect(
      second.getByRole('checkbox', { name: 'Super administrator', exact: true }),
    ).toBeChecked()
    await second.getByRole('button', { name: 'Save roles', exact: true }).click()
    await expect(second.getByRole('status')).toBeVisible()
    expect(saves).toBe(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: info.outputPath('roles.png'),
      fullPage: true,
      animations: 'disabled',
    })
  })
}
