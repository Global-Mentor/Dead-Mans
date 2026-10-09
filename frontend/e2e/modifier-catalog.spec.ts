import { expect, test, type Page } from '@playwright/test'
import type {
  CreateGameModifierRequest,
  GameModifierDefinition,
  GameModifierDraftPreview,
  UpdateGameModifierRequest,
} from '../src/shared/api/contracts/index.ts'

const names = [
  'Адреналин',
  'Без права на ошибку',
  'Двойная ставка',
  'Засада',
  'Ментор',
  'Ночной дозор',
  'Охота без аптечек',
  'Последний шанс',
  'Сбор трофеев',
  'Тихий шаг',
  'Удачная добыча',
  'Штраф за промах',
]
const catalog: GameModifierDefinition[] = names.map((name, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  name,
  description:
    index === 0
      ? 'Выполните испытание без смены снаряжения. Каждый выполненный пункт приносит команде дополнительные очки.\nВедущий проверяет результат после завершения раунда.'
      : 'Особое условие для команды на текущий раунд. Подробные правила доступны ведущему и участникам до начала испытания.',
  category: index % 3 === 0 ? 'round' : index % 3 === 1 ? 'preparation' : 'result',
  activationCost: index === 1 ? 0 : (index + 1) * 10,
  activationLimit: { count: index === 0 ? null : 2 },
  conflictingModifierIds: index === 0 ? ['00000000-0000-4000-8000-000000000002'] : [],
  iconEmoji: ['⚡', '🎯', '🎲', '🌿', '🧭', '🌙'][index % 6] ?? null,
  activationCommand: `!modifier${index + 1}`,
  isLockedByActiveGame: index === 2,
  revision: 1,
  normalizedTags: ['испытание', 'команда'],
  behaviorV2: {
    schemaVersion: 2,
    kind: index % 2 === 0 ? 'scoring' : 'rule',
    phase: index % 3 === 0 ? 'round' : index % 3 === 1 ? 'preparation' : 'result',
    performer: 'activeTeam',
    requiresHostMonitoring: index % 2 === 0,
    rule: 'Команда выполняет условие до конца раунда. Ведущий фиксирует результат перед начислением очков.',
    ...(index === 1 ? { durationSecondsPerActivation: 60 } : {}),
    stackingPolicy: 'aggregateParameters',
    resolution: index % 2 === 0 ? { type: 'boolean' } : { type: 'ruleStatus' },
    reward: index % 2 === 0 ? 'points' : 'none',
    formulaReference:
      index % 2 === 0
        ? {
            code: 'fixed_points_per_unit',
            version: 1,
            parameters: { type: 'fixedPointsPerUnit', pointsPerUnit: 100 },
          }
        : null,
  },
}))

async function mockCatalog(page: Page, language = 'en') {
  await page.addInitScript((language) => localStorage.setItem('i18nextLng', language), language)
  await page.routeWebSocket(/\/hubs\//, (socket) =>
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) socket.send('{}\u001e')
    }),
  )
  let items = [...catalog]
  const archivedItems: GameModifierDefinition[] = [
    {
      ...catalog[1]!,
      id: '00000000-0000-4000-8000-000000000101',
      name: 'Архивное правило',
      activationCost: 5,
    },
    {
      ...catalog[0]!,
      id: '00000000-0000-4000-8000-000000000102',
      name: 'Архивный бонус',
      activationCost: 7,
    },
  ]
  let archiveRequests = 0
  let failArchive = false
  let deletes = 0
  let failDelete = true
  let failCatalog = false
  let failPreview = false
  let failSave = false
  let lockConflictOnSave = false
  const previews: CreateGameModifierRequest[] = []
  const saves: CreateGameModifierRequest[] = []
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
            connectionId: 'catalog-test',
            connectionToken: 'catalog-test',
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }],
          },
        })
      if (path === '/api/game/modifiers/preview') {
        const request = route.request().postDataJSON() as CreateGameModifierRequest
        previews.push(request)
        if (failPreview) return route.fulfill({ status: 500 })
        const preview: GameModifierDraftPreview = {
          name: request.name,
          description: request.description,
          iconEmoji: request.iconEmoji,
          normalizedTags: request.normalizedTags ?? [],
          activationCommand: request.activationCommand ?? '!modifier',
          behaviorV2: request.behaviorV2,
          example: {
            cardValue: 100,
            killsCount: 3,
            bountyCount: 1,
            resolutionExample: 'completed',
            pointsDelta: 0,
            bonusKillsDelta: 0,
            finalScore: 400,
          },
        }
        return route.fulfill({ json: preview })
      }
      if (path === '/api/game/modifiers' && route.request().method() === 'POST') {
        const request = route.request().postDataJSON() as CreateGameModifierRequest
        saves.push(request)
        if (failSave) return route.fulfill({ status: 500 })
        if (lockConflictOnSave) {
          lockConflictOnSave = false
          items = items.map((item) =>
            request.conflictingModifierIds.includes(item.id)
              ? { ...item, isLockedByActiveGame: true }
              : item,
          )
          return route.fulfill({
            status: 409,
            json: { code: 'game_modifier_compatibility_locked' },
          })
        }
        const created: GameModifierDefinition = {
          ...catalog[0]!,
          ...request,
          normalizedTags: request.normalizedTags ?? [],
          activationCommand: request.activationCommand ?? null,
          id: '00000000-0000-4000-8000-000000000099',
          revision: 1,
          isLockedByActiveGame: false,
        }
        items.push(created)
        return route.fulfill({ json: created })
      }
      if (route.request().method() === 'PUT' && path.startsWith('/api/game/modifiers/')) {
        const request = route.request().postDataJSON() as UpdateGameModifierRequest
        saves.push(request)
        const previous = items.find((item) => path.endsWith(item.id))
        if (!previous) return route.fulfill({ status: 404 })
        const updated: GameModifierDefinition = {
          ...previous,
          ...request,
          normalizedTags: request.normalizedTags ?? [],
          activationCommand: request.activationCommand ?? null,
          revision: previous.revision + 1,
        }
        items = items.map((item) => (item.id === updated.id ? updated : item))
        return route.fulfill({ json: updated })
      }
      if (path === '/api/game/modifiers/catalog') {
        if (new URL(route.request().url()).searchParams.get('archived') === 'true') {
          archiveRequests++
          return failArchive
            ? route.fulfill({ status: 500 })
            : route.fulfill({ json: archivedItems })
        }
        return failCatalog ? route.fulfill({ status: 500 }) : route.fulfill({ json: items })
      }
      if (route.request().method() === 'DELETE') {
        deletes++
        if (failDelete) {
          failDelete = false
          return route.fulfill({ status: 409, json: { code: 'game_modifier_content_locked' } })
        }
        const archived = items.find((item) => path.endsWith(item.id))
        if (archived) archivedItems.push(archived)
        items = items.filter((item) => !path.endsWith(item.id))
      }
      return route.fulfill({ status: 204 })
    },
  )
  return {
    deletes: () => deletes,
    archiveRequests: () => archiveRequests,
    setArchiveFailure: (value: boolean) => {
      failArchive = value
    },
    previews,
    saves,
    setPreviewFailure: (value: boolean) => {
      failPreview = value
    },
    lockConflictOnSave: () => {
      lockConflictOnSave = true
    },
    lockModifier: (id: string) => {
      items = items.map((item) => (item.id === id ? { ...item, isLockedByActiveGame: true } : item))
    },
    setSaveFailure: (value: boolean) => {
      failSave = value
    },
    setFailure: (value: boolean) => {
      failCatalog = value
    },
    empty: () => {
      items = []
    },
  }
}

