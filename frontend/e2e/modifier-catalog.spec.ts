import { expect, test, type Page } from '@playwright/test'
import type { GameModifierDefinition } from '../src/shared/api/contracts/index.ts'

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
  let deletes = 0
  let failDelete = true
  let failCatalog = false
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
      if (path === '/api/game/modifiers/catalog')
        return failCatalog ? route.fulfill({ status: 500 }) : route.fulfill({ json: items })
      if (route.request().method() === 'DELETE') {
        deletes++
        if (failDelete) {
          failDelete = false
          return route.fulfill({ status: 409, json: { code: 'game_modifier_content_locked' } })
        }
        items = items.filter((item) => !path.endsWith(item.id))
      }
      return route.fulfill({ status: 204 })
    },
  )
  return {
    deletes: () => deletes,
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
    await expect(details.getByText('Без права на ошибку', { exact: true })).toBeVisible()
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

test('combined filters, cost ordering, reset and locked records', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await mockCatalog(page)
  await page.goto('/panel/catalog-modifiers')
  const list = page.getByTestId('modifier-catalog-list')
  await expect(list.getByRole('button')).toHaveCount(12)
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
  await list.getByRole('button', { name: 'Двойная ставка', exact: true }).click()
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
