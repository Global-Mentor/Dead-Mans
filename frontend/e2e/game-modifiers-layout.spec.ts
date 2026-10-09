import { expect, test, type Page } from '@playwright/test'
import { realtimeHubs } from '../src/shared/realtime/generated.ts'

const longTeamName = 'Команда исследователей заброшенного порта'
const longCardTitle = 'Последний бой за сокровища затонувшего корабля'
const longParticipantName = 'ОченьДлинныйНикИгрокаБезПробелов'

async function expectEqualSummaryCells(page: Page) {
  const cells = [
    'modifier-ordering-cell',
    'modifier-available-points-cell',
    'modifier-round-spent-cell',
    'modifier-personal-spent-cell',
  ]
  const bounds = await Promise.all(cells.map((id) => page.getByTestId(id).boundingBox()))
  for (const box of bounds) {
    expect(box).not.toBeNull()
    expect(Math.abs(box!.height - bounds[0]!.height)).toBeLessThanOrEqual(1)
  }
  expect(Math.abs(bounds[0]!.y - bounds[1]!.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(bounds[2]!.y - bounds[3]!.y)).toBeLessThanOrEqual(1)
  expect(bounds[2]!.y - bounds[0]!.y - bounds[0]!.height).toBeCloseTo(1, 0)
  for (const id of cells) {
    const offsets = await page.getByTestId(id).evaluate((cell) => {
      const frame = cell.getBoundingClientRect()
      const content = cell.querySelector('dl')!.getBoundingClientRect()
      return {
        x: content.x + content.width / 2 - frame.x - frame.width / 2,
        y: content.y + content.height / 2 - frame.y - frame.height / 2,
      }
    })
    expect(Math.abs(offsets.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(offsets.y)).toBeLessThanOrEqual(1)
  }
}

const modifiers = Array.from({ length: 18 }, (_, index) => ({
  modifier: {
    id: `modifier-${index + 1}`,
    category: index < 6 ? 'preparation' : index < 12 ? 'round' : 'result',
    name: `Модификатор ${index + 1}`,
    description:
      'Понятное описание эффекта с достаточно длинным текстом для проверки адаптивной компоновки карточки.',
    activationCost: (index % 5) + 1,
    activationLimit: index % 3 === 0 ? { count: 2 } : null,
    conflictingModifierIds: [],
    iconEmoji: index % 2 === 0 ? '⚓' : '🧭',
    activationCommand: null,
    revision: 1,
    normalizedTags: [],
    behaviorV2: {
      schemaVersion: 2,
      kind: 'rule',
      phase: 'round',
      performer: 'activeTeam',
      requiresHostMonitoring: false,
      rule: 'Тестовое правило',
      stackingPolicy: 'aggregateParameters',
      resolution: { type: 'ruleStatus' },
      reward: 'none',
      formulaReference: null,
    },
  },
  isActive: index === 0,
  canActivate: true,
  blockedReason: null,
  activationsCount: index === 0 ? 1 : 0,
  limit: index % 3 === 0 ? 2 : null,
}))

for (const width of [390, 768, 1440]) {
  test(`compact modifier management preserves its draft at ${width}px`, async ({ page }, info) => {
    page.on('pageerror', (error) => {
      throw error
    })
    await page.setViewportSize({ width, height: 844 })
    await mockModifiers(page, { role: 'admin' })
    await page.route('**/api/game/modifiers/admin/players', (route) =>
      route.fulfill({
        json: {
          players: [
            {
              userId: 'player',
              login: 'player',
              displayName: 'Капитан Флинт',
              availableQuizPoints: 17,
            },
          ],
          summary: {
            playersCount: 1,
            totalAvailableQuizPoints: 17,
            totalEarnedQuizPoints: 20,
            totalSpentQuizPoints: 3,
          },
        },
      }),
    )
    await page.route('**/api/game/modifiers/admin/state/*', (route) =>
      route.fulfill({
        json: {
          availableQuizPoints: 17,
          earnedQuizPoints: 20,
          spentQuizPoints: 3,
          isOrderingOpen: true,
          activeModifiers: [],
          availableModifiers: modifiers,
        },
      }),
    )
    await page.route('**/api/game/modifiers/catalog', (route) =>
      route.fulfill({ json: modifiers.map((item) => item.modifier) }),
    )
    await page.route('**/api/game/modifiers/admin/activations', (route) =>
      route.fulfill({
        json: Array.from({ length: 3 }, (_, index) => ({
          activationId: `activation-${index}`,
          roundId: 'round',
          roundVersion: 3,
          modifierId: modifiers[1]!.modifier.id,
          modifierName: modifiers[1]!.modifier.name,
          activatedByUserId: index === 2 ? 'other-player' : 'player',
          activatedByDisplayName: index === 2 ? 'Ворон' : 'Капитан Флинт',
          activationCost: 3,
          activatedAtUtc: `2026-10-06T18:0${index}:00Z`,
        })),
      }),
    )
    await page.goto('/panel/game-modifiers')
    await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
    await page.getByRole('tab', { name: 'Управление модификаторами', exact: true }).click()
    const panel = page.getByTestId('admin-tool-drawer-scroll-body')
    const activation = panel.getByRole('region', { name: 'Добавить модификатор' })
    await expect(activation.getByRole('combobox', { name: 'Игрок', exact: true })).toHaveValue(
      'Капитан Флинт',
    )
    const player = activation.getByRole('combobox', { name: 'Игрок', exact: true })
    await player.click()
    await player.fill('player')
    await expect(page.getByRole('option')).toHaveCount(1)
    await expect(page.getByRole('option')).toHaveText('Капитан Флинт')
    await page.getByRole('option').click()
    const modifier = activation.getByRole('combobox', { name: 'Модификатор', exact: true })
    await modifier.click()
    const firstOption = page.getByRole('option').first()
    await expect(firstOption).toBeVisible()
    expect(
      await firstOption.evaluate((element) =>
        parseFloat(getComputedStyle(element).borderBottomWidth),
      ),
    ).toBeGreaterThan(0)
    await page.getByRole('option').filter({ hasText: 'Модификатор 2' }).first().click()
    const cancellation = panel.getByRole('region', { name: 'Отменить модификатор' })
    await cancellation.getByRole('combobox', { name: 'Модификатор', exact: true }).click()
    await expect(page.getByRole('option')).toHaveCount(1)
    await expect(page.getByRole('option')).toContainText('×3')
    await page.getByRole('option').click()
    await cancellation.getByRole('combobox', { name: 'Игрок', exact: true }).click()
    await expect(page.getByRole('option')).toHaveCount(2)
    await page.getByRole('option', { name: 'Ворон', exact: true }).click()
    await cancellation
      .getByRole('textbox', { name: 'Причина отмены', exact: true })
      .fill('Ошибочная активация')
    await expect(
      cancellation.getByRole('button', { name: 'Отменить и вернуть очки', exact: true }),
    ).toBeEnabled()
    const stopHeader = panel.getByRole('button', { name: 'Остановить модификатор', exact: true })
    await stopHeader.locator('span[tabindex="0"]').hover()
    const stopHelp = page.getByRole('tooltip').filter({ hasText: 'Запрещает всем игрокам' })
    await expect(stopHelp).toBeVisible()
    await expect(stopHelp).toHaveAttribute('data-popper-placement', width >= 768 ? 'left' : 'top')
    await stopHeader.click()
    const stopping = panel.getByRole('region', { name: 'Остановить модификатор' })
    await stopping.getByRole('combobox', { name: 'Модификатор', exact: true }).click()
    await page.getByRole('option').filter({ hasText: 'Модификатор 3' }).first().click()
    const reason = stopping.getByRole('textbox', {
      name: 'Причина аварийного отключения',
      exact: true,
    })
    await reason.fill('Проверка сохранения черновика')
    await page.getByRole('tab', { name: 'Управление игрой', exact: true }).click()
    await page.getByRole('tab', { name: 'Управление модификаторами', exact: true }).click()
    await expect(reason).toHaveValue('Проверка сохранения черновика')
    await page.getByRole('button', { name: 'Закрыть инструменты управления', exact: true }).click()
    await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
    await expect(reason).toHaveValue('Проверка сохранения черновика')
    await expect(modifier).toHaveValue('Модификатор 2')
    expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    const drawer = page.getByRole('complementary', { name: 'Инструменты управления игрой' })
    await expect
      .poll(() =>
        page
          .getByRole('dialog', { name: 'Инструменты управления игрой' })
          .evaluate((element) => parseFloat(getComputedStyle(element).width)),
      )
      .toBe(Math.min(width, 440))
    await drawer.screenshot({
      path: info.outputPath('compact-modifier-management.png'),
      animations: 'disabled',
    })
  })
}

async function mockModifiers(
  page: Page,
  options: { locale?: string; role?: string; orderingOpen?: boolean; longNames?: boolean } = {},
) {
  await page.addInitScript(
    (locale) => localStorage.setItem('i18nextLng', locale),
    options.locale ?? 'ru',
  )
  let refreshFailed = false
  let notifyChanged = () => {}
  await page.routeWebSocket(/\/hubs\/game-board/, (socket) => {
    notifyChanged = () =>
      socket.send(
        `${JSON.stringify({ type: 1, target: realtimeHubs.gameBoard.events.modifierAvailabilityChanged, arguments: [] })}\u001e`,
      )
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
      if (path.includes('/negotiate'))
        return route.fulfill({
          json: {
            connectionId: 'modifiers',
            connectionToken: 'modifiers',
            negotiateVersion: 1,
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
          },
        })
      if (route.request().method() !== 'GET') return route.fulfill({ status: 204 })
      if (path === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
            displayName: 'Игрок',
            roles: [options.role ?? 'viewer'],
          },
        })
      if (path === '/api/game/modifiers/state') {
        if (refreshFailed) return route.fulfill({ status: 503 })
        return route.fulfill({
          json: {
            gameId: 'game-1',
            availableQuizPoints: options.longNames ? 999999 : 24,
            spentQuizPoints: options.longNames ? 0 : 9,
            earnedQuizPoints: options.longNames ? 999999 : 33,
            isOrderingOpen: options.orderingOpen ?? true,
            activeModifiers: [
              {
                activationId: 'activation-1',
                roundId: 'round-1',
                roundVersion: 1,
                modifierId: 'modifier-1',
                modifierName: 'Модификатор 1',
                activatedByUserId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
                activatedByDisplayName: 'Игрок',
                activationCost: 1,
                activatedAtUtc: '2026-09-21T18:01:00Z',
              },
            ],
            availableModifiers: modifiers.map((item, index) => ({
              ...item,
              ...(options.orderingOpen === false
                ? { canActivate: false, blockedReason: 'ordering_closed' }
                : {}),
              modifier:
                options.longNames && index === 17
                  ? {
                      ...item.modifier,
                      name: 'Очень длинное название модификатора для проверки переноса строк и доступности действий',
                    }
                  : item.modifier,
            })),
          },
        })
      }
      if (path === '/api/game')
        return route.fulfill({
          json: {
            gameId: 'game-1',
            status: 'active',
            title: 'Игра',
            version: 1,
            rows: 1,
            cols: 1,
            rowLabels: ['Сложность'],
            colLabels: ['Категория'],
            cells: [
              {
                id: 'cell-1',
                row: 0,
                col: 0,
                cellType: 'regular',
                title: options.longNames ? longCardTitle : 'Битва в порту',
                description: null,
                cost: 500,
                state: 'open',
                media: [],
              },
            ],
            enabledModifierIds: modifiers.map((item) => item.modifier.id),
            activeModifiers: [],
            activeTeamId: 'team-1',
          },
        })
      if (path === '/api/game/rounds/active')
        return route.fulfill({
          json: {
            roundId: 'round-1',
            gameId: 'game-1',
            cellId: 'cell-1',
            teamId: 'team-1',
            teamName: options.longNames ? longTeamName : 'Морские волки',
            teamSlotIndex: 2,
            status: options.orderingOpen === false ? 'in_progress' : 'awaiting_modifiers',
            roundVersion: 1,
            startedAtUtc: '2026-09-21T18:00:00Z',
            finishedAtUtc: null,
            baseScore: 0,
            finalScore: null,
            emptyCardPenaltyApplied: false,
            scoreDetails: {
              baseScore: 0,
              bountyScore: 0,
              modifierScore: 0,
              penaltyTotal: 0,
              finalScore: 0,
            },
            killsCount: 0,
            bountyCount: 0,
            notes: null,
            participants: [
              { userId: 'team-user-1', displayName: 'Капитан Флинт' },
              { userId: 'team-user-2', displayName: 'Энн Бонни' },
              ...(options.longNames
                ? [{ userId: 'team-user-3', displayName: longParticipantName }]
                : []),
            ],
            modifierResults: [],
          },
        })
      return route.fulfill({ status: 204 })
    },
  )
  return {
    failRefresh: () => {
      refreshFailed = true
      notifyChanged()
    },
  }
}