async function choose(page: Page, label: string, option: string | RegExp) {
  await page.getByRole('combobox', { name: new RegExp(`^${label}(?:\\s|$)`) }).click()
  await page.getByRole('option', { name: option }).click()
}

for (const width of [320, 390, 768, 1440]) {
  test(`populated catalog and selected card at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await mockCatalog(page, 'ru')
    await page.goto('/panel/catalog-modifiers')
    const list = page.getByTestId('modifier-catalog-list')
    await expect(list.getByRole('button')).toHaveCount(catalog.length)
    await expect(
      page.getByRole('button', { name: 'Добавить модификатор', exact: true }),
    ).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    )
    const bounds = await list.boundingBox()
    const contentBottom = await page
      .getByRole('main')
      .evaluate(
        (main) =>
          main.getBoundingClientRect().bottom - parseFloat(getComputedStyle(main).paddingBottom),
      )
    expect(Math.abs(bounds!.y + bounds!.height - contentBottom)).toBeLessThan(1)
    await page.screenshot({
      path: info.outputPath('catalog.png'),
      fullPage: true,
      animations: 'disabled',
    })
    if (width < 600) {
      const filters = page.getByTestId('modifier-catalog-filters')
      await filters.getByRole('button', { name: 'Фильтры (0)' }).click()
      await choose(page, 'Категории', /^Перед раундом \(/)
      await expect(list.getByRole('button')).toHaveCount(4)
      await filters.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click()
      await expect(list.getByRole('button')).toHaveCount(12)
      await page.screenshot({
        path: info.outputPath('expanded-filters.png'),
        fullPage: true,
        animations: 'disabled',
      })
      await filters.getByRole('button', { name: 'Фильтры (0)' }).click()
    }
    const selected = list.getByRole('button', { name: 'Адреналин', exact: true })
    await selected.focus()
    await page.keyboard.press('Enter')
    const details = page.getByTestId('modifier-catalog-details')
    await expect(details.getByRole('heading', { name: 'Адреналин', exact: true })).toBeVisible()
    await expect(details.getByText('без лимита', { exact: true })).toBeVisible()
    const activation = details.getByRole('region', { name: 'Активация', exact: true })
    await expect(activation.getByRole('group', { name: 'Конфликты', exact: true })).toContainText(
      'Без права на ошибку',
    )
    await expect(details.getByRole('link', { name: 'История', exact: true })).toHaveAttribute(
      'href',
      /modifierId=00000000-0000-4000-8000-000000000001/,
    )
    await page.screenshot({ path: info.outputPath('details.png'), animations: 'disabled' })
    if (width < 1200) {
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(selected).toBeFocused()
      await selected.click()
    }
    await details.getByRole('button', { name: 'Изменить', exact: true }).click()
    const editor = page.getByRole('dialog')
    await expect(editor.getByRole('textbox', { name: /^Название/ })).toHaveValue('Адреналин')
    await expect(editor.getByRole('textbox', { name: 'Описание', exact: true })).toHaveValue(
      catalog[0]!.description,
    )
    if (width < 1200) {
      await editor.getByRole('button', { name: 'Отмена', exact: true }).click()
      await expect(details.getByRole('heading', { name: 'Адреналин', exact: true })).toBeVisible()
      await details.getByRole('button', { name: 'Изменить', exact: true }).click()
      await expect(editor.getByRole('textbox', { name: /^Название/ })).toHaveValue('Адреналин')
    }
    await editor.getByRole('textbox', { name: /^Название/ }).fill('Новый черновик')
    await page.setViewportSize({ width: width === 1440 ? 390 : 1440, height: 900 })
    await expect(editor.getByRole('textbox', { name: /^Название/ })).toHaveValue('Новый черновик')
    expect(errors).toEqual([])
  })
}

for (const width of [390, 1440]) {
  test(`active-game lock stays compact and preserves read-only details at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 })
    await mockCatalog(page, 'ru')
    await page.goto('/panel/catalog-modifiers')
    const list = page.getByTestId('modifier-catalog-list')
    const locked = list.getByRole('button', { name: 'Двойная ставка', exact: true })
    await expect(locked).toHaveAccessibleDescription(/Заблокирован активной игрой/)
    const lockIcon = locked.getByRole('img', { name: 'Заблокирован активной игрой' })
    const nameBounds = await lockIcon.evaluate((icon) => {
      const range = document.createRange()
      range.selectNodeContents(icon.parentElement!.firstChild!)
      return range.getBoundingClientRect().toJSON()
    })
    const iconBounds = (await lockIcon.boundingBox())!
    expect(iconBounds.x - nameBounds.right).toBeGreaterThanOrEqual(0)
    expect(iconBounds.x - nameBounds.right).toBeLessThan(16)
    await locked.click()
    const details = page.getByTestId('modifier-catalog-details')
    await expect(
      details.getByRole('heading', { name: 'Полное описание:', exact: true }),
    ).toBeVisible()
    await expect(
      details.getByRole('heading', { name: 'Краткое описание:', exact: true }),
    ).toHaveCount(0)
    await expect(
      details.getByRole('heading', { name: 'Поведение модификатора', exact: true }),
    ).toBeVisible()
    await expect(details.getByText(/Его содержимое доступно только для просмотра/)).toHaveCount(0)
    await expect(details.getByRole('button', { name: 'Удалить', exact: true })).toBeDisabled()
    await expect(details.getByRole('button', { name: 'Просмотр', exact: true })).toBeVisible()
    const activation = details.getByRole('region', { name: 'Активация', exact: true })
    await expect(activation.getByRole('group', { name: 'Конфликты', exact: true })).toHaveText(
      'КонфликтыНет',
    )
    await expect(details.getByText('Команда активации', { exact: true })).toHaveCount(0)
    await expect(details.getByText('Теги', { exact: true })).toHaveCount(0)
    await page.screenshot({ path: info.outputPath('locked-details.png'), animations: 'disabled' })
    const deleteHint = details.getByRole('button', { name: 'Удалить', exact: true }).locator('..')
    await deleteHint.hover()
    await expect(page.getByRole('tooltip')).toContainText(
      'Его содержимое доступно только для просмотра',
    )
    await page.screenshot({ path: info.outputPath('delete-tooltip.png'), animations: 'disabled' })
    await page.mouse.move(0, 0)
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await details.getByRole('link', { name: 'История', exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(deleteHint).toBeFocused()
    await expect(page.getByRole('tooltip')).toContainText(
      'Его содержимое доступно только для просмотра',
    )

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await details.getByRole('button', { name: 'Просмотр', exact: true }).click()
    const editor = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('textbox', { name: /^Название/ }) })
    await expect(editor.getByRole('textbox', { name: /^Название/ })).toBeDisabled()
    await expect(editor.getByRole('button', { name: 'Сохранить', exact: true })).toHaveCount(0)
  })
}

