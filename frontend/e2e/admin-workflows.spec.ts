import { expect, test, type Page } from '@playwright/test'

async function mockAdmin(page: Page, roles = ['viewer', 'admin'], locale = 'en') {
  await page.addInitScript((language) => localStorage.setItem('i18nextLng', language), locale)
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
    twitchCompatible: true,
    askedTotalCount: 2,
    submissionTotalCount: 5,
    correctSubmissionTotalCount: 3,
    correctPercentage: 60,
    lastAskedAtUtc: null,
  }))
  const modifiers = Array.from({ length: 9 }, (_, i) => ({
    id: `modifier-${i}`,
    category: ['preparation', 'round', 'result'][i % 3],
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
  let refuseSave = false
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
            roles,
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
          if (refuseSave) return route.fulfill({ status: 503, json: { code: 'test.save_refused' } })
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
  return {
    questions,
    modifiers,
    questionIds: () => setup.enabledQuestionIds,
    duration: () => setup.quizAnswerDurationSeconds,
    writes: () => writes,
    enabledIds: () => setup.enabledModifierIds,
    refuseSave: (value: boolean) => {
      refuseSave = value
    },
  }
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
          page.getByRole('checkbox', { name: 'Include Night watch 1 in the game', exact: true }),
        ).toBeChecked()
      } else {
        await expect(
          page.getByTestId('modifier-catalog-list').getByText('Night watch 1', { exact: true }),
        ).toBeVisible()
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
      if (path === 'catalog-modifiers' && (width === 390 || width === 768)) {
        await page.getByRole('button', { name: 'Night watch 1', exact: true }).click()
        await page.getByRole('button', { name: 'Edit', exact: true }).first().click()
        const dialog = page.getByRole('dialog').first()
        await expect(dialog).toBeVisible()
        const bounds = await dialog.boundingBox()
        expect(bounds).not.toBeNull()
        expect(bounds!.x).toBeGreaterThanOrEqual(0)
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
        await page.screenshot({
          path: info.outputPath('modifier-editor.png'),
          animations: 'disabled',
        })
      }
    }
    expect(errors).toEqual([])
  })
}