for (const size of [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]) {
  test(`modifier lists stay inside the viewport at ${size.width}x${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size)
    await mockModifiers(page)
    await page.goto('/panel/game-modifiers')

    const summary = page.getByRole('region', { name: 'Краткая сводка' })
    const available = page.getByTestId('available-modifiers-section')
    await expect(summary).toBeVisible()
    const orderingStatus = summary.getByRole('status', { name: 'Статус заказа', exact: true })
    await expect(orderingStatus).toContainText('Заказ открыт')
    await expect(orderingStatus.locator('.MuiChip-root, button')).toHaveCount(0)
    await expect(orderingStatus).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(page.getByRole('heading', { name: 'Модификаторы', exact: true })).toHaveCount(0)
    expect((await summary.boundingBox())!.height).toBeLessThanOrEqual(110)
    await expectEqualSummaryCells(page)
    for (const name of ['Потрачено за раунд', 'Доступно очков', 'Потрачено вами']) {
      const metric = summary.getByRole('group', { name, exact: true })
      await expect(metric.locator('dt')).toHaveCSS('font-weight', '700')
      await expect(metric.locator('dd')).toHaveCSS('font-weight', '400')
    }
    await expect(summary.getByText('Морские волки')).toBeVisible()
    await expect(summary.getByText('Битва в порту')).toBeVisible()
    await expect(
      summary.getByRole('button', { name: 'Просмотр карточки: Битва в порту', exact: true }),
    ).toBeVisible()
    const previewArea = (await summary.getByTestId('modifier-preview-action').boundingBox())!
    const previewButton = (await summary
      .getByRole('button', { name: 'Просмотр карточки: Битва в порту', exact: true })
      .boundingBox())!
    expect(previewButton.y - previewArea.y).toBeCloseTo(
      previewArea.y + previewArea.height - previewButton.y - previewButton.height,
      0,
    )
    await expect(available).toBeVisible()
    await expect(available.getByRole('heading', { level: 2 })).toHaveCount(0)
    await expect(available.getByText('18 модификаторов', { exact: true })).toHaveCount(0)
    await expect(
      available.getByRole('button', { name: 'Активировать Модификатор 1', exact: true }),
    ).toBeEnabled()
    const pageBounds = await page.getByTestId('game-modifiers-page').boundingBox()
    expect(pageBounds).not.toBeNull()
    expect(Math.abs(pageBounds!.x + pageBounds!.width / 2 - size.width / 2)).toBeLessThanOrEqual(1)
    const activeBounds = await page.getByTestId('active-modifiers-section').boundingBox()
    const availableBounds = await available.boundingBox()
    expect(Math.abs(availableBounds!.width - activeBounds!.width)).toBeLessThanOrEqual(1)
    const active = page.getByTestId('active-modifiers-section')
    const activeTitle = active.getByRole('heading', { level: 2 })
    await expect(activeTitle).toHaveCSS('text-align', 'center')
    const activeTitleBounds = await activeTitle.boundingBox()
    expect(
      Math.abs(
        activeTitleBounds!.x +
          activeTitleBounds!.width / 2 -
          activeBounds!.x -
          activeBounds!.width / 2,
      ),
    ).toBeLessThanOrEqual(1)
    const availableCategory = await available
      .getByRole('heading', { level: 3, name: 'Перед раундом', exact: true })
      .boundingBox()
    const activeCategory = await active
      .getByRole('heading', { level: 3, name: 'Перед раундом', exact: true })
      .boundingBox()
    expect(Math.abs(availableCategory!.y - activeCategory!.y)).toBeLessThanOrEqual(1)
    const availableRow = await available
      .getByRole('listitem', { name: 'Модификатор 1', exact: true })
      .boundingBox()
    const activeRow = await active
      .getByRole('listitem', { name: 'Модификатор 1', exact: true })
      .boundingBox()
    expect(Math.abs(availableRow!.height - activeRow!.height)).toBeLessThanOrEqual(1)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
      size.height,
    )
    // Composed surfaces must use the same square corners as the shared theme.
    const corners = await page
      .locator('main .MuiPaper-root')
      .evaluateAll((surfaces) => surfaces.map((surface) => getComputedStyle(surface).borderRadius))
    expect(corners.length).toBeGreaterThan(0)
    expect(corners.every((radius) => radius === '0px')).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('modifiers.png') })
    const search = page.getByRole('textbox', { name: 'Поиск модификаторов' })
    await search.fill('Нет такого модификатора')
    await expect(available.getByRole('heading', { level: 4 })).toHaveCount(0)
    await expect(
      page
        .getByTestId('active-modifiers-section')
        .getByRole('button', { name: 'Отменить активацию: Модификатор 1', exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Очистить', exact: true }).click()
    await expect(search).toHaveValue('')
    await expect(available.getByRole('heading', { level: 4 })).toHaveCount(18)

    const summaryMetrics = await summary.evaluate((element) => ({
      width: element.clientWidth,
      content: element.scrollWidth,
    }))
    expect(summaryMetrics.content).toBeLessThanOrEqual(summaryMetrics.width + 1)

    const listMetrics = await available
      .getByRole('region', { name: 'Доступны в этой игре', exact: true })
      .evaluate((element) => ({
        height: element.clientHeight,
        content: element.scrollHeight,
        bottom: element.getBoundingClientRect().bottom,
      }))
    if (size.height < 1440) {
      expect(listMetrics.content).toBeGreaterThan(listMetrics.height)
    } else {
      expect(listMetrics.content).toBeGreaterThanOrEqual(listMetrics.height)
    }
    expect(listMetrics.bottom).toBeLessThanOrEqual(size.height)
    const toolsTop = (await search.boundingBox())!.y
    await available
      .getByRole('region', { name: 'Доступны в этой игре', exact: true })
      .evaluate((element) => {
        element.scrollTop = element.scrollHeight
      })
    await expect(search).toBeInViewport()
    expect((await search.boundingBox())!.y).toBe(toolsTop)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      size.width,
    )
  })
}

test('catalog filters and mobile tabs preserve independent active purchases and context', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockModifiers(page)
  await page.goto('/panel/game-modifiers')
  const summary = page.getByRole('region', { name: 'Краткая сводка' })
  const balance = summary.getByRole('group', { name: 'Доступно очков' })
  await balance.focus()
  await expect(page.getByRole('tooltip')).toContainText(
    'Очки викторины, которые вы можете потратить сейчас',
  )
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toBeHidden()
  await expect(summary.getByText('Морские волки')).toBeVisible()
  await expect(summary.getByText('Битва в порту')).toBeVisible()
  await expect(summary.locator('summary')).toHaveCount(0)
  await expect(summary.getByText('Капитан Флинт')).toBeVisible()
  const cardPreview = summary.getByRole('button', {
    name: 'Просмотр карточки: Битва в порту',
    exact: true,
  })
  await cardPreview.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Битва в порту' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(cardPreview).toBeFocused()

  const available = page.getByTestId('available-modifiers-section')
  const stage = available.getByRole('combobox', { name: 'Этап действия' })
  await stage.click()
  await page.getByRole('option', { name: 'Во время раунда', exact: true }).click()
  await expect(available.getByRole('heading', { level: 4 })).toHaveCount(6)
  await expect(available.getByRole('heading', { name: /^Перед раундом/ })).toHaveCount(0)
  const search = available.getByRole('textbox', { name: 'Поиск модификаторов' })
  await search.fill('Несуществующий эффект')
  await expect(available.getByRole('heading', { level: 4 })).toHaveCount(0)

  const catalogTab = page.getByRole('tab', { name: 'Каталог' })
  await catalogTab.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  const active = page.getByTestId('active-modifiers-section')
  await expect(
    active.getByRole('button', { name: 'Отменить активацию: Модификатор 1', exact: true }),
  ).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(active).toBeVisible()
  await expect(search).toHaveValue('Несуществующий эффект')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('tab', { name: 'Активные · 1' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await catalogTab.click()
  await expect(search).toHaveValue('Несуществующий эффект')
  await expect(stage).toHaveText('Во время раунда')
  await available.getByRole('button', { name: 'Очистить', exact: true }).click()
  await expect(available.getByRole('heading', { level: 4 })).toHaveCount(6)
  await page.screenshot({ path: info.outputPath('filtered-catalog.png'), animations: 'disabled' })
  await stage.click()
  await page.getByRole('option', { name: 'Все этапы', exact: true }).click()
  await expect(available.getByRole('heading', { level: 4 })).toHaveCount(18)
})

for (const width of [320, 390, 768]) {
  test(`mobile panels switch without horizontal scroll at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 })
    await mockModifiers(page)
    await page.goto('/panel/game-modifiers')
    await expect(
      page.getByRole('button', { name: 'Активировать Модификатор 1', exact: true }),
    ).toBeEnabled()

    const overview = page.getByRole('region', { name: 'Краткая сводка' })
    await expect(overview.getByText('Морские волки')).toBeVisible()
    await expect(
      overview.getByRole('button', { name: 'Просмотр карточки: Битва в порту', exact: true }),
    ).toBeVisible()
    const available = await page.getByTestId('available-modifiers-section').boundingBox()
    expect(available).not.toBeNull()
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
      844,
    )
    await expect(page.getByTestId('active-modifiers-section')).toBeHidden()
    await page.screenshot({
      path: info.outputPath('mobile-modifiers.png'),
      fullPage: true,
      animations: 'disabled',
    })
    await page.screenshot({ path: info.outputPath('viewport.png'), animations: 'disabled' })
    await page.getByRole('tab', { name: 'Активные · 1' }).click()
    await expect(page.getByTestId('available-modifiers-section')).toBeHidden()
    await expect(page.getByTestId('active-modifiers-section')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Отменить активацию: Модификатор 1', exact: true }),
    ).toBeVisible()
    await page.screenshot({ path: info.outputPath('active.png'), animations: 'disabled' })
    await page.getByRole('tab', { name: 'Каталог' }).click()
    await expect(page.getByTestId('available-modifiers-section')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
      844,
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
  })
}