test('locked deletion reason is accessible by touch', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    ...(baseURL ? { baseURL } : {}),
    hasTouch: true,
    viewport: { width: 390, height: 900 },
  })
  try {
    const page = await context.newPage()
    await mockCatalog(page, 'ru')
    await page.goto('/panel/catalog-modifiers')
    await page
      .getByTestId('modifier-catalog-list')
      .getByRole('button', { name: 'Двойная ставка', exact: true })
      .tap()
    const deleteButton = page
      .getByTestId('modifier-catalog-details')
      .getByRole('button', { name: 'Удалить', exact: true })
    await deleteButton.locator('..').tap()
    await expect(page.getByRole('tooltip')).toContainText(
      'Его содержимое доступно только для просмотра',
    )
    await expect(deleteButton).toBeDisabled()
    await expect(
      page.getByRole('dialog', { name: 'Удалить модификатор', exact: true }),
    ).toHaveCount(0)
  } finally {
    await context.close()
  }
})

test('combined filters, cost ordering, reset and locked records', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await mockCatalog(page)
  await page.goto('/panel/catalog-modifiers')
  const list = page.getByTestId('modifier-catalog-list')
  await expect(list.getByRole('button')).toHaveCount(12)
  await expect(list.getByRole('button').first()).toHaveAccessibleName('Без права на ошибку')
  await choose(page, 'Sort by', 'Cost: low to high')
  await expect(list.getByRole('button').first()).toHaveAccessibleName('Без права на ошибку')
  await choose(page, 'Categories', /^During the round \(/)
  await choose(page, 'Round summary behavior', 'Host confirms a condition (6)')
  await expect(list.getByRole('button')).toHaveCount(2)
  await page.getByRole('textbox', { name: 'Search modifiers' }).fill('Адреналин')
  await expect(list.getByRole('button')).toHaveCount(1)
  await page.getByRole('textbox', { name: 'Search modifiers' }).fill('missing-result')
  await expect(list).toHaveCount(0)
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
  await expect(list.getByRole('button')).toHaveCount(12)
  const locked = list.getByRole('button', { name: 'Двойная ставка', exact: true })
  await expect(locked).toHaveAccessibleDescription(/Locked by active game/)
  await locked.click()
  const details = page.getByTestId('modifier-catalog-details')
  await expect(details.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled()
  await details.getByRole('button', { name: 'View', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('textbox', { name: /^Name/ })).toBeDisabled()
})

for (const [language, title] of [
  ['uk', 'Каталог модифікаторів'],
  ['pl', 'Katalog modyfikatorów'],
] as const) {
  test(`translated catalog remains readable in ${language}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 768, height: 900 })
    await mockCatalog(page, language)
    await page.goto('/panel/catalog-modifiers')
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await expect(page.getByTestId('modifier-catalog-list').getByRole('button')).toHaveCount(12)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: info.outputPath('translated-catalog.png'),
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('deletion failure keeps its target, then retry updates the catalog', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const server = await mockCatalog(page)
  await page.goto('/panel/catalog-modifiers')
  await page
    .getByTestId('modifier-catalog-list')
    .getByRole('button', { name: 'Адреналин', exact: true })
    .click()
  await page
    .getByTestId('modifier-catalog-details')
    .getByRole('button', { name: 'Delete', exact: true })
    .click()
  const confirmation = page.getByRole('dialog')
  await confirmation.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(confirmation.getByRole('alert')).toBeVisible()
  await expect(confirmation).toContainText('Адреналин')
  await confirmation.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(confirmation).toHaveCount(0)
  await expect(page.getByTestId('modifier-catalog-list').getByRole('button')).toHaveCount(11)
  expect(server.deletes()).toBe(2)
})

test('initial error can be retried and empty catalog retains creation', async ({ page }) => {
  const server = await mockCatalog(page)
  server.setFailure(true)
  await page.goto('/panel/catalog-modifiers')
  await expect(page.getByRole('alert')).toContainText('Failed to load the modifier catalog.')
  server.setFailure(false)
  server.empty()
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByText('No modifiers yet. Add the first one.')).toBeVisible()
  await page.getByRole('button', { name: 'Add modifier', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('textbox', { name: /^Name/ })).toHaveValue('')
})

for (const width of [320, 390, 768, 1440]) {
  test(`rule wizard keeps actions reachable and requires review before saving at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 320 ? 640 : 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const server = await mockCatalog(page, 'ru')
    await page.goto('/panel/catalog-modifiers')
    await page.getByRole('button', { name: 'Добавить модификатор', exact: true }).click()
    const editor = page.getByRole('dialog')
    await editor.getByRole('textbox', { name: 'Название', exact: true }).fill('Новый модификатор')
    await editor
      .getByRole('textbox', { name: 'Описание', exact: true })
      .fill('Описание для игрока: выполните условие до конца раунда.')
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: info.outputPath('wizard-card.png'), animations: 'disabled' })
    await editor.getByRole('textbox', { name: 'Название', exact: true }).press('Enter')
    await expect(
      editor.getByRole('heading', { name: 'Условия и активация', exact: true }),
    ).toBeFocused()
    await expect(editor.getByText('Шаг 2 из 3', { exact: true })).toBeVisible()
    const centeredChoice = await editor
      .getByRole('radio', { name: 'Команда', exact: true })
      .evaluate((input) => {
        const tile = input.closest('label')!
        const title = tile.querySelector('.MuiTypography-root')!
        const range = document.createRange()
        range.selectNodeContents(title)
        const text = range.getBoundingClientRect()
        const bounds = tile.getBoundingClientRect()
        return {
          offset: Math.abs(text.x + text.width / 2 - bounds.x - bounds.width / 2),
          height: bounds.height,
        }
      })
    const performerGroup = editor
      .getByRole('radio', { name: 'Команда', exact: true })
      .locator('xpath=ancestor::*[@role="radiogroup"]')
    const helpButton = editor.getByRole('button', { name: /^Кто должен выполнить условие\?/ })
    const [groupBounds, helpBounds] = await Promise.all([
      performerGroup.boundingBox(),
      helpButton.boundingBox(),
    ])
    expect(groupBounds).not.toBeNull()
    expect(helpBounds).not.toBeNull()
    expect(
      Math.abs(groupBounds!.y + groupBounds!.height / 2 - helpBounds!.y - helpBounds!.height / 2),
    ).toBeLessThan(1)
    expect(centeredChoice.offset).toBeLessThan(1)
    expect(centeredChoice.height).toBeGreaterThanOrEqual(44)
    expect(centeredChoice.height).toBeLessThanOrEqual(48)
    await editor.getByRole('spinbutton', { name: 'Стоимость активации', exact: true }).fill('125')
    await page.screenshot({
      path: info.outputPath('wizard-activation.png'),
      animations: 'disabled',
    })
    server.setPreviewFailure(true)
    await editor
      .getByRole('spinbutton', { name: 'Стоимость активации', exact: true })
      .press('Enter')
    await expect(editor.getByRole('heading', { name: 'Проверка', exact: true })).toBeFocused()
    await expect(editor.getByRole('alert')).toBeVisible()
    await expect(editor.getByRole('button', { name: 'Сохранить', exact: true })).toBeDisabled()
    expect(server.saves).toHaveLength(0)
    server.setPreviewFailure(false)
    await editor.getByRole('button', { name: 'Повторить', exact: true }).click()
    await expect(editor.getByRole('heading', { name: 'Карточка игрока', exact: true })).toHaveCSS(
      'text-align',
      'center',
    )
    await expect(editor.getByRole('heading', { name: 'Карточка ведущего', exact: true })).toHaveCSS(
      'text-align',
      'center',
    )
    await expect(
      editor.getByText('Описание для игрока: выполните условие до конца раунда.', { exact: true }),
    ).toHaveCSS('text-align', 'center')
    await expect(editor.getByRole('region', { name: 'Активация', exact: true })).toContainText(
      'Стоимость активации125',
    )
    await expect(
      editor.getByText(
        'Сверьте карточки игрока и ведущего и проверьте расчётный пример перед сохранением.',
        { exact: true },
      ),
    ).toHaveCount(0)
    await expect(editor.getByText('125', { exact: true })).toBeVisible()
    await expect(editor.getByText('без лимита', { exact: true })).toBeVisible()
    await expect(editor.getByRole('textbox', { name: 'Что изменилось', exact: true })).toHaveCount(
      0,
    )
    for (const name of ['Отмена', 'Назад', 'Сохранить']) {
      const button = editor.getByRole('button', { name, exact: true })
      const bounds = await button.boundingBox()
      expect(bounds).not.toBeNull()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(width === 320 ? 640 : 900)
      expect(bounds!.height).toBeGreaterThanOrEqual(44)
    }
    expect(await editor.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('wizard-review.png'), animations: 'disabled' })
    if (width < 600) {
      await editor.getByRole('button', { name: 'Назад', exact: true }).focus()
      await page.keyboard.press('Tab')
      await expect(editor.getByRole('button', { name: 'Сохранить', exact: true })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(editor.getByRole('button', { name: 'Отмена', exact: true })).toBeFocused()
    }
    server.setSaveFailure(true)
    await editor.getByRole('button', { name: 'Сохранить', exact: true }).click()
    await expect(editor.getByRole('alert')).toBeVisible()
    await expect(editor.getByText('Карточка игрока', { exact: true })).toBeVisible()
    server.setSaveFailure(false)
    await editor.getByRole('button', { name: 'Сохранить', exact: true }).click()
    await expect(editor).toHaveCount(0)
    expect(server.saves).toHaveLength(2)
    expect(server.saves[1]).toMatchObject({
      name: 'Новый модификатор',
      activationCost: 125,
      activationLimit: { count: null },
    })
    expect(errors).toEqual([])
  })
}