for (const width of [320, 390, 768, 1440]) {
  test(`role editor preserves drafts, failures and busy state at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
    const users = ['Owner', 'First player', 'Second player with a long display name'].map(
      (displayName, i) => ({
        userId: `user-${i}`,
        displayName,
        twitchLogin: `player${i}`,
        roles: i === 0 ? ['viewer', 'moderator', 'admin', 'superadmin'] : ['viewer'],
        isActive: true,
        isPermanentSuperAdmin: i === 0,
        createdAtUtc: '2026-09-01T12:00:00Z',
        lastLoginAtUtc: i === 2 ? null : '2026-10-05T12:00:00Z',
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
              roles: ['viewer', 'moderator', 'admin', 'superadmin'],
            },
          })
        if (path === '/api/admin/users') {
          const query = new URL(route.request().url()).searchParams
          const pageSize = Number(query.get('pageSize') ?? 25)
          const pageNumber = Number(query.get('page') ?? 1)
          const matching = users.filter(
            (user) =>
              !query.get('search') ||
              [user.displayName, user.twitchLogin].some((value) =>
                value.toLowerCase().includes(query.get('search')!.toLowerCase()),
              ),
          )
          return route.fulfill({
            json: {
              items: matching.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
              page: pageNumber,
              pageSize,
              totalCount: matching.length,
              summary: { totalUsers: 3, loggedInUsers: 2, newUsers: 0 },
            },
          })
        }
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
    await owner.getByRole('button', { name: 'Manage roles for Owner' }).click()
    let editor = page.getByRole('dialog')
    await expect(
      editor.getByRole('checkbox', { name: 'Super administrator', exact: true }),
    ).toBeDisabled()
    await editor.getByRole('button', { name: 'Close', exact: true }).click()
    await page.getByRole('textbox', { name: 'Name or Twitch login' }).fill('First player')
    await first.getByRole('button', { name: 'Manage roles for First player' }).click()
    editor = page.getByRole('dialog')
    await editor.getByRole('checkbox', { name: 'Moderator', exact: true }).check()
    await page.setViewportSize({ width: width < 900 ? 1440 : 390, height: 1000 })
    await expect(editor.getByRole('checkbox', { name: 'Moderator', exact: true })).toBeChecked()
    await page.setViewportSize({ width, height: 1000 })
    await editor.getByRole('button', { name: 'Save roles', exact: true }).click()
    let confirmation = page.getByRole('dialog', { name: 'Change roles for First player?' })
    await expect(confirmation).toBeVisible()
    expect(saves).toBe(0)
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(editor.getByRole('checkbox', { name: 'Moderator', exact: true })).toBeChecked()
    await editor.getByRole('button', { name: 'Save roles', exact: true }).click()
    await page.screenshot({
      path: info.outputPath('role-save-confirmation.png'),
      animations: 'disabled',
    })
    await confirmation.getByRole('button', { name: 'Confirm changes', exact: true }).click()
    await expect(
      confirmation.getByRole('button', { name: 'Confirm changes', exact: true }),
    ).toBeDisabled()
    await expect(confirmation.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
    await expect.poll(() => Boolean(releaseFirst)).toBe(true)
    releaseFirst!()
    await expect(editor).toHaveCount(0)
    await expect(first.getByText('Moderator', { exact: true })).toBeVisible()
    await page.getByRole('textbox', { name: 'Name or Twitch login' }).fill('Second player')
    await second
      .getByRole('button', { name: 'Manage roles for Second player with a long display name' })
      .click()
    editor = page.getByRole('dialog')
    await editor.getByRole('checkbox', { name: 'Super administrator', exact: true }).check()
    await expect(editor.getByRole('checkbox', { name: 'Administrator', exact: true })).toBeChecked()
    await expect(editor.getByRole('checkbox', { name: 'Moderator', exact: true })).toBeChecked()
    await expect(editor.getByRole('checkbox', { name: 'Moderator', exact: true })).toBeDisabled()
    await editor.getByRole('button', { name: 'Save roles', exact: true }).click()
    confirmation = page.getByRole('dialog', {
      name: 'Change roles for Second player with a long display name?',
    })
    expect(saves).toBe(1)
    await confirmation.getByRole('button', { name: 'Confirm changes', exact: true }).click()
    await expect(confirmation.getByRole('alert')).toBeVisible()
    await page.screenshot({ path: info.outputPath('role-save-error.png'), animations: 'disabled' })
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(
      editor.getByRole('checkbox', { name: 'Super administrator', exact: true }),
    ).toBeChecked()
    await editor.getByRole('button', { name: 'Save roles', exact: true }).click()
    await confirmation.getByRole('button', { name: 'Confirm changes', exact: true }).click()
    await expect(editor).toHaveCount(0)
    await expect(second.getByText('Super administrator', { exact: true })).toBeVisible()
    expect(saves).toBe(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: info.outputPath('roles.png'),
      fullPage: true,
      animations: 'disabled',
    })
  })
}

for (const width of [390, 768, 1440]) {
  test(
    'modifier selection filters, bulk changes and preview at ' + width + 'px',
    async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 })
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      const server = await mockAdmin(page)
      await page.goto('/panel/admin-modifiers')
      const search = page.getByRole('textbox')
      await expect(page.getByRole('checkbox')).toHaveCount(9)
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({
        path: info.outputPath('modifier-selection.png'),
        fullPage: true,
        animations: 'disabled',
      })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.getByRole('combobox', { name: /^Categories/ }).click()
      await page.getByRole('option', { name: 'Before the round', exact: true }).click()
      await expect(page.getByRole('checkbox')).toHaveCount(3)
      await page.getByRole('button', { name: 'Enable visible', exact: true }).click()
      await expect.poll(server.writes).toBe(1)
      await expect.poll(server.enabledIds).toEqual(['modifier-0', 'modifier-3', 'modifier-6'])
      await expect(page.getByRole('button', { name: 'Enable visible', exact: true })).toBeDisabled()
      await search.fill('Night watch 4')
      await expect(page.getByRole('checkbox')).toHaveCount(1)
      await page.getByRole('button', { name: 'Disable visible', exact: true }).click()
      await expect.poll(server.writes).toBe(2)
      await expect.poll(server.enabledIds).toEqual(['modifier-0', 'modifier-6'])
      await search.fill('no matching modifier')
      await expect(page.getByRole('checkbox')).toHaveCount(0)
      await expect(search).toBeVisible()
      await expect(page.getByRole('button', { name: 'Enable visible', exact: true })).toBeDisabled()
      await expect(
        page.getByRole('button', { name: 'Disable visible', exact: true }),
      ).toBeDisabled()
      await search.fill('')
      await page.getByRole('combobox', { name: /^Categories/ }).click()
      await page.getByRole('option', { name: 'All categories', exact: true }).click()
      const first = page.getByRole('listitem', { name: 'Night watch 1', exact: true })
      await expect(first.getByRole('checkbox')).toBeChecked()
      const details = first.getByRole('button', { name: 'Details', exact: true })
      await details.click()
      const dialog = page.getByRole('dialog')
      await expect(
        dialog.getByText(
          'A long instruction for the host and the active team. Complete the round without changing equipment.',
        ),
      ).toBeVisible()
      await page.screenshot({
        path: info.outputPath('modifier-preview.png'),
        animations: 'disabled',
      })
      await page.keyboard.press('Escape')
      await expect(details).toBeFocused()
      expect(server.writes()).toBe(2)
      expect(errors).toEqual([])
    },
  )
}

test('failed modifier bulk save retains selection and can be saved on the next change', async ({
  page,
}) => {
  const server = await mockAdmin(page)
  await page.goto('/panel/admin-modifiers')
  await expect(page.getByRole('checkbox')).toHaveCount(9)
  server.refuseSave(true)
  await page.getByRole('combobox', { name: /^Categories/ }).click()
  await page.getByRole('option', { name: 'Before the round', exact: true }).click()
  await page.getByRole('button', { name: 'Enable visible', exact: true }).click()
  await expect(page.getByText('Failed to save game setup. Please try again.')).toBeVisible()
  await expect(
    page.getByRole('checkbox', { name: 'Include Night watch 4 in the game', exact: true }),
  ).toBeChecked()
  expect(server.enabledIds()).toEqual(['modifier-0'])
  server.refuseSave(false)
  await page
    .getByRole('checkbox', { name: 'Include Night watch 7 in the game', exact: true })
    .uncheck()
  await expect.poll(server.enabledIds).toEqual(['modifier-0', 'modifier-3'])
  expect(server.writes()).toBe(2)
})

for (const viewport of [
  { width: 390, height: 900 },
  { width: 768, height: 900 },
  { width: 1440, height: 900 },
  { width: 390, height: 500 },
]) {
  test(
    'modifier list owns scrolling at ' + viewport.width + 'x' + viewport.height,
    async ({ page }) => {
      await page.setViewportSize(viewport)
      await mockAdmin(page)
      await page.goto('/panel/admin-modifiers')
      await expect(page.getByRole('checkbox')).toHaveCount(9)
      const panel = page.getByRole('region', { name: 'Modifier selection', exact: true })
      const search = page.getByRole('textbox')
      const searchY = (await search.boundingBox())!.y
      const canScroll = await panel.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      )
      expect(canScroll).toBe(viewport.width < 1440)
      await panel.evaluate((element) => {
        element.scrollTop = element.scrollHeight
      })
      expect((await search.boundingBox())!.y).toBe(searchY)
      await expect(
        page.getByRole('checkbox', { name: 'Include Night watch 9 in the game', exact: true }),
      ).toBeInViewport()
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
        true,
      )
      await search.fill('Night watch 1')
      await expect(page.getByRole('checkbox')).toHaveCount(1)
      expect(await panel.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(
        true,
      )
      await search.fill('not found')
      await expect(page.getByRole('checkbox')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
        true,
      )
    },
  )
}

for (const width of [390, 768, 1440]) {
  test(
    'question selection filters, duration and preview at ' + width + 'px',
    async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 })
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      let catalogRequests = 0
      page.on('request', (request) => {
        if (new URL(request.url()).pathname === '/api/game/questions/catalog') catalogRequests++
      })
      const server = await mockAdmin(page)
      server.questions[1]!.categoryId = 'history'
      server.questions[1]!.categoryName = 'History'
      server.questions[11]!.isEnabled = false
      await page.goto('/panel/admin-questions')
      const search = page.getByRole('textbox', { name: 'Search questions and answers' })
      const duration = page.getByRole('textbox', { name: 'Answer time (seconds)' })
      const panel = page.getByRole('region', { name: 'Question selection', exact: true })
      await expect(panel.getByRole('checkbox')).toHaveCount(11)
      await page.evaluate(() => document.fonts.ready)
      const fieldEdges = await search.evaluate((element) => {
        const rect = element.closest('.MuiFormControl-root')!.getBoundingClientRect()
        return { left: rect.left }
      })
      const durationRight = await duration.evaluate(
        (element) => element.closest('.MuiFormControl-root')!.getBoundingClientRect().right,
      )
      const rows = await panel.getByRole('listitem').evaluateAll((elements) =>
        elements.slice(0, 2).map((element) => {
          const rect = element.getBoundingClientRect()
          return { left: rect.left, right: rect.right }
        }),
      )
      expect(Math.abs(rows[0]!.left - fieldEdges.left)).toBeLessThanOrEqual(1)
      expect(Math.abs(rows[width === 1440 ? 1 : 0]!.right - durationRight)).toBeLessThanOrEqual(1)
      if (width === 1440)
        expect(Math.abs((rows[0]!.right + rows[1]!.left) / 2 - width / 2)).toBeLessThanOrEqual(1)
      const fullyVisibleRows = await panel.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        return Array.from(element.querySelectorAll('li')).filter((row) => {
          const rect = row.getBoundingClientRect()
          return rect.top >= bounds.top && rect.bottom <= bounds.bottom
        }).length
      })
      expect(fullyVisibleRows).toBeGreaterThanOrEqual(width === 1440 ? 10 : width === 768 ? 6 : 3)
      const previewBounds = await panel
        .getByRole('button', { name: 'View answers', exact: true })
        .first()
        .boundingBox()
      expect(previewBounds!.height).toBeGreaterThanOrEqual(44)
      expect(previewBounds!.width).toBeGreaterThanOrEqual(44)
      await page.screenshot({
        path: info.outputPath('question-selection.png'),
        fullPage: true,
        animations: 'disabled',
      })
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight,
        ),
      ).toBe(true)
      const searchY = (await search.boundingBox())!.y
      await panel.evaluate((element) => {
        element.scrollTop = element.scrollHeight
      })
      expect((await search.boundingBox())!.y).toBe(searchY)
      await expect(panel.getByRole('checkbox').last()).toBeInViewport()
      await duration.fill('4')
      await duration.press('Tab')
      await expect(page.getByText('Enter a whole number from 5 to 3600 seconds.')).toBeVisible()
      expect(server.writes()).toBe(0)
      await page.getByRole('combobox', { name: /^Categories/ }).click()
      await page.getByRole('option', { name: 'History', exact: true }).click()
      await expect(panel.getByRole('checkbox')).toHaveCount(1)
      const requestsBeforeSearch = catalogRequests
      await search.fill('no matching answer')
      await expect(panel.getByRole('checkbox')).toHaveCount(0)
      await search.fill('Warsaw')
      await expect(panel.getByRole('checkbox')).toHaveCount(1)
      expect(catalogRequests).toBe(requestsBeforeSearch)
      await page.getByRole('button', { name: 'Enable visible', exact: true }).click()
      await expect.poll(server.questionIds).toEqual(['question-0', 'question-1'])
      expect(server.duration()).toBe(60)
      await expect(duration).toHaveValue('4')
      await expect(duration).toBeEnabled()
      await duration.fill('90')
      await duration.press('Enter')
      await expect.poll(server.duration).toBe(90)
      await expect.poll(server.writes).toBe(2)
      await page.getByRole('combobox', { name: /^Selection/ }).click()
      await page.getByRole('option', { name: 'Selected', exact: true }).click()
      await page.getByRole('button', { name: 'Disable visible', exact: true }).click()
      await expect.poll(server.questionIds).toEqual(['question-0'])
      await expect(panel.getByRole('checkbox')).toHaveCount(0)
      await expect(search).toHaveValue('Warsaw')
      await page.getByRole('combobox', { name: /^Categories/ }).click()
      await expect(page.getByRole('option', { name: 'Geography', exact: true })).toBeVisible()
      await expect(page.getByRole('option', { name: 'History', exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
      await expect(panel.getByRole('checkbox')).toHaveCount(11)
      const details = panel.getByRole('button', { name: 'View answers', exact: true }).first()
      await details.click()
      const dialog = page.getByRole('dialog', { name: 'Question and answers' })
      await expect(dialog.getByText('Warsaw', { exact: true })).toBeVisible()
      await expect(dialog.getByText('Krakow', { exact: true })).toBeVisible()
      await expect(dialog.getByText('Correct answer', { exact: true })).toBeVisible()
      await page.screenshot({
        path: info.outputPath('question-preview.png'),
        animations: 'disabled',
      })
      await page.keyboard.press('Escape')
      await expect(details).toBeFocused()
      expect(server.writes()).toBe(3)
      expect(errors).toEqual([])
    },
  )
}

test('question selection preserves failed changes and retries on the next edit', async ({
  page,
}) => {
  const server = await mockAdmin(page)
  await page.goto('/panel/admin-questions')
  await expect(page.getByRole('checkbox')).toHaveCount(12)
  server.refuseSave(true)
  await page.getByRole('button', { name: 'Enable visible', exact: true }).click()
  await expect(page.getByText('Failed to save game setup. Please try again.')).toBeVisible()
  await expect(page.getByRole('checkbox').last()).toBeChecked()
  expect(server.questionIds()).toEqual(['question-0'])
  server.refuseSave(false)
  await page.getByRole('checkbox').last().uncheck()
  await expect.poll(() => server.questionIds().length).toBe(11)
  expect(server.questionIds()).not.toContain('question-11')
  expect(server.writes()).toBe(2)
})

for (const width of [320, 390, 768, 1440]) {
  test(
    'question tools and results remain reachable in a short window at ' + width,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 500 })
      await mockAdmin(page)
      await page.goto('/panel/admin-questions')
      const panel = page.getByRole('region', { name: 'Question selection', exact: true })
      await expect(panel.getByRole('checkbox')).toHaveCount(12)
      await page.getByRole('combobox', { name: /^Selection/ }).click()
      await page.getByRole('option', { name: 'Not selected', exact: true }).click()
      await page.getByRole('button', { name: 'Enable visible', exact: true }).click()
      await expect(panel.getByRole('checkbox')).toHaveCount(0)
      await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
      await panel.getByRole('checkbox').last().scrollIntoViewIfNeeded()
      await expect(panel.getByRole('checkbox').last()).toBeInViewport()
      await panel.getByRole('button', { name: 'View answers' }).last().click()
      await expect(page.getByRole('dialog', { name: 'Question and answers' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollHeight <= innerHeight &&
            document.documentElement.scrollWidth <= innerWidth &&
            scrollY === 0,
        ),
      ).toBe(true)
      await page.setViewportSize({ width: width === 1440 ? 390 : 1440, height: 700 })
      await expect(panel.getByRole('checkbox')).toHaveCount(12)
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollHeight <= innerHeight &&
              document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true)
    },
  )
}

test('board readiness shows the saved question duration', async ({ page }, info) => {
  const server = await mockAdmin(page)
  await page.goto('/panel/admin-questions')
  const duration = page.getByRole('textbox', { name: 'Answer time (seconds)' })
  await duration.fill('90')
  await duration.press('Tab')
  await expect.poll(server.duration).toBe(90)
  await page.goto('/panel/game-setup')
  await expect(page.getByText('Answer time', { exact: true })).toBeVisible()
  await expect(page.getByText('90 s', { exact: true })).toBeVisible()
  await page.screenshot({
    path: info.outputPath('board-question-duration.png'),
    animations: 'disabled',
  })
})

for (const width of [390, 1440]) {
  test('game management petal is absent on administrative routes at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockAdmin(page, ['viewer', 'admin', 'superadmin'])
    const petal = page.getByRole('button', { name: 'Game administration', exact: true })
    await page.goto('/panel/game-board')
    await expect(petal).toBeVisible()
    for (const path of [
      'role-administration',
      'catalog-questions',
      'catalog-modifiers',
      'team-registrations',
      'admin-questions',
      'admin-modifiers',
      'game-setup',
    ]) {
      await page.goto('/panel/' + path)
      await expect(page).toHaveURL('/panel/' + path)
      await expect(page.getByRole('main')).toBeVisible()
      if (path === 'role-administration')
        await expect(page.getByRole('textbox', { name: 'Name or Twitch login' })).toBeVisible()
      else await expect(page.getByRole('heading').first()).toBeVisible()
      await expect(petal).toHaveCount(0)
    }
    await page.goto('/panel/game-board')
    await expect(petal).toBeVisible()
  })
}

test('question selection keeps a large catalogue stable while a save is pending', async ({
  page,
}) => {
  const server = await mockAdmin(page)
  const seed = server.questions[0]!
  for (let i = 12; i < 500; i++)
    server.questions.push({ ...seed, questionId: 'question-' + i, text: 'Question ' + (i + 1) })
  let releaseSave: (() => void) | undefined
  await page.route('**/api/game/setup', async (route) => {
    if (route.request().method() === 'PUT')
      await new Promise<void>((resolve) => {
        releaseSave = resolve
      })
    await route.fallback()
  })
  await page.goto('/panel/admin-questions')
  const panel = page.getByRole('region', { name: 'Question selection', exact: true })
  await expect(panel.getByRole('checkbox')).toHaveCount(500)
  await page.evaluate(() => document.fonts.ready)
  const mutations = await panel.evaluateHandle((element) => {
    const state = {
      count: 0,
      observer: new MutationObserver((records) => {
        state.count += records.length
      }),
    }
    for (const row of Array.from(element.querySelectorAll('li')).slice(1))
      state.observer.observe(row, { subtree: true, attributes: true, childList: true })
    return state
  })
  const first = panel.getByRole('checkbox').first()
  await first.uncheck()
  await expect(first).not.toBeChecked()
  await expect.poll(() => Boolean(releaseSave)).toBe(true)
  await expect(panel.getByRole('checkbox').nth(1)).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Enable visible', exact: true })).toBeDisabled()
  releaseSave!()
  await expect(first).toBeEnabled()
  expect(server.writes()).toBe(1)
  expect(server.questionIds()).toEqual([])
  expect(
    await mutations.evaluate((state) => {
      state.observer.disconnect()
      return state.count
    }),
  ).toBe(0)
  await mutations.dispose()
})

for (const viewport of [
  { width: 390, height: 900 },
  { width: 768, height: 900 },
  { width: 1440, height: 900 },
  { width: 390, height: 500 },
]) {
  test(
    'catalogue filters, preview and bounded scrolling at ' + viewport.width + 'x' + viewport.height,
    async ({ page }, info) => {
      await page.setViewportSize(viewport)
      const server = await mockAdmin(page)
      server.questions[11]!.isEnabled = false
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      for (const kind of ['questions', 'modifiers']) {
        let reads = 0
        page.on('request', (request) => {
          if (new URL(request.url()).pathname === '/api/game/' + kind + '/catalog') reads++
        })
        await page.goto('/panel/catalog-' + kind)
        const list =
          kind === 'questions'
            ? page.locator('[role="region"][tabindex="0"]')
            : page.getByTestId('modifier-catalog-list')
        await expect(list.locator(kind === 'questions' ? 'article' : 'li')).toHaveCount(
          kind === 'questions' ? 12 : 9,
        )
        const search = page.getByRole('textbox').first()
        const top = (await search.boundingBox())!.y
        const scrollRegion = kind === 'questions' ? list : list.getByRole('region')
        if (kind === 'questions' || viewport.width >= 1200) {
          await scrollRegion.evaluate((element) => {
            element.scrollTop = element.scrollHeight
          })
        } else {
          await list.locator('li').last().scrollIntoViewIfNeeded()
        }
        await expect(list.locator(kind === 'questions' ? 'article' : 'li').last()).toBeInViewport()
        if (kind === 'questions' || viewport.width >= 1200) {
          expect((await search.boundingBox())!.y).toBe(top)
        }
        await search.scrollIntoViewIfNeeded()
        expect(
          await page.evaluate(
            (kind) =>
              document.documentElement.scrollWidth <= innerWidth &&
              (kind === 'modifiers' || document.documentElement.scrollHeight <= innerHeight),
            kind,
          ),
        ).toBe(true)
        const readsBefore = reads
        await search.fill('nothing matches')
        await expect(list.locator(kind === 'questions' ? 'article' : 'li')).toHaveCount(0)
        if (kind === 'modifiers' && viewport.width < 600) {
          await page.getByRole('button', { name: 'Filters (0)', exact: true }).click()
        }
        await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
        await expect(search).toHaveValue('')
        await expect(list.locator(kind === 'questions' ? 'article' : 'li')).toHaveCount(
          kind === 'questions' ? 12 : 9,
        )
        await page.getByRole('combobox', { name: /^Categories/ }).click()
        await page
          .getByRole('option', { name: kind === 'questions' ? /^Geography/ : /^Before the round/ })
          .click()
        await expect(list.locator(kind === 'questions' ? 'article' : 'li')).toHaveCount(
          kind === 'questions' ? 12 : 3,
        )
        if (kind === 'questions') {
          await page.getByRole('combobox', { name: /^Availability/ }).click()
          await page.getByRole('option', { name: 'globally disabled', exact: true }).click()
          await expect(list.locator(kind === 'questions' ? 'article' : 'li')).toHaveCount(1)
        }
        expect(reads).toBe(readsBefore)
        await list
          .getByRole('button', { name: kind === 'questions' ? /^Preview:/ : /^Night watch/ })
          .first()
          .click()
        const dialog =
          kind === 'modifiers' && viewport.width >= 1200
            ? page.getByTestId('modifier-catalog-details')
            : page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        if (kind === 'questions') {
          await expect(dialog.getByText('Warsaw', { exact: true })).toBeVisible()
          await expect(dialog.getByText('Correct answer', { exact: true })).toBeVisible()
        } else
          await expect(
            dialog.getByText(
              'A long instruction for the host and the active team. Complete the round without changing equipment.',
              { exact: true },
            ),
          ).toBeVisible()
        if (kind === 'questions' || viewport.width < 1200) {
          await page.keyboard.press('Escape')
          await expect(dialog).toHaveCount(0)
        }
        await page.screenshot({
          path: info.outputPath('catalog-' + kind + '.png'),
          animations: 'disabled',
        })
      }
      expect(errors).toEqual([])
    },
  )
}

test('catalogue deletion errors keep the selected record and confirmation open', async ({
  page,
}) => {
  await mockAdmin(page)
  for (const kind of ['questions', 'modifiers']) {
    await page.goto('/panel/catalog-' + kind)
    const list =
      kind === 'questions'
        ? page.locator('[role="region"][tabindex="0"]')
        : page.getByTestId('modifier-catalog-list')
    const actions = kind === 'questions' ? list : page.getByTestId('modifier-catalog-details')
    await actions.getByRole('button', { name: 'Delete', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(
      dialog.getByText('The operation could not be completed. Please try again.', { exact: true }),
    ).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Delete', exact: true })).toBeEnabled()
    await expect(list.locator(kind === 'questions' ? 'article' : 'li')).toHaveCount(
      kind === 'questions' ? 12 : 9,
    )
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toHaveCount(0)
  }
})

for (const width of [320, 390, 768, 1440]) {
  test(
    'modifier catalogue preserves list/detail placement and locks in Russian at ' + width + 'px',
    async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 })
      const server = await mockAdmin(page, ['viewer', 'admin'], 'ru')
      const name = 'Ночной дозор: испытание для всей команды'
      server.modifiers[0]!.name = name
      await page.goto('/panel/catalog-modifiers')
      const list = page.getByTestId('modifier-catalog-list')
      await expect(list.getByRole('button')).toHaveCount(9)
      const row = list.getByRole('button', { name, exact: true })
      await row.click()
      const details = page.getByTestId('modifier-catalog-details')
      await expect(details.getByRole('heading', { name, exact: true })).toBeVisible()
      await expect(details.getByRole('link', { name: 'История', exact: true })).toHaveAttribute(
        'href',
        /modifierId=modifier-0/,
      )
      if (width >= 1200) {
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(row).toHaveAttribute('aria-pressed', 'true')
        const listBounds = (await list.boundingBox())!
        const detailsBounds = (await details.boundingBox())!
        expect(detailsBounds.x).toBeGreaterThan(listBounds.x + listBounds.width)
      } else {
        await expect(page.getByRole('dialog')).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(row).toBeFocused()
        await row.click()
      }
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({
        path: info.outputPath('catalog-modifiers-ru.png'),
        animations: 'disabled',
      })
      const edit = details.getByRole('button', { name: 'Изменить', exact: true })
      await edit.click()
      await expect(
        page.getByRole('dialog').getByRole('textbox', { name: /^Название/ }),
      ).toHaveValue(name)
      await page.getByRole('dialog').getByRole('button', { name: 'Отмена', exact: true }).click()
      await expect(details.getByRole('heading', { name, exact: true })).toBeVisible()
      server.modifiers[0]!.isLockedByActiveGame = true
      await page.reload()
      await row.click()
      await expect(details.getByRole('button', { name: 'Удалить', exact: true })).toBeDisabled()
      await expect(details.getByText(/Его содержимое доступно только для просмотра/)).toHaveCount(0)
      await details.getByRole('button', { name: 'Удалить', exact: true }).locator('..').hover()
      await expect(page.getByRole('tooltip')).toContainText(
        'Его содержимое доступно только для просмотра',
      )
      await details.getByRole('button', { name: 'Просмотр', exact: true }).click()
      await expect(
        page.getByRole('dialog').getByRole('button', { name: 'Сохранить', exact: true }),
      ).toHaveCount(0)
      await expect(
        page.getByRole('dialog').getByRole('textbox', { name: /^Название/ }),
      ).toBeDisabled()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    },
  )
}