for (const width of [390, 768, 1440]) {
  test(`details, purchases and refunds remain accessible at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    const mock = await mockModifiers(page)
    await page.goto('/panel/game-modifiers')
    const available = page.getByTestId('available-modifiers-section')
    const active = page.getByTestId('active-modifiers-section')
    const row = available.getByRole('listitem', { name: 'Модификатор 1', exact: true })
    const cost = (await row
      .getByText('Стоимость: 1 очк.', { exact: true })
      .locator('..')
      .boundingBox())!
    const counter = row.getByLabel('Активировано 1 / 2', { exact: true })
    await expect(counter).toHaveText('1 из 2')
    const counterBounds = (await counter.boundingBox())!
    expect(counterBounds.x).toBeGreaterThanOrEqual(cost.x + cost.width)
    expect(counterBounds.y + counterBounds.height / 2).toBeCloseTo(cost.y + cost.height / 2, 0)
    const icon = row.locator('[aria-hidden="true"]').first()
    expect((await icon.boundingBox())!.width).toBe(40)
    expect((await icon.boundingBox())!.height).toBe(40)
    await expect(row.getByRole('button', { name: 'Подробнее' })).toHaveCSS(
      'border-top-width',
      '0px',
    )
    const details = available
      .getByRole('listitem', { name: 'Модификатор 1', exact: true })
      .getByRole('button', { name: /Подробнее|Details|Детальніше|Szczegóły/ })
    await expect(details).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    const defaultBackground = await details.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    )
    await details.hover()
    await expect(details).not.toHaveCSS('background-color', defaultBackground)
    await page.mouse.move(0, 0)
    await details.focus()
    await page.keyboard.press('Enter')
    await expect(details).toHaveAttribute('aria-expanded', 'true')
    await expect(
      available.getByText(modifiers[0]!.modifier.description, { exact: true }).first(),
    ).toBeVisible()
    const purchase = available.getByRole('button', {
      name: 'Активировать Модификатор 1',
      exact: true,
    })
    await expect(purchase).toBeEnabled()
    await purchase.click()
    const confirmation = page.getByRole('dialog', { name: 'Активировать этот модификатор?' })
    await expect(confirmation).toContainText('Модификатор 1')
    await page.keyboard.press('Escape')
    await expect(confirmation).toBeHidden()
    await expect(details).toHaveAttribute('aria-expanded', 'true')
    if (width < 1000) await page.getByRole('tab', { name: 'Активные · 1' }).click()
    const activeRow = active.getByRole('listitem', { name: 'Модификатор 1', exact: true })
    await activeRow.getByRole('button', { name: 'Подробнее', exact: true }).click()
    const activators = activeRow.getByRole('region', { name: 'Активировали', exact: true })
    await expect(activators).toHaveText('Активировали: Игрок')
    await expect(activeRow.getByText(/^Всего потрачено/)).toHaveCount(0)
    expect(await activators.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    )
    const refund = active.getByRole('button', {
      name: 'Отменить активацию: Модификатор 1',
      exact: true,
    })
    await refund.click()
    await expect(
      page.getByRole('dialog', { name: 'Отменить покупку модификатора?' }),
    ).toContainText('Модификатор 1')
    await page.keyboard.press('Escape')
    if (width < 1000) await page.getByRole('tab', { name: 'Каталог' }).click()
    await page.setViewportSize({ width: width === 390 ? 1440 : 390, height: 900 })
    await expect(details).toHaveAttribute('aria-expanded', 'true')
    mock.failRefresh()
    await expect(page.getByText('Не удалось загрузить модификаторы.', { exact: true })).toBeVisible(
      { timeout: 20_000 },
    )
    await expect(details).toHaveAttribute('aria-expanded', 'true')
    await expect(purchase).toBeDisabled()
    await page.screenshot({
      path: info.outputPath('retained-details.png'),
      fullPage: true,
      animations: 'disabled',
    })
  })
}

for (const width of [320, 1440]) {
  test(`long round context and large balances remain readable at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await mockModifiers(page, { longNames: true })
    await page.goto('/panel/game-modifiers')
    const summary = page.getByRole('region', { name: 'Краткая сводка' })
    await expect(summary.getByText(longTeamName, { exact: true })).toBeVisible()
    await expect(summary.getByText(longParticipantName, { exact: true })).toBeVisible()
    await expect(summary.getByRole('listitem')).toHaveCount(3)
    await expect(summary.getByText('999999 очк.', { exact: true })).toBeVisible()
    await expect(summary.getByText('0 очк.', { exact: true })).toBeVisible()
    expect(
      await summary.evaluate((element) => element.scrollWidth - element.clientWidth),
    ).toBeLessThanOrEqual(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    await summary.screenshot({ path: info.outputPath('long-context.png'), animations: 'disabled' })
    await summary
      .getByRole('button', { name: `Просмотр карточки: ${longCardTitle}`, exact: true })
      .click()
    await expect(page.getByRole('dialog', { name: longCardTitle })).toBeVisible()
  })
}