for (const width of [390, 1440]) {
  test(`scoring wizard reviews the selected calculation at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    const server = await mockCatalog(page, 'ru')
    await page.goto('/panel/catalog-modifiers')
    await page.getByRole('button', { name: 'Добавить модификатор', exact: true }).click()
    const editor = page.getByRole('dialog')
    await editor.getByRole('combobox', { name: /^Что делает модификатор\?/ }).click()
    await page.getByRole('option', { name: 'Влияет на итог раунда', exact: true }).click()
    await editor.getByRole('textbox', { name: 'Название', exact: true }).fill('Бонус за убийства')
    await editor
      .getByRole('textbox', { name: 'Описание', exact: true })
      .fill('Дополнительные очки за каждое убийство команды.')
    await editor.getByRole('button', { name: 'Далее', exact: true }).click()
    await editor.getByRole('spinbutton', { name: 'Стоимость активации', exact: true }).fill('0')
    await editor.getByRole('button', { name: 'Далее', exact: true }).click()
    await expect(
      editor.getByRole('heading', { name: 'Расчёт результата', exact: true }),
    ).toBeFocused()
    await editor.getByRole('radio', { name: 'Убийства команды', exact: true }).click()
    await editor.getByRole('radio', { name: /Процент стоимости карточки/i }).click()
    await expect(
      editor.getByRole('spinbutton', { name: 'Процент карточки за единицу', exact: true }),
    ).toHaveValue('')
    await editor
      .getByRole('spinbutton', { name: 'Процент карточки за единицу', exact: true })
      .fill('75')
    await page.screenshot({ path: info.outputPath('wizard-scoring.png'), animations: 'disabled' })
    await editor.getByRole('button', { name: 'Далее', exact: true }).click()
    await expect(editor.getByText('Карточка игрока', { exact: true })).toBeVisible()
    await expect(editor.getByText('Шаг 4 из 4', { exact: true })).toBeVisible()
    expect(server.previews).toHaveLength(1)
    expect(server.previews[0]?.behaviorV2.formulaReference).toMatchObject({
      code: 'card_percent_per_unit',
      parameters: { type: 'cardPercentPerUnit', rate: 0.75 },
    })
    expect(server.saves).toHaveLength(0)
    await page.screenshot({
      path: info.outputPath('wizard-scoring-review.png'),
      animations: 'disabled',
    })
  })
}

for (const width of [390, 1440]) {
  test(`archive is fetched explicitly and never appears in live categories at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    const server = await mockCatalog(page, 'ru')
    await page.goto('/panel/catalog-modifiers')
    const list = page.getByTestId('modifier-catalog-list')
    await expect(list.getByRole('button')).toHaveCount(12)
    await expect(list.getByRole('button').first()).toHaveAccessibleName('Без права на ошибку')
    expect(server.archiveRequests()).toBe(0)
    await page
      .getByRole('textbox', { name: 'Поиск модификаторов', exact: true })
      .fill('Архивное правило')
    await expect(list).toHaveCount(0)
    expect(server.archiveRequests()).toBe(0)
    if (width < 600)
      await page
        .getByTestId('modifier-catalog-filters')
        .getByRole('button', { name: 'Фильтры (0)' })
        .click()
    await page.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click()
    await expect(list.getByRole('button')).toHaveCount(12)
    server.setArchiveFailure(true)
    await choose(page, 'Категории', 'Архивные')
    await expect(page.getByRole('button', { name: 'Повторить', exact: true })).toBeVisible()
    await expect(list).toHaveCount(0)
    server.setArchiveFailure(false)
    await page.getByRole('button', { name: 'Повторить', exact: true }).click()
    await expect(list.getByRole('button')).toHaveCount(2)
    await expect(list.getByRole('button', { name: 'Адреналин', exact: true })).toHaveCount(0)
    await list.getByRole('button', { name: 'Архивное правило', exact: true }).click()
    const details = page.getByTestId('modifier-catalog-details')
    await expect(details.getByText(/Модификатор архивирован/)).toBeVisible()
    await expect(details.getByRole('link', { name: 'История', exact: true })).toBeVisible()
    await expect(details.getByRole('button', { name: /Изменить|Удалить/ })).toHaveCount(0)
    await expect(details.getByText('!modifier2', { exact: true })).toHaveCount(0)
    await expect(details.getByText('испытание', { exact: true })).toHaveCount(0)
    await page.screenshot({ path: info.outputPath('archive.png'), animations: 'disabled' })
    if (width < 1200) await page.keyboard.press('Escape')
    for (const category of [/^Перед раундом/, /^Во время раунда/, /^На итог раунда/]) {
      await choose(page, 'Категории', category)
      await expect(list.getByRole('button')).toHaveCount(4)
      await expect(list.getByRole('button', { name: /^Архив/ })).toHaveCount(0)
    }
    await choose(page, 'Категории', 'Все категории')
    await expect(list.getByRole('button')).toHaveCount(12)
    await expect(list.getByRole('button', { name: /^Архив/ })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('deleted modifier moves into the explicit read-only archive', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockCatalog(page, 'ru')
  await page.goto('/panel/catalog-modifiers')
  const list = page.getByTestId('modifier-catalog-list')
  await list.getByRole('button', { name: 'Адреналин', exact: true }).click()
  await page
    .getByTestId('modifier-catalog-details')
    .getByRole('button', { name: 'Удалить', exact: true })
    .click()
  const confirmation = page.getByRole('dialog')
  await confirmation.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(confirmation.getByRole('alert')).toBeVisible()
  await confirmation.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(confirmation).toHaveCount(0)
  await expect(list.getByRole('button')).toHaveCount(11)
  await expect(list.getByRole('button', { name: 'Адреналин', exact: true })).toHaveCount(0)
  await choose(page, 'Категории', 'Архивные')
  await expect(list.getByRole('button')).toHaveCount(3)
  await list.getByRole('button', { name: 'Адреналин', exact: true }).click()
  await expect(
    page.getByTestId('modifier-catalog-details').getByText(/Модификатор архивирован/),
  ).toBeVisible()
})

for (const width of [390, 1440]) {
  test(`rule wizard rejects invalid amounts and explains choices at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    const server = await mockCatalog(page, 'ru')
    await page.goto('/panel/catalog-modifiers')
    await page.getByRole('button', { name: 'Добавить модификатор', exact: true }).click()
    const editor = page.getByRole('dialog')
    await expect(editor.getByRole('textbox', { name: 'Название', exact: true })).toHaveValue('')
    await expect(editor.getByRole('textbox', { name: 'Описание', exact: true })).toHaveValue('')
    await editor.getByRole('textbox', { name: 'Название', exact: true }).fill('Свой таймер')
    await editor
      .getByRole('textbox', { name: 'Описание', exact: true })
      .fill('Полное описание условия с таймером.')
    await editor.getByRole('button', { name: 'Далее', exact: true }).click()
    await expect(editor.getByRole('textbox', { name: /Правило|Команда активации/ })).toHaveCount(0)
    await expect(editor.getByText('Дополнительные настройки', { exact: true })).toHaveCount(0)
    const cost = editor.getByRole('spinbutton', { name: 'Стоимость активации', exact: true })
    const limit = editor.getByRole('spinbutton', { name: 'Лимит активаций', exact: true })
    await expect(cost).toHaveValue('')
    const timerChoice = editor.getByRole('radio', { name: 'Да, есть таймер', exact: true })
    await page.mouse.move(0, 0)
    await page.keyboard.press('Tab')
    await timerChoice.focus()
    await expect(timerChoice).toHaveAccessibleDescription(
      'Каждая активация добавляет отдельный интервал времени.',
    )
    await expect(page.getByRole('tooltip')).toContainText(
      'Каждая активация добавляет отдельный интервал времени.',
    )
    await page.screenshot({ path: info.outputPath('choice-tooltip.png'), animations: 'disabled' })
    await timerChoice.check()
    const duration = editor.getByRole('spinbutton', { name: 'Длительность, секунд', exact: true })
    await expect(duration).toHaveValue('')
    await expect(duration).toHaveAttribute('min', '1')
    await expect(cost).toHaveAttribute('min', '0')
    await expect(limit).toHaveAttribute('min', '1')
    await cost.fill('-1')
    await limit.fill('0')
    await duration.fill('0')
    await editor.getByRole('button', { name: 'Далее', exact: true }).click()
    await expect(cost).toHaveAttribute('aria-invalid', 'true')
    await expect(limit).toHaveAttribute('aria-invalid', 'true')
    await expect(duration).toHaveAttribute('aria-invalid', 'true')
    expect(server.previews).toHaveLength(0)
    await page.screenshot({ path: info.outputPath('invalid-amounts.png'), animations: 'disabled' })
    await cost.fill('0')
    await limit.fill('1')
    await duration.fill('1')
    await editor.getByRole('button', { name: 'Далее', exact: true }).click()
    await expect(editor.getByText('Карточка игрока', { exact: true })).toBeVisible()
    expect(server.previews).toHaveLength(1)
    expect(server.previews[0]).toMatchObject({
      activationCost: 0,
      activationLimit: { count: 1 },
      activationCommand: null,
      description: 'Полное описание условия с таймером.',
      behaviorV2: { durationSecondsPerActivation: 1, rule: 'Полное описание условия с таймером.' },
    })
    await expect(editor.getByText('!modifier', { exact: true })).toHaveCount(0)
    await expect(editor.getByRole('region', { name: 'Активация', exact: true })).toContainText(
      'Нет',
    )
  })
}

for (const width of [1440, 768, 390]) {
  test(`editing requires a comment and preserves saved content at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    const server = await mockCatalog(page, 'ru')
    await page.goto('/panel/catalog-modifiers')
    await page
      .getByTestId('modifier-catalog-list')
      .getByRole('button', { name: 'Без права на ошибку', exact: true })
      .click()
    await page
      .getByTestId('modifier-catalog-details')
      .getByRole('button', { name: 'Изменить', exact: true })
      .click()
    const editor = page.getByRole('dialog', { name: 'Редактирование модификатора', exact: true })
    await expect(editor.getByRole('textbox', { name: 'Описание', exact: true })).toHaveValue(
      catalog[1]!.description,
    )
    await editor.getByRole('button', { name: 'Далее', exact: true }).click()
    await expect(
      editor.getByRole('spinbutton', { name: 'Стоимость активации', exact: true }),
    ).toHaveValue('0')
    await expect(
      editor.getByRole('spinbutton', { name: 'Лимит активаций', exact: true }),
    ).toHaveValue('2')
    await expect(
      editor.getByRole('spinbutton', { name: 'Длительность, секунд', exact: true }),
    ).toHaveValue('60')
    await page.screenshot({
      path: info.outputPath('edit-saved-values.png'),
      animations: 'disabled',
    })
    await editor.getByRole('button', { name: 'Далее', exact: true }).click()
    await expect(editor.getByRole('textbox', { name: /^Что изменилось/ })).toBeVisible()
    expect(server.previews[0]).toMatchObject({
      description: catalog[1]!.description,
      activationCost: 0,
      activationLimit: { count: 2 },
      activationCommand: '!modifier2',
      behaviorV2: { durationSecondsPerActivation: 60, rule: catalog[1]!.description },
    })
    await expect(editor.getByText('!modifier2', { exact: true })).toHaveCount(0)
    const comment = editor.getByRole('textbox', { name: /^Что изменилось/ })
    await expect(comment).toHaveAttribute('required', '')
    const save = editor.getByRole('button', { name: 'Сохранить', exact: true })
    for (const value of ['', '   ']) {
      await comment.fill(value)
      await save.click()
      await expect(comment).toHaveAttribute('aria-invalid', 'true')
      await expect(editor.getByText('Поле обязательно.', { exact: true })).toBeVisible()
      await expect(comment).toBeFocused()
      expect(server.saves).toHaveLength(0)
    }
    await comment.fill('  Уточнено описание условия.  ')
    await page.screenshot({
      path: info.outputPath('required-edit-comment.png'),
      animations: 'disabled',
    })
    await save.click()
    await expect(editor).toHaveCount(0)
    expect(server.saves).toHaveLength(1)
    expect(server.saves[0]).toMatchObject({
      changeNote: 'Уточнено описание условия.',
      expectedRevision: catalog[1]!.revision,
    })
  })
}

test('choice explanations are available by touch without leaving the wizard', async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 900 },
    hasTouch: true,
  })
  const page = await context.newPage()
  try {
    await mockCatalog(page, 'ru')
    await page.goto('/panel/catalog-modifiers')
    await page.getByRole('button', { name: 'Добавить модификатор', exact: true }).tap()
    const editor = page.getByRole('dialog')
    await editor.getByRole('textbox', { name: 'Название', exact: true }).fill('Новое правило')
    await editor
      .getByRole('textbox', { name: 'Описание', exact: true })
      .fill('Полное описание правила.')
    await editor.getByRole('button', { name: 'Далее', exact: true }).tap()
    const option = editor.getByRole('radio', { name: 'Ведущий', exact: true })
    await option.tap()
    await expect(option).toBeChecked()
    await expect(page.getByRole('tooltip')).toContainText(
      'Действие выполняет ведущий, а результат учитывается для команды.',
    )
    await page.screenshot({
      path: info.outputPath('touch-choice-help.png'),
      animations: 'disabled',
    })
    await expect(editor).toBeVisible()
  } finally {
    await context.close()
  }
})

for (const width of [390, 1440]) {
  test(`conflict picker shows emoji and category and preserves the selected ID at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    const server = await mockCatalog(page, 'ru')
    await page.goto('/panel/catalog-modifiers')
    await page.getByRole('button', { name: 'Добавить модификатор', exact: true }).click()
    const editor = page.getByRole('dialog')
    await editor
      .getByRole('textbox', { name: 'Название', exact: true })
      .fill('Правило с конфликтом')
    await editor
      .getByRole('textbox', { name: 'Описание', exact: true })
      .fill('Описание несовместимого правила.')
    await editor.getByRole('button', { name: 'Далее', exact: true }).click()
    await editor.getByRole('spinbutton', { name: 'Стоимость активации', exact: true }).fill('0')
    const conflicts = editor.getByRole('combobox', { name: 'Конфликты', exact: true })
    await conflicts.fill('Двойная ставка')
    const locked = page.getByRole('option', { name: /Двойная ставка/ })
    await expect(locked).toHaveAttribute('aria-disabled', 'true')
    await expect(locked).toContainText(
      'В активной игре. Конфликты можно изменить после её завершения.',
    )
    await page.screenshot({
      path: info.outputPath('locked-conflict-option.png'),
      animations: 'disabled',
    })
    await conflicts.fill('Адреналин')
    const option = page.getByRole('option', { name: 'Адреналин Во время раунда', exact: true })
    await expect(option).toBeVisible()
    await expect(option).toContainText('⚡')
    await page.screenshot({ path: info.outputPath('conflict-options.png'), animations: 'disabled' })
    await option.click()
    await expect(editor.getByRole('button', { name: '⚡ Адреналин', exact: true })).toBeVisible()
    await editor.getByRole('button', { name: 'Далее', exact: true }).click()
    await expect(
      editor.getByRole('heading', { name: 'Карточка игрока', exact: true }),
    ).toBeVisible()
    expect(server.previews[0]?.conflictingModifierIds).toEqual([catalog[0]!.id])
    await expect(editor.getByRole('region', { name: 'Активация', exact: true })).toContainText(
      '⚡ Адреналин',
    )
    await page.screenshot({ path: info.outputPath('review-conflicts.png'), animations: 'disabled' })
    expect(await editor.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    )
  })
}

test('a conflict locked during saving returns to activation and preserves the draft for correction', async ({
  page,
}, info) => {
  const server = await mockCatalog(page, 'ru')
  await page.goto('/panel/catalog-modifiers')
  await page.getByRole('button', { name: 'Добавить модификатор', exact: true }).click()
  const editor = page.getByRole('dialog')
  await editor.getByRole('textbox', { name: 'Название', exact: true }).fill('Сохранённый черновик')
  await editor
    .getByRole('textbox', { name: 'Описание', exact: true })
    .fill('Описание не должно потеряться.')
  await editor.getByRole('button', { name: 'Далее', exact: true }).click()
  await editor.getByRole('spinbutton', { name: 'Стоимость активации', exact: true }).fill('25')
  await editor.getByRole('combobox', { name: 'Конфликты', exact: true }).fill('Адреналин')
  await page.getByRole('option', { name: 'Адреналин Во время раунда', exact: true }).click()
  await editor.getByRole('button', { name: 'Далее', exact: true }).click()
  await expect(editor.getByRole('heading', { name: 'Карточка игрока', exact: true })).toBeVisible()
  server.lockConflictOnSave()
  await editor.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(
    editor.getByRole('heading', { name: 'Условия и активация', exact: true }),
  ).toBeFocused()
  await expect(
    editor.getByText(
      'Связанный модификатор включён в активную игру. Это изменение возможно после её завершения.',
      { exact: true },
    ),
  ).toBeVisible()
  await expect(
    editor.getByRole('spinbutton', { name: 'Стоимость активации', exact: true }),
  ).toHaveValue('25')
  const conflicts = editor.getByRole('combobox', { name: 'Конфликты', exact: true })
  await expect(conflicts).toHaveAttribute('aria-invalid', 'true')
  await page.screenshot({
    path: info.outputPath('locked-conflict-draft-preserved.png'),
    animations: 'disabled',
  })
  await conflicts.focus()
  await conflicts.press('Backspace')
  await expect(editor.getByRole('button', { name: '⚡ Адреналин', exact: true })).toHaveCount(0)
  await editor.getByRole('button', { name: 'Назад', exact: true }).click()
  await expect(editor.getByRole('textbox', { name: 'Название', exact: true })).toHaveValue(
    'Сохранённый черновик',
  )
  await expect(editor.getByRole('textbox', { name: 'Описание', exact: true })).toHaveValue(
    'Описание не должно потеряться.',
  )
  await editor.getByRole('button', { name: 'Далее', exact: true }).click()
  await editor.getByRole('button', { name: 'Далее', exact: true }).click()
  await expect(editor.getByRole('heading', { name: 'Карточка игрока', exact: true })).toBeVisible()
  await editor.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(editor).toHaveCount(0)
  expect(server.saves).toHaveLength(2)
  expect(server.saves[1]).toMatchObject({
    name: 'Сохранённый черновик',
    activationCost: 25,
    conflictingModifierIds: [],
  })
})

test('editing unrelated fields preserves an existing conflict with a locked modifier', async ({
  page,
}) => {
  const server = await mockCatalog(page, 'ru')
  server.lockModifier(catalog[1]!.id)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/panel/catalog-modifiers')
  await page
    .getByTestId('modifier-catalog-list')
    .getByRole('button', { name: 'Адреналин', exact: true })
    .click()
  await page
    .getByTestId('modifier-catalog-details')
    .getByRole('button', { name: 'Изменить', exact: true })
    .click()
  const editor = page.getByRole('dialog')
  await editor.getByRole('button', { name: 'Далее', exact: true }).click()
  const conflicts = editor.getByRole('combobox', { name: 'Конфликты', exact: true })
  await expect(editor.getByText('🎯 Без права на ошибку', { exact: true })).toBeVisible()
  await conflicts.focus()
  await conflicts.press('Backspace')
  await expect(editor.getByText('🎯 Без права на ошибку', { exact: true })).toBeVisible()
  await editor.getByRole('spinbutton', { name: 'Стоимость активации', exact: true }).fill('75')
  await editor.getByRole('button', { name: 'Далее', exact: true }).click()
  await editor
    .getByRole('textbox', { name: 'Что должен ввести ведущий?', exact: true })
    .fill('Условие выполнено')
  await editor.getByRole('button', { name: 'Далее', exact: true }).click()
  await expect(editor.getByRole('heading', { name: 'Карточка игрока', exact: true })).toBeVisible()
  expect(server.previews[0]).toMatchObject({
    activationCost: 75,
    conflictingModifierIds: [catalog[1]!.id],
  })
})

test('discard confirmation has a one-word action and preserves the draft when cancelled', async ({
  page,
}, info) => {
  await mockCatalog(page, 'ru')
  await page.goto('/panel/catalog-modifiers')
  await page.getByRole('button', { name: 'Добавить модификатор', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Новый модификатор', exact: true })
  await editor.getByRole('textbox', { name: 'Название', exact: true }).fill('Мой черновик')
  await editor.getByRole('button', { name: 'Отмена', exact: true }).click()
  const confirmation = page.getByRole('dialog', {
    name: 'Отменить несохранённые изменения?',
    exact: true,
  })
  await expect(confirmation.getByRole('button', { name: 'Сбросить', exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('discard-one-word.png'), animations: 'disabled' })
  await confirmation.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(editor.getByRole('textbox', { name: 'Название', exact: true })).toHaveValue(
    'Мой черновик',
  )
  await editor.getByRole('button', { name: 'Отмена', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Сбросить', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('an existing conflict removed before the other modifier locks can be restored after refusal', async ({
  page,
}) => {
  const server = await mockCatalog(page, 'ru')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route(`**/api/game/modifiers/${catalog[0]!.id}`, async (route) => {
    server.lockModifier(catalog[1]!.id)
    await route.fulfill({ status: 409, json: { code: 'game_modifier_compatibility_locked' } })
  })
  await page.goto('/panel/catalog-modifiers')
  await page
    .getByTestId('modifier-catalog-list')
    .getByRole('button', { name: 'Адреналин', exact: true })
    .click()
  await page
    .getByTestId('modifier-catalog-details')
    .getByRole('button', { name: 'Изменить', exact: true })
    .click()
  const editor = page.getByRole('dialog')
  await editor.getByRole('button', { name: 'Далее', exact: true }).click()
  const conflicts = editor.getByRole('combobox', { name: 'Конфликты', exact: true })
  await conflicts.focus()
  await conflicts.press('Backspace')
  await expect(editor.getByText('🎯 Без права на ошибку', { exact: true })).toHaveCount(0)
  await editor.getByRole('button', { name: 'Далее', exact: true }).click()
  await editor
    .getByRole('textbox', { name: 'Что должен ввести ведущий?', exact: true })
    .fill('Условие выполнено')
  await editor.getByRole('button', { name: 'Далее', exact: true }).click()
  await expect(editor.getByRole('heading', { name: 'Карточка игрока', exact: true })).toBeVisible()
  await editor.getByRole('textbox', { name: /^Что изменилось/ }).fill('Убран конфликт.')
  await editor.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(
    editor.getByRole('heading', { name: 'Условия и активация', exact: true }),
  ).toBeFocused()
  await conflicts.fill('Без права на ошибку')
  const original = page.getByRole('option', { name: /^Без права на ошибку/ })
  await expect(original).toHaveAttribute('aria-disabled', 'false')
  await expect(original).toContainText('В активной игре.')
  await original.click()
  await expect(editor.getByText('🎯 Без права на ошибку', { exact: true })).toBeVisible()
  await editor.getByRole('button', { name: 'Далее', exact: true }).click()
  await editor.getByRole('button', { name: 'Далее', exact: true }).click()
  await expect(editor.getByRole('heading', { name: 'Карточка игрока', exact: true })).toBeVisible()
  expect(server.previews[1]?.conflictingModifierIds).toEqual([catalog[1]!.id])
})

for (const viewport of [
  { width: 1440, height: 1200 },
  { width: 390, height: 500 },
  { width: 768, height: 700 },
]) {
  test(`catalog list fills the viewport and scrolls internally at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport)
    await mockCatalog(page, 'ru')
    await page.goto('/panel/catalog-modifiers')
    const panel = page.getByTestId('modifier-catalog-list')
    await expect(panel.getByRole('button')).toHaveCount(12)
    await page.evaluate(() => document.fonts.ready)
    const assertBounded = async () => {
      const box = await panel.boundingBox()
      const contentBottom = await page
        .getByRole('main')
        .evaluate(
          (main) =>
            main.getBoundingClientRect().bottom - parseFloat(getComputedStyle(main).paddingBottom),
        )
      expect(Math.abs(box!.y + box!.height - contentBottom)).toBeLessThan(1)
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
        true,
      )
    }
    await assertBounded()
    if (viewport.width < 600) {
      await page
        .getByTestId('modifier-catalog-filters')
        .getByRole('button', { name: 'Фильтры (0)', exact: true })
        .click()
      await assertBounded()
      await page.screenshot({
        path: info.outputPath('short-expanded-filters.png'),
        animations: 'disabled',
      })
      await page
        .getByTestId('modifier-catalog-filters')
        .getByRole('button', { name: 'Фильтры (0)', exact: true })
        .click()
    }
    const scroller = panel.getByRole('region', { name: 'Модификаторы', exact: true })
    await scroller.focus()
    await scroller.press('End')
    await expect(
      panel.getByRole('button', { name: 'Штраф за промах', exact: true }),
    ).toBeInViewport()
    await assertBounded()
    await page.getByRole('textbox', { name: 'Поиск модификаторов', exact: true }).fill('Адреналин')
    await expect(panel.getByRole('button')).toHaveCount(1)
    await assertBounded()
    await page.screenshot({
      path: info.outputPath('sparse-full-height-list.png'),
      animations: 'disabled',
    })
    await page.setViewportSize({ width: viewport.width, height: viewport.height + 200 })
    const resized = await panel.boundingBox()
    const resizedBottom = await page
      .getByRole('main')
      .evaluate(
        (main) =>
          main.getBoundingClientRect().bottom - parseFloat(getComputedStyle(main).paddingBottom),
      )
    expect(Math.abs(resized!.y + resized!.height - resizedBottom)).toBeLessThan(1)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    )
  })
}