for (const locale of ['en', 'ru', 'uk', 'pl']) {
  test(`closed ordering remains readable in ${locale}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 700 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await mockModifiers(page, { locale, role: 'admin', orderingOpen: false, longNames: true })
    await page.goto('/panel/game-modifiers')
    const summary = page.getByTestId('modifier-summary-row')
    await expect(summary.getByRole('status')).toBeVisible()
    await expectEqualSummaryCells(page)
    await summary.screenshot({ path: info.outputPath('closed-header.png'), animations: 'disabled' })
    const available = page.getByTestId('available-modifiers-section')
    await expect(available.getByRole('heading', { level: 4 })).toHaveCount(18)
    const blockedRow = available.getByRole('listitem', { name: 'Модификатор 1', exact: true })
    await expect(blockedRow.getByRole('status')).toBeVisible()
    const blockedStatus = blockedRow.getByRole('status')
    await expect(blockedStatus).toHaveCSS('background-color', 'rgb(84, 27, 23)')
    const material = await blockedStatus.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    )
    expect(material).toContain('charcoal-paper')
    await expect(blockedRow.getByRole('button')).toHaveCount(1)
    expect((await blockedRow.getByRole('status').boundingBox())!.width).toBe(144)
    expect((await blockedRow.getByRole('status').boundingBox())!.height).toBe(36)
    await available
      .getByRole('listitem', { name: 'Модификатор 1', exact: true })
      .getByRole('button', { name: /Подробнее|Details|Детальніше|Szczegóły/ })
      .click()
    await expect(
      available.getByText(modifiers[0]!.modifier.description, { exact: true }).first(),
    ).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    expect(errors).toEqual([])
    await page.screenshot({
      path: info.outputPath('closed-ordering.png'),
      fullPage: true,
      animations: 'disabled',
    })
  })
}