for (const width of [390, 1440]) {
  test(`conflict choices separate available and active-game groups at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    const server = await mockCatalog(page, 'ru')
    server.lockModifier(catalog[3]!.id)
    server.lockModifier(catalog[4]!.id)
    await page.goto('/panel/catalog-modifiers')
    await page.getByRole('button', { name: 'Добавить модификатор', exact: true }).click()
    const editor = page.getByRole('dialog')
    await editor
      .getByRole('textbox', { name: 'Название', exact: true })
      .fill('Правило с конфликтами')
    await editor.getByRole('textbox', { name: 'Описание', exact: true }).fill('Описание правила.')
    await editor.getByRole('button', { name: 'Далее', exact: true }).click()
    const input = editor.getByRole('combobox', { name: 'Конфликты', exact: true })
    await input.click()
    const listbox = page.getByRole('listbox')
    const available = listbox.getByRole('group', { name: 'Доступные', exact: true })
    const locked = listbox.getByRole('group', { name: 'В активной игре', exact: true })
    await expect(available.getByRole('option')).toHaveCount(9)
    await expect(locked.getByRole('option')).toHaveCount(3)
    for (const option of await locked.getByRole('option').all()) {
      await expect(option).toHaveAttribute('aria-disabled', 'true')
    }
    await expect(listbox.getByRole('separator')).toHaveCount(1)
    await locked.getByRole('option').last().scrollIntoViewIfNeeded()
    await page.screenshot({
      path: info.outputPath('conflict-group-divider.png'),
      animations: 'disabled',
    })
    await input.fill('Двойная ставка')
    await expect(listbox.getByRole('group', { name: 'Доступные', exact: true })).toHaveCount(0)
    await expect(listbox.getByRole('separator')).toHaveCount(0)
    await input.fill('Адреналин')
    await expect(listbox.getByRole('group', { name: 'В активной игре', exact: true })).toHaveCount(
      0,
    )
    await expect(listbox.getByRole('separator')).toHaveCount(0)
    await input.press('ArrowDown')
    await input.press('Enter')
    await expect(editor.getByRole('button', { name: '⚡ Адреналин', exact: true })).toBeVisible()
  })
}
