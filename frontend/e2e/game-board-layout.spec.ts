import { expect, test, type Page } from '@playwright/test'
import type { GameBoardSnapshot } from '../src/shared/api/contracts/index.ts'
import { realtimeHubs } from '../src/shared/realtime/generated.ts'

const categories = ['Охота', 'Оружие', 'Легенды', 'Болота', 'Контракты']
const board: GameBoardSnapshot = {
  gameId: 'board-layout',
  title: 'Последняя охота',
  description: 'Пять территорий. Один шанс вернуться с наградой.',
  status: 'active',
  version: 1,
  rows: 5,
  cols: 5,
  rowLabels: ['100', '200', '300', '400', '500'],
  colLabels: categories,
  activeTeamId: 'team-one',
  enabledModifierIds: [],
  activeModifiers: [],
  cells: Array.from({ length: 25 }, (_, index) => ({
    id: `card-${index}`,
    row: Math.floor(index / 5),
    col: index % 5,
    title: index === 0 ? 'Следы на болотах' : `Испытание ${index + 1}`,
    description: 'Описание испытания, доступное после открытия карточки.',
    cost: (Math.floor(index / 5) + 1) * 100,
    type: 'question',
    state: index === 0 ? 'open' : index === 1 ? 'cancelled' : 'closed',
    media: [],
  })),
}

test('board progress position is stable when entering from another tab', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await mockGame(page, 'active', 'viewer')
  await page.goto('/panel/game-team-queue')
  await expect(page.getByRole('link', { name: 'Доска', exact: true })).toBeVisible()

  const samplesPromise = page.evaluate(
    () =>
      new Promise<{ x: number; width: number; visible: boolean }[]>((resolve) => {
        const samples: { x: number; width: number; visible: boolean }[] = []
        const startedAt = performance.now()
        let firstVisibleFrame: number | null = null
        const sample = () => {
          const panel = document.querySelector('[data-testid="game-board-context"]')
          if (panel) {
            const bounds = panel.getBoundingClientRect()
            const visible = getComputedStyle(panel).visibility === 'visible'
            if (visible) firstVisibleFrame ??= performance.now()
            samples.push({
              x: Math.round(bounds.x),
              width: Math.round(bounds.width),
              visible,
            })
          }
          if (
            (firstVisibleFrame === null || performance.now() - firstVisibleFrame < 500) &&
            performance.now() - startedAt < 5000
          ) {
            requestAnimationFrame(sample)
          } else {
            resolve(samples)
          }
        }
        requestAnimationFrame(sample)
      }),
  )
  await page.getByRole('link', { name: 'Доска', exact: true }).click()
  await expect(page.getByTestId('game-board-context')).toBeVisible()
  const visibleSamples = (await samplesPromise).filter((sample) => sample.visible)
  expect(visibleSamples.length).toBeGreaterThan(0)
  expect([...new Set(visibleSamples.map((sample) => sample.x))]).toHaveLength(1)
  expect([...new Set(visibleSamples.map((sample) => sample.width))]).toHaveLength(1)
})

test('first board request leaves navigation available without a spinner', async ({ page }) => {
  await mockGame(page, 'active', 'viewer')
  let releaseSnapshot = () => {}
  const snapshotGate = new Promise<void>((resolve) => {
    releaseSnapshot = resolve
  })
  await page.route('**/api/game', async (route) => {
    await snapshotGate
    await route.fallback()
  })

  await page.goto('/panel/game-board')
  await expect(page.getByTestId('page-state-panel')).toContainText('Загрузка игрового поля')
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await page.getByRole('link', { name: 'Очередь команд' }).click()
  await expect(page).toHaveURL(/\/panel\/game-team-queue$/)
  releaseSnapshot()
})

test('board renders while the active round loads and keeps commands unavailable', async ({
  page,
}) => {
  const writes = await mockGame(page)
  let releaseRound = () => {}
  const roundGate = new Promise<void>((resolve) => {
    releaseRound = resolve
  })
  await page.route('**/api/game/rounds/active', async (route) => {
    await roundGate
    await route.fallback()
  })

  await page.goto('/panel/game-board')
  await expect(page.getByTestId('viewport-board')).toBeVisible()
  await expect(page.locator('[data-cell-id="card-2"]')).toBeDisabled()
  await page.getByRole('button', { name: 'Управление игрой' }).click()
  await expect(page.getByRole('tabpanel', { name: 'Управление игрой', exact: true })).toContainText(
    'Загрузка игрового поля',
  )
  await page.getByRole('button', { name: 'Закрыть инструменты управления', exact: true }).click()
  releaseRound()
  await expect(page.locator('[data-cell-id="card-2"]')).toBeEnabled()
  expect(writes).toEqual([])
})

test('board remains visible while its first team queue loads', async ({ page }) => {
  await mockGame(page, 'active', 'viewer')
  let releaseQueue = () => {}
  const queueGate = new Promise<void>((resolve) => {
    releaseQueue = resolve
  })
  await page.route('**/api/game/team-queue', async (route) => {
    await queueGate
    await route.fallback()
  })

  await page.goto('/panel/game-board')
  await expect(page.getByTestId('viewport-board')).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  releaseQueue()
  await expect(page.getByTestId('game-board-context')).toBeVisible()
  await expect(page.getByTestId('viewport-board')).toBeVisible()
})

test('board shows cards before played cell results arrive', async ({ page }) => {
  await mockGame(page, 'active', 'viewer')
  let releaseHistory = () => {}
  const historyGate = new Promise<void>((resolve) => {
    releaseHistory = resolve
  })
  await page.route('**/api/game/history/games/board-layout', async (route) => {
    await historyGate
    await route.fallback()
  })

  await page.goto('/panel/game-board')
  await expect(page.getByTestId('viewport-board')).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  releaseHistory()
  await expect(page.getByTestId('viewport-board')).toBeVisible()
})

test('board remains interactive while nested data and card media load', async ({ page }) => {
  await mockGame(page)
  let releasePlayers = () => {}
  const playersGate = new Promise<void>((resolve) => {
    releasePlayers = resolve
  })
  let releaseMedia = () => {}
  const mediaGate = new Promise<void>((resolve) => {
    releaseMedia = resolve
  })
  await page.route('**/api/game/quiz/manual-awards/players', async (route) => {
    await playersGate
    await route.fallback()
  })
  await page.route('**/api/game', (route) =>
    route.fulfill({
      json: {
        ...board,
        cells: board.cells.map((cell, index) =>
          index === 0 ? { ...cell, media: [{ url: '/media/cards/slow.svg' }] } : cell,
        ),
      },
    }),
  )
  await page.route('**/media/cards/slow.svg', async (route) => {
    await mediaGate
    await route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>',
    })
  })

  const playersRequested = page.waitForRequest('**/api/game/quiz/manual-awards/players')
  const mediaRequested = page.waitForRequest('**/media/cards/slow.svg')
  await page.goto('/panel/game-board', { waitUntil: 'domcontentloaded' })
  await Promise.all([playersRequested, mediaRequested])
  await expect(page.getByTestId('viewport-board')).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await page.getByTestId('game-board-phase-toggle').click()
  await expect(page.getByRole('region', { name: 'Активная команда', exact: true })).toBeVisible()
  await page.screenshot({ path: '../.tmp/agent-work/board-progressive-loading.png' })
  releasePlayers()
  releaseMedia()
  await expect(page.getByTestId('viewport-board')).toBeVisible()
})

test('returning to a cached board stays usable during its refresh', async ({ page }) => {
  await mockGame(page, 'active', 'viewer')
  await page.goto('/panel/game-board')
  await expect(page.getByTestId('viewport-board')).toBeVisible()
  await page.clock.setFixedTime(Date.now() + 11_000)
  const queueRefresh = page.waitForResponse('**/api/game')
  await page.getByRole('link', { name: 'Очередь команд' }).click()
  await expect(page).toHaveURL(/\/panel\/game-team-queue$/)
  await queueRefresh
  await page.clock.setFixedTime(Date.now() + 22_000)

  let releaseSnapshot = () => {}
  const snapshotGate = new Promise<void>((resolve) => {
    releaseSnapshot = resolve
  })
  await page.route('**/api/game', async (route) => {
    await snapshotGate
    await route.fallback()
  })
  const refreshStarted = page.waitForRequest('**/api/game')
  await page.getByRole('link', { name: 'Доска', exact: true }).click()
  await refreshStarted
  await expect(page.getByTestId('viewport-board')).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  releaseSnapshot()
})

async function mockGame(
  page: Page,
  status: 'active' | 'ready' | 'finished' = 'active',
  role = 'admin',
  teamName = 'Ночные странники',
  onGameBoardSocket?: (send: (message: string) => void) => void,
  queueSize = 2,
  playedScore: number | null = 75,
  ownPlayedTeam: boolean | 'active' = false,
) {
  const writes: string[] = []
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  await page.routeWebSocket(/\/hubs\/game-board/, (socket) => {
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) {
        socket.send('{}\u001e')
        onGameBoardSocket?.((event) => socket.send(event))
      }
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
            connectionId: 'layout',
            connectionToken: 'layout',
            negotiateVersion: 1,
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
          },
        })
      if (route.request().method() !== 'GET') {
        writes.push(path)
        return route.fulfill({ status: 409 })
      }
      if (path === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
            displayName: 'Охотник',
            roles: [role, 'viewer'],
          },
        })
      if (path === '/api/game') return route.fulfill({ json: { ...board, status } })
      if (path === '/api/game/team-queue')
        return route.fulfill({
          json: {
            gameId: board.gameId,
            teams: [
              {
                teamId: 'team-one',
                teamName,
                teamSlotIndex: 1,
                isPlayed: false,
                playedAtUtc: null,
                finalScore: null,
                participants: [
                  {
                    userId:
                      ownPlayedTeam === 'active'
                        ? 'c592262f-8e49-466d-a4fc-2de69ba46771'
                        : 'player-one',
                    displayName: 'Искатель приключений',
                  },
                  { userId: 'player-two', displayName: 'Ворон' },
                ],
              },
              {
                teamId: 'team-two',
                teamName: 'Последний рубеж',
                teamSlotIndex: 2,
                isPlayed: true,
                playedAtUtc: '2026-09-01T10:00:00Z',
                finalScore: playedScore,
                participants: [
                  {
                    userId:
                      ownPlayedTeam === true
                        ? 'c592262f-8e49-466d-a4fc-2de69ba46771'
                        : 'player-three',
                    displayName: 'Стрелок',
                  },
                ],
              },
              ...Array.from({ length: Math.max(0, queueSize - 2) }, (_, index) => ({
                teamId: `extra-${index}`,
                teamName: `Команда ${index + 3}`,
                teamSlotIndex: index + 3,
                isPlayed: false,
                playedAtUtc: null,
                finalScore: null,
                participants: [{ userId: `extra-player-${index}`, displayName: `Игрок ${index}` }],
              })),
            ],
            summary: { totalTeams: queueSize, playedTeams: 1, remainingTeams: queueSize - 1 },
          },
        })
      if (path === '/api/game/history/games/board-layout')
        return route.fulfill({ json: { mainGame: { rounds: [] } } })
      if (path.includes('manual-quiz') || path.includes('/players'))
        return route.fulfill({ json: [] })
      return route.fulfill({ status: 204 })
    },
  )
  return writes
}

async function expandProgress(page: Page) {
  const toggle = page.getByTestId('game-board-phase-toggle')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const detailsId = await toggle.getAttribute('aria-controls')
  await expect(page.locator(`[id="${detailsId}"]`)).toHaveClass(/MuiCollapse-entered/)
  await page.evaluate(() => document.fonts.ready)
}

const activeRoundFixture = {
  roundId: 'round-one',
  gameId: board.gameId,
  cellId: 'card-0',
  cellTitle: 'Следы на болотах',
  cellDescription: 'Описание испытания, доступное после открытия карточки.',
  teamId: 'team-one',
  teamName: 'Ночные странники',
  teamSlotIndex: 1,
  status: 'awaiting_modifiers',
  roundVersion: 1,
  startedAtUtc: '2026-09-01T12:00:00Z',
  serverNowUtc: '2026-09-01T12:00:00Z',
  baseScore: 100,
  participants: [{ userId: 'player-one', displayName: 'Ворон' }],
  modifierResults: [],
  emptyCardPenaltyApplied: false,
  killsCount: 0,
  bountyCount: 0,
  scoreDetails: { finalScore: 0, calculationLines: [] },
}

for (const width of [320, 390, 600, 768, 1077, 1440, 1920, 2560]) {
  test(`current round keeps its layout through live phases at ${width}px`, async ({
    page,
  }, testInfo) => {
    const height = width === 1920 ? 1080 : width === 2560 ? 1440 : 900
    await page.setViewportSize({ width, height })
    let sendEvent: ((message: string) => void) | undefined
    await mockGame(page, 'active', 'viewer', 'Ночные странники', (send) => {
      sendEvent = send
    })
    let activeTeamId: string | null = null
    let roundStatus: string | null = null
    let activeModifiers: GameBoardSnapshot['activeModifiers'] = []
    let stressModifiers = false
    let rosterCount = 3
    const categoryName = width === 320 ? 'Длинная категория охоты и приключений' : 'Охота'
    let releaseImage = () => {}
    const imageGate = new Promise<void>((resolve) => {
      releaseImage = resolve
    })
    await page.route('**/media/cards/round-layout.png', async (route) => {
      await imageGate
      await route.fulfill({
        path: '../backend/assets/test-game-board/cards/1-1.png',
        contentType: 'image/png',
      })
    })
    await page.route('**/api/game', (route) =>
      route.fulfill({
        json: {
          ...board,
          activeTeamId,
          activeModifiers,
          colLabels: board.colLabels.map((label, index) => (index === 0 ? categoryName : label)),
          cells: board.cells.map((cell, index) =>
            index === 0 ? { ...cell, media: [{ url: '/media/cards/round-layout.png' }] } : cell,
          ),
        },
      }),
    )
    await page.route('**/api/game/rounds/active', (route) =>
      roundStatus
        ? route.fulfill({
            json: {
              ...activeRoundFixture,
              status: roundStatus,
              participants: [
                { userId: 'one', displayName: 'Ворон' },
                { userId: 'two', displayName: 'Скиталец' },
                { userId: 'three', displayName: 'Тихий охотник' },
              ].slice(0, rosterCount),
              ...(roundStatus === 'in_progress'
                ? {
                    gameplayStartedAtUtc: '2026-09-01T12:00:00Z',
                    modifierResults: [
                      {
                        modifierResultId: 'result-runtime',
                        modifierId: 'modifier-1',
                        modifierName: 'Жажда',
                        modifierDescription: 'Играть без лечения.',
                        modifierCategory: 'round',
                        outcomeStatus: 'pending',
                        scoreDelta: 0,
                        killDelta: 0,
                        activationId: 'activation-1',
                        definitionRevision: 1,
                        runtimeBehavior: {
                          phase: 'round',
                          performer: 'activeTeam',
                          requiresHostMonitoring: true,
                          rule: 'Старое краткое правило.',
                          stackingPolicy: 'aggregateParameters',
                          durationSecondsPerActivation: 120,
                        },
                      },
                    ],
                  }
                : {}),
            },
          })
        : route.fulfill({ status: 204 }),
    )
    await page.route('**/api/game/modifiers/state', (route) =>
      route.fulfill({
        json: {
          gameId: board.gameId,
          availableQuizPoints: 10,
          earnedQuizPoints: 10,
          spentQuizPoints: 0,
          isOrderingOpen: roundStatus === 'awaiting_modifiers',
          activeModifiers,
          availableModifiers: activeModifiers.map((activation, index) => ({
            modifier: {
              id: activation.modifierId,
              name: activation.modifierName,
              iconEmoji: ['🛡️', '💧', '🎯', '📖', '⌛'][index % 5],
              description: (
                [
                  'Команда может один раз избежать штрафа. Решение подтверждает ведущий перед подведением итогов.',
                  'На протяжении раунда запрещено использовать лечение.',
                  'Разрешён один дополнительный патрон для выбранного оружия.',
                  'Участники используют только навыки, указанные на карточке.',
                  'После выполнения условий команда получает дополнительную попытку.',
                ][index % 5] ?? ''
              ).repeat(stressModifiers ? 4 : 1),
              category: ['preparation', 'round', 'result'][index % 3],
              activationCost: 3,
              activationLimit: null,
              conflictingModifierIds: [],
              activationCommand: null,
              revision: 1,
              normalizedTags: [],
              behaviorV2: {
                schemaVersion: 2,
                kind: 'rule',
                phase: 'round',
                performer: 'activeTeam',
                requiresHostMonitoring: false,
                rule: 'Правило раунда',
                stackingPolicy: 'aggregateParameters',
                resolution: { type: 'ruleStatus' },
                reward: 'none',
                formulaReference: null,
              },
            },
            isActive: true,
            canActivate: false,
            blockedReason: 'ordering_closed',
            activationsCount: 1,
            limit: null,
            isEmergencyDisabled: false,
          })),
        },
      }),
    )
    const update = () =>
      sendEvent?.(
        JSON.stringify({ type: 1, target: 'roundStateChanged', arguments: [{}] }) + '\u001e',
      )

    await page.goto('/panel/game-round')
    const overview = page.getByTestId('current-round-overview')
    const team = overview.getByRole('region', { name: 'Играющая команда', exact: true })
    const card = overview.getByRole('region', { name: 'Играемая карточка', exact: true })
    const modifiers = overview.getByRole('region', { name: 'Активные модификаторы', exact: true })
    const mediaPanel = page.getByTestId('round-media-panel')
    const frame = page.getByTestId('round-card-frame')
    const cardSummary = page.getByTestId('round-card-summary')
    const phasePanel = page.getByTestId('round-phase')
    const teamContent = page.getByTestId('round-team-content')
    const phaseLabel = page.getByTestId('round-phase-label')
    await expect(phaseLabel).toHaveText('Этап раунда:')
    await expect(phaseLabel).toHaveCSS('text-align', 'center')
    await expect(overview.getByRole('link', { name: 'Вернуться к доске' })).toHaveCount(0)
    await expect(page.getByTestId('round-phase-value')).toHaveCSS('font-size', '28px')
    await expect(page.getByTestId('round-phase-value')).toHaveCSS('font-weight', '700')
    const labelStyles = await Promise.all(
      [cardSummary.locator('dt').first(), cardSummary.locator('dt').last()].map((label) =>
        label.evaluate((element) => {
          const style = getComputedStyle(element)
          return [style.fontSize, style.lineHeight, style.fontWeight, style.textTransform]
        }),
      ),
    )
    expect(labelStyles[1]).toEqual(labelStyles[0])
    for (const id of ['round-category-row', 'round-cost-row']) {
      const offset = await page.getByTestId(id).evaluate((row) => {
        const frame = row.getBoundingClientRect()
        const parts = Array.from(row.querySelectorAll('dt,dd')).map((part) =>
          part.getBoundingClientRect(),
        )
        return (
          (Math.min(...parts.map((p) => p.left)) + Math.max(...parts.map((p) => p.right))) / 2 -
          frame.left -
          frame.width / 2
        )
      })
      expect(Math.abs(offset)).toBeLessThanOrEqual(1)
    }
    for (const value of await cardSummary.locator('dd').all()) {
      await expect(value).toHaveCSS('font-weight', '400')
      expect(
        await value.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
      ).toBeLessThan(parseFloat(labelStyles[0]![0]))
    }
    await expect(team).toContainText('Сейчас выбирают активную команду.')
    expect(await team.evaluate((element) => getComputedStyle(element).borderImageSource)).toBe(
      'none',
    )
    await expect(frame).toContainText('Карточка ещё не открыта.')
    await expect(cardSummary).toContainText('Категория:')
    await expect(cardSummary.locator('dt')).toHaveText(['Категория:', 'Стоимость:'])
    await expect(cardSummary.locator('dd')).toHaveText(['Ожидание', '-'])
    await expect(modifiers).toContainText('Выбор модификаторов ещё не начался.')
    await expect(overview).toContainText('Выбор активной команды')
    await expect.poll(() => Boolean(sendEvent)).toBe(true)
    await page.evaluate(() => document.fonts.ready)
    const geometry = () =>
      Promise.all(
        [team, modifiers, mediaPanel].map((item, index) =>
          item
            .evaluate((element) => {
              const rect = element.getBoundingClientRect()
              return [rect.x + scrollX, rect.y + scrollY, rect.width, rect.height].map(Math.round)
            })
            .then((bounds) => (index < 2 ? [bounds[0], bounds[1], bounds[3]] : bounds)),
        ),
      )
    const initialGeometry = await geometry()
    const expectStable = async () => {
      const labelSpacing = await phaseLabel.evaluate((label) => {
        const header = label.parentElement!
        const headerRect = header.getBoundingClientRect()
        const labelRect = label.getBoundingClientRect()
        return [labelRect.top - headerRect.top, headerRect.bottom - labelRect.bottom]
      })
      for (const gap of labelSpacing) expect(gap).toBeCloseTo(12, 0)
      expect(await geometry()).toEqual(initialGeometry)
      if (width >= 768) {
        const widths = await Promise.all(
          [frame, phasePanel, team, modifiers].map((panel) =>
            panel.evaluate((element) => element.getBoundingClientRect().width),
          ),
        )
        for (const panelWidth of widths.slice(1)) {
          expect(panelWidth).toBeCloseTo(widths[0] ?? 0, 0)
        }
      }
      expect(
        await phasePanel.evaluate((element) => {
          const panel = element.getBoundingClientRect()
          return (
            element.scrollHeight <= element.clientHeight + 1 &&
            [...element.querySelectorAll('p, hr, a')].every((child) => {
              const bounds = child.getBoundingClientRect()
              return bounds.top >= panel.top && bounds.bottom <= panel.bottom
            })
          )
        }),
      ).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    }
    await page.screenshot({
      path: testInfo.outputPath('waiting.png'),
      fullPage: true,
      animations: 'disabled',
    })

    activeTeamId = 'team-one'
    update()
    await expect(team).toContainText('Ночные странники')
    await expect(team.locator('h3')).toHaveCSS('font-size', '26px')
    expect(await team.evaluate((element) => getComputedStyle(element).borderImageSource)).not.toBe(
      'none',
    )
    expect(await team.evaluate((element) => getComputedStyle(element).backgroundImage)).not.toBe(
      await modifiers.evaluate((element) => getComputedStyle(element).backgroundImage),
    )
    await expect(overview).toContainText('Выбор карточки')
    await expectStable()

    roundStatus = 'card_opened'
    update()
    await expect(overview).toContainText('Карточка открыта')
    await expect(team).toContainText('Тихий охотник')
    const participantPositions = await team
      .getByRole('listitem')
      .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().left))
    expect(participantPositions[1]).toBeGreaterThan(participantPositions[0] ?? 0)
    expect(participantPositions[2]).toBeGreaterThan(participantPositions[1] ?? 0)
    await expect(teamContent).toHaveCSS('overflow-y', 'visible')
    expect(await team.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(
      true,
    )
    await expect(team.getByRole('listitem')).toHaveText(['Ворон', 'Скиталец', 'Тихий охотник'])
    for (const count of [1, 2, 3]) {
      rosterCount = count
      update()
      await expect(team.getByRole('listitem')).toHaveCount(count)
      expect(
        await team.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
      ).toBe(true)
      for (const item of await team.getByRole('listitem').all()) {
        await expect(item.locator('[aria-hidden="true"]')).toHaveCount(2)
      }
      const teamSpacing = await team.evaluate((element) => {
        const name = element.querySelector('h3')!.getBoundingClientRect()
        const divider = element.querySelector('hr')!.getBoundingClientRect()
        const roster = element.querySelector('ul')!.getBoundingClientRect()
        return [divider.top - name.bottom, roster.top - divider.bottom]
      })
      for (const gap of teamSpacing) expect(gap).toBeCloseTo(10, 0)
      const roster = await team.getByRole('list').evaluate((element) => ({
        width: element.getBoundingClientRect().width,
        players: [...element.children].map((player) => ({
          width: player.getBoundingClientRect().width,
          fits: player.scrollWidth <= player.clientWidth + 1,
        })),
      }))
      for (const player of roster.players) {
        expect(player.width).toBeCloseTo(count === 2 ? roster.width : roster.width / count, 0)
        expect(player.fits).toBe(true)
      }
      if (count === 2) {
        const rows = await team.getByRole('listitem').evaluateAll((items) =>
          items.map((item) => {
            const rect = item.getBoundingClientRect()
            return { top: rect.top, bottom: rect.bottom }
          }),
        )
        expect(rows[1]?.top).toBeGreaterThanOrEqual(rows[0]?.bottom ?? 0)
      }
      await expectStable()
      if ([390, 768, 1440].includes(width)) {
        await team.screenshot({
          path: testInfo.outputPath(`team-${count}-players.png`),
          animations: 'disabled',
        })
      }
    }
    await expect(cardSummary.locator('dt')).toHaveText(['Категория:', 'Стоимость:'])
    await expect(cardSummary.locator('dd')).toHaveText([categoryName, '100 очк.'])
    await expect(cardSummary).not.toContainText('Следы на болотах')
    await expect(cardSummary).not.toContainText('Описание испытания')
    const summaryScroll = await cardSummary.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }))
    expect(summaryScroll.scrollHeight, JSON.stringify(summaryScroll)).toBeLessThanOrEqual(
      summaryScroll.clientHeight + 1,
    )
    const categoryBounds = await cardSummary.locator('dd').first().boundingBox()
    const dividerBounds = await cardSummary.locator('hr').boundingBox()
    expect(categoryBounds).not.toBeNull()
    expect(dividerBounds).not.toBeNull()
    expect(categoryBounds!.y + categoryBounds!.height).toBeLessThanOrEqual(dividerBounds!.y + 1)
    const summaryBounds = await cardSummary.boundingBox()
    const frameBounds = await frame.boundingBox()
    const phaseBounds = await phasePanel.boundingBox()
    const teamBounds = await team.boundingBox()
    expect(summaryBounds).not.toBeNull()
    expect(frameBounds).not.toBeNull()
    expect(phaseBounds).not.toBeNull()
    expect(teamBounds).not.toBeNull()
    expect(summaryBounds!.y + summaryBounds!.height).toBeLessThan(frameBounds!.y)
    expect(summaryBounds!.x).toBeCloseTo(frameBounds!.x, 0)
    expect(summaryBounds!.width).toBeCloseTo(frameBounds!.width, 0)
    expect(Math.abs(summaryBounds!.height - phaseBounds!.height)).toBeLessThanOrEqual(1)
    expect(teamBounds!.y - phaseBounds!.y - phaseBounds!.height).toBeCloseTo(12, 0)
    if (width >= 768) {
      expect(teamBounds!.height).toBeLessThanOrEqual(width < 900 ? 176 : 144)
      expect((await modifiers.boundingBox())!.height).toBeGreaterThan(teamBounds!.height * 2)
      expect(Math.abs(summaryBounds!.y - phaseBounds!.y)).toBeLessThanOrEqual(1)
      expect(teamBounds!.y).toBeCloseTo(frameBounds!.y, 0)
      expect(summaryBounds!.x + summaryBounds!.width).toBeLessThan(phaseBounds!.x)
    }
    await expect(frame).not.toContainText('Охота')
    await expect(frame.getByRole('status')).toBeVisible()
    await expectStable()
    if (width >= 1077) {
      expect((await frame.boundingBox())?.width).toBeGreaterThanOrEqual(400)
    }
    releaseImage()
    const image = frame.getByRole('img')
    await expect(image).toBeVisible()
    await expect.poll(() => image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0)
    await expect
      .poll(async () => {
        const summary = await cardSummary.boundingBox()
        const cardFrame = await frame.boundingBox()
        return summary && cardFrame
          ? [Math.round(summary.x - cardFrame.x), Math.round(summary.width - cardFrame.width)]
          : null
      })
      .toEqual([0, 0])
    const imageFits = await frame.evaluate((element) => {
      const image = element.querySelector('img')
      if (!image || image.naturalWidth === 0) return false
      const media = image.getBoundingClientRect()
      const frame = element.getBoundingClientRect()
      return {
        fits:
          media.width > 0 &&
          media.height > 0 &&
          media.left >= frame.left &&
          media.right <= frame.right &&
          media.top >= frame.top &&
          media.bottom <= frame.bottom,
        uncropped: getComputedStyle(image).objectFit === 'contain',
        media: media.toJSON(),
        frame: frame.toJSON(),
      }
    })
    expect(imageFits && imageFits.fits, JSON.stringify(imageFits)).toBe(true)
    expect(imageFits && imageFits.uncropped, JSON.stringify(imageFits)).toBe(true)
    if (width >= 1920) {
      const alignment = await page.evaluate(() => {
        const imageRight = document
          .querySelector('[data-testid="round-card-frame"]')!
          .getBoundingClientRect().right
        const phaseLeft = document
          .querySelector('[data-testid="round-phase"]')!
          .getBoundingClientRect().left
        return { center: innerWidth / 2, gapCenter: (imageRight + phaseLeft) / 2 }
      })
      expect(Math.abs(alignment.gapCenter - alignment.center)).toBeLessThan(1)
      expect((await frame.boundingBox())!.width).toBeGreaterThan(width * 0.34)
    }
    await expectStable()

    for (let visit = 0; visit < 2; visit += 1) {
      const navigationToggle = page.getByRole('button', { name: 'Открыть навигацию' })
      const compactNavigation = await navigationToggle.isVisible()
      if (compactNavigation) await navigationToggle.click()
      await page
        .getByRole(compactNavigation ? 'menuitem' : 'link', { name: 'Доска', exact: true })
        .click()
      await expect(page).toHaveURL(/\/panel\/game-board$/)
      if (compactNavigation) await navigationToggle.click()
      const samplesPromise = page.evaluate(
        () =>
          new Promise<string[]>((resolve) => {
            const samples: string[] = []
            const startedAt = performance.now()
            let firstFrame: number | null = null
            const sample = () => {
              const panels = ['round-card-summary', 'round-card-frame', 'round-details-panel'].map(
                (id) => document.querySelector(`[data-testid="${id}"]`),
              )
              if (panels.every(Boolean)) {
                firstFrame ??= performance.now()
                samples.push(
                  JSON.stringify(
                    panels.map((panel) => {
                      const rect = panel!.getBoundingClientRect()
                      return [rect.x + scrollX, rect.y + scrollY, rect.width, rect.height].map(
                        Math.round,
                      )
                    }),
                  ),
                )
              }
              if (
                (firstFrame === null || performance.now() - firstFrame < 500) &&
                performance.now() - startedAt < 5000
              )
                requestAnimationFrame(sample)
              else resolve(samples)
            }
            requestAnimationFrame(sample)
          }),
      )
      await page
        .getByRole(compactNavigation ? 'menuitem' : 'link', { name: 'Текущий раунд', exact: true })
        .click()
      await expect(image).toBeVisible()
      const samples = await samplesPromise
      expect(samples.length).toBeGreaterThan(1)
      expect([...new Set(samples)]).toHaveLength(1)
      await expectStable()
    }

    await expect(card.getByRole('button')).toHaveCount(0)
    await expect(phasePanel.getByRole('link')).toHaveCount(0)
    expect(
      await overview.getByRole('heading', { name: 'Текущий раунд' }).evaluate((heading) => {
        const rect = heading.getBoundingClientRect()
        return rect.width <= 1 && rect.height <= 1 && getComputedStyle(heading).clipPath !== 'none'
      }),
    ).toBe(true)
    await expectStable()

    roundStatus = 'awaiting_modifiers'
    update()
    await page
      .getByRole('dialog', { name: 'Модификаторы', exact: true })
      .getByRole('button', { name: 'Закрыть модификаторы' })
      .click()
    await expect(modifiers).toContainText('Пока никто не активировал модификаторы.')
    await expectStable()
    const modifierTrigger = page.getByRole('button', { name: 'Модификаторы', exact: true })
    await expect(modifierTrigger).toBeVisible()
    if (width >= 1200) {
      await expect(modifierTrigger).toHaveCSS('height', '160px')
      const insets = await modifierTrigger.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(element)
        const text = range.getBoundingClientRect()
        return [text.top - bounds.top, bounds.bottom - text.bottom]
      })
      expect(insets[0]).toBeGreaterThanOrEqual(12)
      expect(insets[1]).toBeGreaterThanOrEqual(12)
    } else {
      await expect(modifierTrigger).toHaveCSS('writing-mode', 'horizontal-tb')
      expect((await modifierTrigger.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    if ([390, 768, 1440, 1920].includes(width)) {
      await page.screenshot({
        path: testInfo.outputPath('modifier-trigger.png'),
        animations: 'disabled',
      })
    }
    const roundRefresh = page.waitForResponse('**/api/game/rounds/active')
    update()
    await roundRefresh
    await expect(page.getByRole('dialog', { name: 'Модификаторы', exact: true })).not.toBeVisible()
    roundStatus = 'preparing'
    for (const count of [1, 5, 12]) {
      activeModifiers = Array.from({ length: count }, (_, index) => ({
        activationId: `activation-${index}`,
        modifierId: `modifier-${index}`,
        roundId: 'round-one',
        roundVersion: 1,
        modifierName: count === 1 ? 'Куст и корточки' : `Модификатор ${index + 1}`,
        activationCost: 3,
        activatedAtUtc: '2026-09-01T12:00:00Z',
        activatedByUserId: 'spectator',
        activatedByDisplayName: 'Зритель',
      }))
      update()
      const list = modifiers.getByRole('list').first()
      const rows = list.locator(':scope > li > ul > li')
      await expect(rows).toHaveCount(count)
      const categoryLabels = ['Перед раундом', 'Во время раунда', 'На итог раунда'].slice(
        0,
        Math.min(count, 3),
      )
      await expect(list.getByRole('heading', { level: 3 })).toHaveText(categoryLabels)
      for (const [index, label] of categoryLabels.entries()) {
        const expectedNames = activeModifiers
          .filter((_, position) => position % 3 === index)
          .map(({ modifierName }) => modifierName)
          .sort((left, right) => left.localeCompare(right, 'ru'))
        await expect(
          list.getByRole('list', { name: label, exact: true }).getByRole('heading', { level: 4 }),
        ).toHaveText(expectedNames)
      }
      await expect(modifiers.getByLabel(`Активно: ${count}`, { exact: true })).toBeVisible()
      const listWidth = (await list.boundingBox())!.width
      const listInsets = await list.evaluate((element) => {
        const list = element.getBoundingClientRect()
        const panel = element.closest('section')!.getBoundingClientRect()
        return [list.left - panel.left, panel.right - list.right]
      })
      expect(listInsets[0]).toBeCloseTo(listInsets[1] ?? 0, 0)
      expect(listInsets[0]).toBeLessThanOrEqual(18)
      expect(listInsets[1]).toBeLessThanOrEqual(18)
      const rowWidth = (await rows.first().boundingBox())!.width
      const rowHeight = (await rows.first().boundingBox())!.height
      const scrollArea = modifiers.getByRole('region', {
        name: 'Активированные модификаторы раунда',
      })
      const availableHeight = await scrollArea.evaluate((element) => element.clientHeight - 8)
      const categoryHeight = await list
        .locator('[data-modifier-group-heading]')
        .evaluateAll((headings) =>
          headings.reduce((height, heading) => {
            const frame = getComputedStyle(heading.parentElement!)
            return (
              height +
              heading.getBoundingClientRect().height +
              6 +
              parseFloat(frame.borderTopWidth) +
              parseFloat(frame.borderBottomWidth)
            )
          }, 0),
        )
      const singleColumnHeight = count * rowHeight + (count - 1) * 6 + categoryHeight
      const nestedListWidth = (await list.locator(':scope > li > ul').first().boundingBox())!.width
      expect(rowWidth).toBeCloseTo(
        count > 1 && listWidth >= 480 && singleColumnHeight > availableHeight + 1
          ? (nestedListWidth - 6) / 2
          : nestedListWidth,
        0,
      )
      const iconBounds = await rows
        .first()
        .getByRole('button')
        .locator('[aria-hidden]')
        .first()
        .boundingBox()
      expect(iconBounds?.width).toBe(40)
      expect(iconBounds?.height).toBe(40)
      await expectStable()
      if ([390, 768, 1440].includes(width)) {
        await modifiers.screenshot({
          path: testInfo.outputPath(`active-${count}-modifiers.png`),
          animations: 'disabled',
        })
      }
      if (width === 1440 && count === 12) {
        const expectColumns = async (columns: number) => {
          await expect
            .poll(() =>
              list
                .locator(':scope > li > ul')
                .first()
                .evaluate(
                  (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
                ),
            )
            .toBe(columns)
        }
        await expectColumns(2)
        await page.setViewportSize({ width, height: 1440 })
        await expectColumns(1)
        await rows.first().getByRole('button').click()
        await expectColumns(1)
        await rows.first().getByRole('button').click()
        await page.setViewportSize({ width, height })
        await expectColumns(2)
        await rows.first().getByRole('button').click()
        await expectColumns(2)
        await rows.first().getByRole('button').click()
        await expectStable()
      }
    }
    for (const multiplier of [1, 2, 12]) {
      activeModifiers = Array.from({ length: multiplier + 1 }, (_, index) => ({
        activationId: `stack-activation-${index}`,
        modifierId: index < multiplier ? 'modifier-0' : 'modifier-1',
        roundId: 'round-one',
        roundVersion: 1,
        modifierName: index < multiplier ? 'Повторный модификатор' : 'Одиночный модификатор',
        activationCost: 3,
        activatedAtUtc: '2026-09-01T12:00:00Z',
        activatedByUserId: `spectator-${index}`,
        activatedByDisplayName: `Зритель ${index + 1}`,
      }))
      update()
      const repeated = modifiers.getByRole('button', { name: /Повторный модификатор/ })
      const single = modifiers.getByRole('button', { name: /Одиночный модификатор/ })
      await expect(
        modifiers.getByLabel(`Активно: ${multiplier + 1}`, { exact: true }),
      ).toBeVisible()
      await expect(repeated.getByRole('heading', { level: 4 })).toHaveText('Повторный модификатор')
      await expect(single.getByText(/^×\d+$/)).toHaveCount(0)
      if (multiplier === 1) await expect(repeated.getByText('×1', { exact: true })).toHaveCount(0)
      else {
        const badge = repeated.getByLabel(`${multiplier} активац.`, { exact: true })
        await expect(badge).toHaveText(`×${multiplier}`)
        await expect(badge.locator('span')).toHaveCSS('font-weight', '600')
        expect((await badge.boundingBox())!.height).toBeLessThanOrEqual(24)
        expect(
          await repeated.evaluate((element) => element.scrollWidth <= element.clientWidth),
        ).toBe(true)
      }
      await expectStable()
      if ([390, 768, 1440].includes(width)) {
        await modifiers.screenshot({
          path: testInfo.outputPath(`stacked-${multiplier}-activations.png`),
          animations: 'disabled',
        })
      }
    }
    for (const [status, phase] of [
      ['preparing', 'Подготовка к игре'],
      ['in_progress', 'Проведение игры'],
      ['reviewing_results', 'Подведение итогов'],
    ]) {
      roundStatus = status ?? null
      activeModifiers = Array.from({ length: 5 }, (_, index) => ({
        activationId: `activation-${index}`,
        modifierId: `modifier-${index}`,
        roundId: 'round-one',
        roundVersion: 1,
        modifierName: ['Защитный знак', 'Жажда', 'Патрон', 'Навыки', 'Последний шанс'][index] ?? '',
        activationCost: 3,
        activatedAtUtc: '2026-09-01T12:00:00Z',
        activatedByUserId: 'spectator',
        activatedByDisplayName: 'Зритель',
      }))
      update()
      await expect(overview).toContainText(phase ?? '')
      await expect(modifiers).toContainText('Защитный знак')
      await expectStable()
      if (status === 'in_progress') {
        await expect(modifiers).toContainText(/1:5\d|2:00/)
        if (width >= 768) {
          expect(
            await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
          ).toBe(true)
        }
        if (width === 1440) {
          await page.evaluate(() => window.scrollTo(0, 0))
          await page.screenshot({
            path: testInfo.outputPath('runtime.png'),
            fullPage: true,
            animations: 'disabled',
          })
        }
        await modifiers.getByRole('button', { name: /Жажда/ }).click()
        await expect(modifiers).toContainText('Играть без лечения.')
        await expect(modifiers.getByText('Старое краткое правило.', { exact: true })).toHaveCount(0)
        await expect(modifiers).toContainText('Внимание ведущего')
        await modifiers.getByRole('button', { name: /Жажда/ }).click()
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({
      path: testInfo.outputPath('populated.png'),
      fullPage: true,
      animations: 'disabled',
    })
    if (width >= 768) {
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
      ).toBe(true)
    }
    const modifierList = modifiers.getByRole('region', {
      name: 'Активированные модификаторы раунда',
    })
    await modifierList.focus()
    await page.keyboard.press('End')
    await expect(modifiers.getByText('Последний шанс', { exact: true })).toBeInViewport()

    if ([390, 768, 1440].includes(width)) {
      stressModifiers = true
      const longModifierName = 'МодификаторСОченьДлиннымНепрерывнымНазваниемДляПроверкиПереноса'
      activeModifiers = Array.from({ length: 26 }, (_, index) => ({
        activationId: `stress-activation-${index}`,
        modifierId: `stress-${index < 14 ? index : 0}`,
        modifierName: index === 0 || index >= 14 ? longModifierName : `Испытание ${index}`,
        roundId: 'round-one',
        roundVersion: 1,
        activationCost: 3,
        activatedAtUtc: '2026-09-01T12:00:00Z',
        activatedByUserId: `spectator-${index}`,
        activatedByDisplayName: `ЗрительСДлиннымНепрерывнымНикнеймом${index}`,
      }))
      update()
      const longRow = modifiers.getByRole('button', { name: new RegExp(longModifierName) })
      await expect(longRow).toBeVisible()
      await longRow.click()
      await expect(longRow).toHaveAttribute('aria-expanded', 'true')
      await expect(modifierList.locator('details[open]')).toHaveCount(1)
      const activators = modifierList
        .locator('details[open]')
        .getByRole('region', { name: 'Активировали', exact: true })
      await expect(activators).toContainText('Активировали:')
      await expect(activators).toContainText('Стоимость: 3 очк.')
      for (const activation of activeModifiers.filter((item) => item.modifierId === 'stress-0')) {
        await expect(activators).toContainText(activation.activatedByDisplayName)
      }
      expect(
        await activators.evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true)
      await expectStable()
      expect(
        await modifierList.evaluate((element) => element.scrollHeight > element.clientHeight),
      ).toBe(true)
      expect(
        await modifiers.evaluate((element) =>
          Array.from(element.querySelectorAll('summary, p, li')).every(
            (item) => item.scrollWidth <= item.clientWidth + 1,
          ),
        ),
      ).toBe(true)
      const icon = longRow.locator('[aria-hidden]').first()
      const iconBounds = await icon.boundingBox()
      expect(iconBounds).not.toBeNull()
      expect(iconBounds!.width).toBeGreaterThanOrEqual(30)
      expect(iconBounds!.width).toBeLessThanOrEqual(44)
      expect(iconBounds!.height).toBe(iconBounds!.width)
      await modifierList.evaluate((element) => {
        const expanded = element.querySelector('details[open]')
        if (expanded)
          element.scrollTop +=
            expanded.getBoundingClientRect().top - element.getBoundingClientRect().top
      })
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({
        path: testInfo.outputPath('expanded-long-modifier.png'),
        fullPage: true,
        animations: 'disabled',
      })
      const secondRow = modifiers.getByRole('button', { name: /Испытание 2\b/ })
      await secondRow.focus()
      await page.keyboard.press('Enter')
      await expect(secondRow).toHaveAttribute('aria-expanded', 'true')
      await expect(longRow).toHaveAttribute('aria-expanded', 'false')
      await expect(modifierList.locator('details[open]')).toHaveCount(1)
      await expectStable()
    }

    activeTeamId = null
    roundStatus = null
    activeModifiers = []
    update()
    await expect(team).toContainText('Сейчас выбирают активную команду.')
    expect(await team.evaluate((element) => getComputedStyle(element).borderImageSource)).toBe(
      'none',
    )
    await expect(frame).toContainText('Карточка ещё не открыта.')
    await expect(modifiers).toContainText('Выбор модификаторов ещё не начался.')
    await expectStable()
  })
}
for (const width of [390, 768, 1440]) {
  test(`current round modifier state survives navigation at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const writes = await mockGame(page, 'active', 'viewer')
    let activated = false
    let activationAttempts = 0
    let modifierEnabled = true
    let cancellationAttempts = 0
    const activation = {
      activationId: 'activation-one',
      roundId: 'round-one',
      roundVersion: 1,
      modifierId: 'modifier-one',
      modifierName: 'Защитный знак',
      activatedByUserId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
      activatedByDisplayName: 'Охотник',
      activationCost: 1,
      activatedAtUtc: '2026-09-01T12:01:00Z',
    }
    const modifier = {
      id: 'modifier-one',
      category: 'preparation',
      name: 'Защитный знак',
      description: 'Защищает команду в раунде.',
      activationCost: 1,
      activationLimit: null,
      conflictingModifierIds: [],
      iconEmoji: '🛡️',
      activationCommand: null,
      revision: 1,
      normalizedTags: [],
      behaviorV2: {
        schemaVersion: 2,
        kind: 'rule',
        phase: 'round',
        performer: 'activeTeam',
        requiresHostMonitoring: false,
        rule: 'Защитное правило',
        stackingPolicy: 'aggregateParameters',
        resolution: { type: 'ruleStatus' },
        reward: 'none',
        formulaReference: null,
      },
    }
    await page.route('**/api/game/rounds/active', (route) =>
      route.fulfill({
        json: activeRoundFixture,
      }),
    )
    await page.route('**/api/game/modifiers/state', (route) =>
      route.fulfill({
        json: {
          gameId: board.gameId,
          availableQuizPoints: 10,
          earnedQuizPoints: 10,
          spentQuizPoints: 0,
          isOrderingOpen: true,
          activeModifiers: activated ? [activation] : [],
          availableModifiers: modifierEnabled
            ? [
                {
                  modifier,
                  isActive: activated,
                  canActivate: !activated,
                  blockedReason: activated ? 'limit_reached' : null,
                  activationsCount: activated ? 1 : 0,
                  limit: activated ? 1 : null,
                },
              ]
            : [],
        },
      }),
    )
    await page.route('**/api/game/modifiers/modifier-one/activate', (route) => {
      activationAttempts += 1
      if (activationAttempts === 1) return route.fulfill({ status: 500 })
      activated = true
      return route.fulfill({ status: 204 })
    })
    await page.route('**/api/game/modifiers/activations/activation-one/self-cancel', (route) => {
      expect(route.request().postDataJSON()).toEqual({ expectedRoundVersion: 1 })
      cancellationAttempts += 1
      if (cancellationAttempts === 1) return route.fulfill({ status: 500 })
      activated = false
      return route.fulfill({ status: 204 })
    })
    await page.goto('/panel/game-round')
    const modifiers = page.getByRole('dialog', { name: 'Модификаторы' })
    await expect(modifiers).toBeVisible()
    await modifiers.getByRole('button', { name: 'Активировать модификатор', exact: true }).click()
    const confirmation = page.getByRole('dialog', { name: 'Активировать этот модификатор?' })
    const description = confirmation.getByText(
      'Активировать «Защитный знак» за 1 очк. викторины?',
      { exact: true },
    )
    await expect(description).toHaveCSS('text-align', 'center')
    await expect(confirmation.getByRole('button', { name: 'Отмена', exact: true })).toBeVisible()
    await expect(
      confirmation.getByRole('button', { name: 'Не активировать', exact: true }),
    ).toHaveCount(0)
    await expect(
      confirmation.getByRole('button', { name: 'Активировать модификатор', exact: true }),
    ).toHaveCount(0)
    await confirmation.screenshot({
      path: testInfo.outputPath('activation-confirmation.png'),
      animations: 'disabled',
    })
    const closingContent = await confirmation.evaluateHandle((dialog) => {
      const samples = [dialog.textContent]
      const observer = new MutationObserver(() => {
        if (dialog.isConnected) samples.push(dialog.textContent)
      })
      observer.observe(dialog, { subtree: true, childList: true, characterData: true })
      return { samples, observer }
    })
    await confirmation.getByRole('button', { name: 'Отмена', exact: true }).click()
    await expect(confirmation).not.toBeVisible()
    const exitSamples = await closingContent.evaluate(({ samples, observer }) => {
      observer.disconnect()
      return samples
    })
    await closingContent.dispose()
    expect(exitSamples.every((text) => text === exitSamples[0])).toBe(true)
    expect(activationAttempts).toBe(0)
    await expect(
      modifiers.getByRole('button', { name: 'Активировать модификатор', exact: true }),
    ).toBeFocused()
    await modifiers.getByRole('button', { name: 'Активировать модификатор', exact: true }).click()
    await confirmation.getByRole('button', { name: 'Активировать', exact: true }).click()
    await expect(confirmation.getByRole('alert')).toBeVisible()
    await expect(confirmation).toBeVisible()
    expect(activationAttempts).toBe(1)
    const successfulClosingContent = confirmation.evaluate(
      (element) =>
        new Promise<boolean[]>((resolve) => {
          const samples: boolean[] = []
          const started = performance.now()
          const sample = () => {
            if (!element.isConnected || performance.now() - started > 2000) {
              resolve(samples)
              return
            }
            const text = element.textContent ?? ''
            samples.push(
              text.includes('Активировать «Защитный знак» за 1 очк. викторины?') &&
                !text.includes('Действие больше недоступно.'),
            )
            requestAnimationFrame(sample)
          }
          requestAnimationFrame(sample)
        }),
    )
    await confirmation.getByRole('button', { name: 'Активировать', exact: true }).click()
    await expect(confirmation).not.toBeVisible()
    const successSamples = await successfulClosingContent
    expect(successSamples.length).toBeGreaterThan(1)
    expect(successSamples.every(Boolean)).toBe(true)
    expect(activationAttempts).toBe(2)
    await expect(page.getByText('Не удалось активировать модификатор.')).toHaveCount(0)
    await expect(modifiers).toContainText('Защитный знак')
    const activeRow = modifiers.getByRole('listitem', { name: 'Защитный знак' })
    const cost = activeRow.getByText('Стоимость: 1 очк.', { exact: true })
    await expect(activeRow.getByText('Активен', { exact: true })).toHaveCount(0)
    const costBounds = (await cost.boundingBox())!
    const activationCountBounds = (await activeRow
      .getByText('1 из 1', { exact: true })
      .boundingBox())!
    expect(activationCountBounds.x).toBeGreaterThan(costBounds.x + costBounds.width)
    expect(activationCountBounds.y + activationCountBounds.height / 2).toBeCloseTo(
      costBounds.y + costBounds.height / 2,
      0,
    )
    const blockedAction = activeRow.getByRole('status')
    await expect(blockedAction).toContainText('Лимит исчерпан')
    expect((await blockedAction.boundingBox())!.width).toBe(144)
    expect((await blockedAction.boundingBox())!.height).toBe(36)
    await expect(modifiers.getByRole('heading', { name: 'Выбор модификаторов' })).toBeInViewport()
    await page.screenshot({
      path: testInfo.outputPath('active-modifier-row.png'),
      animations: 'disabled',
    })
    await modifiers
      .getByRole('listitem', { name: 'Защитный знак' })
      .getByRole('button', { name: 'Подробнее' })
      .click()
    const details = page.getByRole('dialog', { name: 'Защитный знак' })
    await expect(details).toContainText('Защищает команду в раунде.')
    await expect(details.getByText('Защищает команду в раунде.', { exact: true })).toHaveCSS(
      'text-align',
      'left',
    )
    const cancelPurchase = details.getByRole('button', { name: 'Отменить активацию', exact: true })
    await expect(cancelPurchase).toHaveCount(1)
    await cancelPurchase.click()
    const cancelConfirmation = page.getByRole('dialog', { name: 'Отменить покупку модификатора?' })
    await expect(cancelConfirmation).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(cancelConfirmation).not.toBeVisible()
    await expect(details).toBeVisible()
    await expect(cancelPurchase).toBeFocused()
    await details.getByRole('button', { name: 'Закрыть' }).click()
    await modifiers.getByRole('button', { name: 'Закрыть модификаторы' }).click()
    const overview = page.getByTestId('current-round-overview')
    await expect(overview).toContainText('Следы на болотах')
    await expect(overview).toContainText('Ночные странники')
    await expect(overview).toContainText('Ворон')
    await expect(overview).toContainText('Защитный знак')
    const activeModifier = overview.getByRole('button', { name: /Защитный знак/ })
    await activeModifier.click()
    await expect(overview.getByText('Защищает команду в раунде.', { exact: true })).toBeVisible()
    await expect(overview.getByText('Охотник', { exact: true })).toBeVisible()
    await activeModifier.click()
    await page.screenshot({
      path: testInfo.outputPath('current-round.png'),
      animations: 'disabled',
    })
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Посмотреть доску' }),
    ).toHaveCount(0)
    await page.goto('/panel/game-board')
    await expect(page).toHaveURL(/\/panel\/game-board$/)
    await expect(page.getByTestId('game-board-surface')).toBeVisible()
    modifierEnabled = false
    await page.getByRole('link', { name: 'Открыть текущий раунд' }).click()
    await expect(page).toHaveURL(/\/panel\/game-round$/)
    await modifiers
      .getByRole('listitem', { name: 'Защитный знак' })
      .getByRole('button', { name: 'Подробнее' })
      .click()
    await expect(details).toContainText('Этот модификатор больше не включён для текущей игры.')
    const detailsElement = await details.evaluateHandle((dialog) => dialog)
    await cancelPurchase.click()
    await expect(
      cancelConfirmation.getByRole('button', { name: 'Отмена', exact: true }),
    ).toBeVisible()
    const confirmCancellation = cancelConfirmation.getByRole('button', {
      name: 'Отменить покупку и вернуть очки',
    })
    await confirmCancellation.click()
    await expect(cancelConfirmation.getByRole('alert')).toBeVisible()
    const detailsClosingContent = await detailsElement.evaluateHandle((dialog) => {
      const samples = [dialog.textContent]
      const observer = new MutationObserver(() => {
        if (dialog.isConnected) samples.push(dialog.textContent)
      })
      observer.observe(dialog, { subtree: true, childList: true, characterData: true })
      return { samples, observer }
    })
    await confirmCancellation.click()
    await expect(cancelConfirmation).not.toBeVisible()
    await expect(details).not.toBeVisible()
    const detailsExitSamples = await detailsClosingContent.evaluate(({ samples, observer }) => {
      observer.disconnect()
      return samples
    })
    await detailsClosingContent.dispose()
    await detailsElement.dispose()
    expect([...new Set(detailsExitSamples)]).toEqual([detailsExitSamples[0]])
    await expect(modifiers.getByRole('listitem')).toHaveCount(0)
    expect(cancellationAttempts).toBe(2)
    expect(writes).toEqual([])
  })
}

for (const { width, height } of [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`round modifier catalog scrolls with balance and close action visible at ${width}px`, async ({
    page,
  }, testInfo) => {
    await mockGame(page, 'active', 'viewer')
    await page.setViewportSize({ width, height })
    const names = [
      'Чирик',
      'Жажда',
      'Расходник',
      'Трупы',
      'Навыки',
      'Патрон',
      'Проказник',
      'Диарея',
      'Менторбайт',
      'Кэп',
      'Фейерверк',
      'Крыса',
      'Шот',
      'Подъём',
      'Хард75',
    ]
    const costs = [3, 3, 4, 4, 4, 4, 6, 7, 8, 10, 11, 12, 13, 14, 18]
    await page.route('**/api/game/rounds/active', (route) =>
      route.fulfill({ json: activeRoundFixture }),
    )
    await page.route('**/api/game/modifiers/state', (route) =>
      route.fulfill({
        json: {
          gameId: board.gameId,
          availableQuizPoints: 12,
          earnedQuizPoints: 12,
          spentQuizPoints: 0,
          isOrderingOpen: true,
          activeModifiers: [],
          availableModifiers: names.map((name, index) => ({
            modifier: {
              id: `modifier-${index}`,
              category: index < 5 ? 'preparation' : index < 10 ? 'round' : 'result',
              name,
              description: `Описание модификатора «${name}».`,
              activationCost: costs[index],
              activationLimit: index === 4 ? { count: 5 } : null,
              conflictingModifierIds: index === 0 ? ['modifier-1', 'modifier-4'] : [],
              iconEmoji: ['🛡️', '💧', '🎯', '📖', '⌛'][index % 5],
              activationCommand: null,
              revision: 1,
              normalizedTags: [],
              behaviorV2: {
                schemaVersion: 2,
                kind: 'rule',
                phase: 'round',
                performer: 'activeTeam',
                requiresHostMonitoring: false,
                rule: 'Правило',
                stackingPolicy: 'aggregateParameters',
                resolution: { type: 'ruleStatus' },
                reward: 'none',
                formulaReference: null,
              },
            },
            isActive: false,
            canActivate: true,
            blockedReason: null,
            activationsCount: 0,
            limit: index === 4 ? 5 : null,
          })),
        },
      }),
    )
    await page.goto('/panel/game-round')
    const panel = page.getByRole('dialog', { name: 'Модификаторы' })
    await expect(panel).toBeVisible()
    const list = panel.getByTestId('round-modifier-list')
    await expect(list.getByRole('listitem')).toHaveCount(names.length)
    const body = panel.getByTestId('round-modifier-scroll-body')
    const balance = panel.getByTestId('round-modifier-balance')
    await expect(balance).toHaveText('Ваши очки:12 очк.')
    const pointsLabel = balance.getByText('Ваши очки:', { exact: true })
    const pointsValue = balance.getByText('12 очк.', { exact: true })
    await expect(pointsLabel).toHaveCSS('font-weight', '700')
    await expect(pointsLabel).toHaveCSS('font-size', '18px')
    await expect(pointsValue).toHaveCSS('font-weight', '400')
    expect(
      await pointsLabel.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    ).toBeGreaterThan(
      await pointsValue.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    )
    await expect(
      panel.getByText('Доступные модификаторы и их стоимость для текущего раунда.'),
    ).toHaveCount(0)
    await expect(panel.getByText(/^Активно:/)).toHaveCount(0)
    await expect(balance).toHaveCSS('border-top-width', '1px')
    const balanceLine = await balance.locator('p, strong').evaluateAll((elements) =>
      elements.map((element) => {
        const bounds = element.getBoundingClientRect()
        return bounds.y + bounds.height / 2
      }),
    )
    expect(balanceLine[0]).toBeCloseTo(balanceLine[1] ?? 0, 0)
    if (width >= 600) expect((await panel.boundingBox())!.width).toBe(560)
    const skill = list.getByRole('listitem', { name: 'Навыки', exact: true })
    await expect(skill).toContainText('Стоимость: 4 очк.')
    const activationCount = skill.getByLabel('Активировано 0 / 5', { exact: true })
    await expect(activationCount).toHaveText('0 из 5')
    await expect(activationCount).toBeVisible()
    await expect(
      list.getByRole('listitem', { name: 'Расходник', exact: true }).getByText(/^Активировано/),
    ).toHaveCount(0)
    const costLabel = skill.getByText('Стоимость: 4 очк.', { exact: true }).locator('..')
    const costBounds = (await costLabel.boundingBox())!
    const countBounds = (await activationCount.boundingBox())!
    expect(countBounds.x).toBeGreaterThanOrEqual(costBounds.x + costBounds.width)
    expect(countBounds.y + countBounds.height / 2).toBeCloseTo(
      costBounds.y + costBounds.height / 2,
      0,
    )
    await expect(costLabel).toHaveCSS('border-top-width', '1px')
    expect((await costLabel.boundingBox())!.height).toBeLessThanOrEqual(width === 320 ? 34 : 20)
    expect(await costLabel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    )
    const iconBounds = await skill.locator('[aria-hidden="true"]').first().boundingBox()
    expect(iconBounds?.width).toBe(40)
    expect(iconBounds?.height).toBe(40)
    await expect(skill.locator('[aria-hidden="true"]').first()).toHaveText('⌛')
    const titleBounds = (await skill.getByRole('heading', { name: 'Навыки' }).boundingBox())!
    const detailsAction = skill.getByRole('button', { name: 'Подробнее' })
    await expect(detailsAction).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    const defaultBackground = await detailsAction.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    )
    await detailsAction.hover()
    await expect(detailsAction).not.toHaveCSS('background-color', defaultBackground)
    await page.mouse.move(0, 0)
    await expect(detailsAction).toHaveCSS('border-top-width', '0px')
    await expect(detailsAction).toHaveCSS('border-image-source', 'none')
    const actionBounds = (await detailsAction.boundingBox())!
    if (width > 320) expect(actionBounds.x).toBeGreaterThan(titleBounds.x + titleBounds.width)
    else expect(actionBounds.y).toBeGreaterThan(titleBounds.y + titleBounds.height)
    const rowHeight = (await skill.boundingBox())!.height
    expect(rowHeight).toBeLessThanOrEqual(width >= 600 ? 56 : 94)
    const headings = list.locator('section > header')
    await expect(headings).toHaveCount(3)
    await expect(headings.first()).toHaveCSS('border-left-width', '3px')
    await expect(headings.first()).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    for (const category of ['Перед раундом', 'Во время раунда', 'На итог раунда']) {
      const group = list.getByRole('region', { name: category, exact: true })
      await expect(group).toHaveCSS('border-top-width', '1px')
      await expect(group).toHaveCSS('border-bottom-width', '1px')
      await expect(group.getByRole('listitem')).toHaveCount(5)
    }
    const close = panel.getByRole('button', { name: 'Закрыть модификаторы' })
    const balanceBounds = await balance.boundingBox()
    if (width === 1920)
      expect(
        await body.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
      ).toBe(true)
    expect(await body.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    await list.getByRole('listitem', { name: 'Хард75' }).scrollIntoViewIfNeeded()
    await expect(
      list.getByRole('listitem', { name: 'Хард75' }).getByRole('button', { name: 'Подробнее' }),
    ).toBeInViewport()
    await expect(balance).toBeInViewport()
    await expect(close).toBeInViewport()
    expect(await balance.boundingBox()).toEqual(balanceBounds)
    await page.screenshot({
      path: testInfo.outputPath('text-details-actions.png'),
      animations: 'disabled',
    })
    await list
      .getByRole('listitem', { name: 'Чирик' })
      .getByRole('button', { name: 'Подробнее' })
      .click()
    const details = page.getByRole('dialog', { name: 'Чирик' })
    await expect(details).toContainText('Описание модификатора «Чирик».')
    await expect(details.getByText('Описание модификатора «Чирик».', { exact: true })).toHaveCSS(
      'text-align',
      'left',
    )
    const conflicts = details.getByRole('region', { name: 'Несовместимые модификаторы' })
    await expect(conflicts.getByText('Конфликты:')).toHaveCSS('font-weight', '700')
    await expect(conflicts).toHaveCSS('text-align', 'left')
    await expect(conflicts).toHaveText('Конфликты: Жажда, Навыки')
    expect(await conflicts.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    )
    await page.screenshot({
      path: testInfo.outputPath('round-modifier-details.png'),
      animations: 'disabled',
    })
    const closingContent = details.evaluate(
      (element) =>
        new Promise<boolean[]>((resolve) => {
          const samples: boolean[] = []
          const started = performance.now()
          const sample = () => {
            if (!element.isConnected || performance.now() - started > 600) {
              resolve(samples)
              return
            }
            if (Number(getComputedStyle(element).opacity) > 0)
              samples.push(element.textContent?.includes('Описание модификатора «Чирик».') ?? false)
            requestAnimationFrame(sample)
          }
          requestAnimationFrame(sample)
        }),
    )
    await details.getByRole('button', { name: 'Закрыть' }).click()
    const closingSamples = await closingContent
    expect(closingSamples.length).toBeGreaterThan(1)
    expect(closingSamples.every(Boolean)).toBe(true)
    await expect(details).not.toBeVisible()
    await expect(
      list.getByRole('listitem', { name: 'Чирик' }).getByRole('button', { name: 'Подробнее' }),
    ).toBeFocused()
    await skill.getByRole('button', { name: 'Подробнее' }).click()
    const skillDetails = page.getByRole('dialog', { name: 'Навыки', exact: true })
    await expect(skillDetails).toContainText('Описание модификатора «Навыки».')
    await expect(skillDetails.getByRole('status')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(skillDetails).not.toBeVisible()
    if (width === 390) {
      await page.setViewportSize({ width, height: 640 })
      expect(await body.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
        true,
      )
      const lastModifier = list.getByRole('listitem', { name: 'Хард75' })
      await lastModifier.scrollIntoViewIfNeeded()
      await expect(lastModifier.getByRole('button', { name: 'Подробнее' })).toBeVisible()
      await page.setViewportSize({ width, height })
    }
    await body.evaluate((element) => {
      element.scrollTop = 0
    })
    await page.screenshot({
      path: testInfo.outputPath('round-modifiers.png'),
      animations: 'disabled',
    })
    if (width === 320) {
      names[1] = 'МодификаторСОченьДлиннымНазваниеБезПробелов'
      await page.reload()
      const longRow = page.getByRole('listitem', { name: names[1] })
      await expect(longRow).toBeVisible()
      expect(await longRow.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      )
      await expect(longRow.getByRole('button', { name: 'Подробнее' })).toBeInViewport()
    }
  })
}

for (const role of ['viewer', 'admin']) {
  test(`remote card opening keeps ${role === 'viewer' ? 'a player' : 'staff'} on the board`, async ({
    page,
  }) => {
    let sendEvent: ((message: string) => void) | undefined
    let roundOpened = false
    await mockGame(page, 'active', role, 'Ночные странники', (send) => {
      sendEvent = send
    })
    await page.route('**/api/game', (route) =>
      route.fulfill({
        json: {
          ...board,
          version: roundOpened ? 2 : board.version,
          cells: board.cells.map((cell) =>
            cell.id === 'card-2' && roundOpened ? { ...cell, state: 'open' } : cell,
          ),
        },
      }),
    )
    await page.route('**/api/game/rounds/active', (route) =>
      roundOpened
        ? route.fulfill({
            json: { ...activeRoundFixture, cellId: 'card-2', status: 'preparing' },
          })
        : route.fulfill({ status: 204 }),
    )
    await page.route('**/api/game/modifiers/state', (route) =>
      route.fulfill({
        json: {
          gameId: board.gameId,
          availableQuizPoints: 10,
          earnedQuizPoints: 10,
          spentQuizPoints: 0,
          isOrderingOpen: false,
          activeModifiers: [],
          availableModifiers: [],
        },
      }),
    )
    const initialRoundResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/game/rounds/active'),
    )
    await page.goto('/panel/game-board')
    await expect(page.getByTestId('game-board-surface')).toBeVisible()
    await initialRoundResponse
    await expect.poll(() => Boolean(sendEvent)).toBe(true)
    roundOpened = true
    sendEvent?.(
      JSON.stringify({
        type: 1,
        target: 'cellOpened',
        arguments: [
          { gameId: board.gameId, version: 2, cell: { ...board.cells[2], state: 'open' } },
        ],
      }) + '\u001e',
    )
    await expect(page.getByRole('link', { name: 'Открыть текущий раунд' })).toBeVisible()
    await expect(page).toHaveURL(/\/panel\/game-board$/)
    await expect(page.locator('[data-cell-id="card-2"]')).toHaveAttribute(
      'aria-label',
      'Открыть текущий раунд',
    )
    await expect(page).toHaveURL(/\/panel\/game-board$/)
  })
}

test('card confirmation stays busy during submission and preserves the card after failure', async ({
  page,
}) => {
  await mockGame(page)
  let releaseOpen = () => {}
  const openGate = new Promise<void>((resolve) => {
    releaseOpen = resolve
  })
  let attempts = 0
  await page.route('**/api/game/cells/card-2/open', async (route) => {
    attempts += 1
    await openGate
    await route.fulfill({ status: 503, json: { message: 'internal diagnostic' } })
  })
  await page.goto('/panel/game-board')
  await page.locator('[data-cell-id="card-2"]').click()
  const confirmation = page.getByRole('dialog', { name: 'Открыть карточку?' })
  await confirmation.getByRole('button', { name: 'Открыть', exact: true }).click()
  await expect(confirmation.getByRole('button', { name: 'Открываем' })).toBeDisabled()
  await expect(confirmation.getByRole('progressbar')).toBeVisible()
  await expect(confirmation).toContainText('100 очк.')
  await page.keyboard.press('Escape')
  await expect(confirmation).toBeVisible()
  releaseOpen()
  await expect(confirmation.getByRole('alert')).toBeVisible()
  await expect(confirmation).not.toContainText('internal diagnostic')
  await expect(confirmation).toContainText('Испытание 3')
  await expect(confirmation).toContainText('100 очк.')
  await confirmation.getByRole('button', { name: 'Открыть', exact: true }).click()
  await expect.poll(() => attempts).toBe(2)
  await expect(confirmation.getByRole('button', { name: 'Отмена', exact: true })).toBeEnabled()
  await page.screenshot({
    path: '../.tmp/agent-work/reviews/card-open-failure.png',
    animations: 'disabled',
  })
  await confirmation.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(confirmation).toHaveCount(0)
  await expect(page).toHaveURL(/\/panel\/game-board$/)
})

test('the administrator who opens a new card goes straight to the current round', async ({
  page,
}, testInfo) => {
  await mockGame(page, 'active', 'admin')
  let roundOpened = false
  await page.route('**/api/game', (route) =>
    route.fulfill({
      json: {
        ...board,
        version: roundOpened ? 2 : board.version,
        cells: board.cells.map((cell) =>
          cell.id === 'card-2' && roundOpened ? { ...cell, state: 'open' } : cell,
        ),
      },
    }),
  )
  await page.route('**/api/game/rounds/active', (route) =>
    roundOpened
      ? route.fulfill({
          json: {
            ...activeRoundFixture,
            cellId: 'card-2',
            cellTitle: 'Испытание 3',
            status: 'preparing',
          },
        })
      : route.fulfill({ status: 204 }),
  )
  await page.route('**/api/game/cells/card-2/open', (route) => {
    roundOpened = true
    return route.fulfill({ status: 204 })
  })

  await page.goto('/panel/game-board')
  await page.locator('[data-cell-id="card-2"]').click()
  const confirmation = page.getByRole('dialog')
  await expect(confirmation).toContainText('Испытание 3')
  await confirmation.getByRole('button', { name: 'Открыть', exact: true }).click()

  await expect(page).toHaveURL(/\/panel\/game-round$/)
  await expect(page.getByTestId('current-round-screen')).toContainText('Испытание 3')
  await expect(page.getByRole('dialog', { name: 'Испытание 3' })).toHaveCount(0)
  await page.screenshot({
    path: testInfo.outputPath('opened-card-round.png'),
    animations: 'disabled',
  })
})

test('a player can reopen the active round by clicking its card on the board', async ({ page }) => {
  await mockGame(page, 'active', 'viewer')
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'in_progress' } }),
  )
  await page.goto('/panel/game-board')

  const card = page.locator('[data-cell-id="card-0"]')
  await expect(card).toHaveAttribute('aria-label', 'Открыть текущий раунд')
  await card.click()

  await expect(page).toHaveURL(/\/panel\/game-round$/)
})

test('staff also opens the active round from its card', async ({ page }) => {
  await mockGame(page, 'active', 'admin')
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'in_progress' } }),
  )
  await page.goto('/panel/game-board')

  await page.locator('[data-cell-id="card-0"]').click()

  await expect(page).toHaveURL(/\/panel\/game-round$/)
})

test('a question opens on the round screen and accepts an answer without leaving it', async ({
  page,
}, testInfo) => {
  let selectedOptionId: string | null = null
  const writes = await mockGame(page, 'active', 'viewer')
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'in_progress' } }),
  )
  await page.route('**/api/game/modifiers/state', (route) =>
    route.fulfill({
      json: {
        gameId: board.gameId,
        availableQuizPoints: 10,
        earnedQuizPoints: 10,
        spentQuizPoints: 0,
        isOrderingOpen: false,
        activeModifiers: [],
        availableModifiers: [],
      },
    }),
  )
  await page.route('**/api/game/quiz/current', (route) =>
    route.fulfill({
      json: {
        questionSessionId: 'quiz-one',
        gameId: board.gameId,
        askOrder: 1,
        questionId: 'question-one',
        questionCode: 'Q-1',
        categoryName: 'Охота',
        text: 'Куда ведут следы?',
        options: [
          { optionId: 'option-one', text: 'К болоту', displayOrder: 1 },
          { optionId: 'option-two', text: 'К лесу', displayOrder: 2 },
        ],
        status: 'open',
        correctOptionId: null,
        myIsCorrect: null,
        myAwardedPoints: null,
        reward: 10,
        askedAtUtc: new Date(Date.now() - 1_000).toISOString(),
        closesAtUtc: new Date(Date.now() + 60_000).toISOString(),
        mySelectedOptionId: selectedOptionId,
      },
    }),
  )
  await page.route('**/api/game/quiz/question-sessions/quiz-one/submissions', (route) => {
    selectedOptionId = 'option-one'
    return route.fulfill({
      json: {
        submissionId: 'submission-one',
        questionSessionId: 'quiz-one',
        userId: 'player-one',
        selectedOptionId,
        submittedAtUtc: new Date().toISOString(),
        isExisting: false,
      },
    })
  })
  await page.goto('/panel/game-round')
  const question = page.getByRole('dialog', { name: 'Текущий вопрос' })
  await expect(question).toBeVisible()
  await expect(question).toContainText('Куда ведут следы?')
  await question.screenshot({ path: testInfo.outputPath('quiz-petal.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(question).toBeVisible()
  await question.screenshot({ path: testInfo.outputPath('quiz-petal-mobile.png') })
  expect(await question.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true,
  )
  await question.getByRole('button', { name: 'К болоту' }).click()
  await expect(question).toBeVisible()
  await expect(question).toContainText('Ответ принят')
  await expect(question.getByRole('button', { name: /К болоту/ })).toBeDisabled()
  await question.getByRole('button', { name: 'Закрыть вопрос' }).click()
  await page.getByRole('button', { name: 'Открыть вопрос' }).click()
  await expect(question).toContainText('Ответ принят')
  await expect(page).toHaveURL(/\/panel\/game-round$/)
  expect(writes).toEqual([])
})

for (const width of [320, 390, 768, 1440]) {
  test.describe(`quiz input at ${width}px`, () => {
    test.use({ hasTouch: width < 768 })
    test(`quiz drawer keeps 24 answers readable and clickable at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 740 })
      await mockGame(page, 'active', 'viewer')
      await page.route('**/api/game/rounds/active', (route) =>
        route.fulfill({ json: { ...activeRoundFixture, status: 'in_progress' } }),
      )
      const options = Array.from({ length: 24 }, (_, index) => ({
        optionId: `answer-${index}`,
        text: `Вариант ответа ${index + 1}`,
        displayOrder: index,
      }))
      const deadline = Date.now() + 120_000
      let selected: string | null = null
      let attempts = 0
      let complete: (() => void) | undefined
      await page.route('**/api/game/quiz/current', (route) =>
        route.fulfill({
          json: {
            questionSessionId: 'quiz-many',
            gameId: board.gameId,
            askOrder: 1,
            questionId: 'question-many',
            questionCode: 'Q-24',
            categoryName: 'Скрытая категория',
            text: 'Какой из этих путей приведёт охотника к заброшенной лесопилке?',
            options,
            reward: 10,
            status: 'open',
            askedAtUtc: new Date(deadline - 120_000).toISOString(),
            closesAtUtc: new Date(deadline).toISOString(),
            mySelectedOptionId: selected,
          },
        }),
      )
      await page.route(
        '**/api/game/quiz/question-sessions/quiz-many/submissions',
        async (route) => {
          attempts++
          if (attempts === 1) return route.fulfill({ status: 500 })
          await new Promise<void>((resolve) => {
            complete = resolve
          })
          selected = route.request().postDataJSON().optionId
          return route.fulfill({
            json: {
              submissionId: 'submission-many',
              questionSessionId: 'quiz-many',
              userId: 'player-one',
              selectedOptionId: selected,
              submittedAtUtc: new Date().toISOString(),
              isExisting: false,
            },
          })
        },
      )
      await page.goto('/panel/game-round')
      const question = page.getByRole('dialog', { name: 'Текущий вопрос' })
      await expect(question.getByRole('heading', { name: /Какой из этих путей/ })).toBeVisible()
      await expect(question.getByRole('timer')).toBeVisible()
      const logo = question.locator('img')
      await expect(logo).toHaveAttribute('src', '/brand/deadmans-monogram.svg')
      await expect
        .poll(() => logo.evaluate((image) => (image as HTMLImageElement).naturalWidth))
        .toBe(192)
      await expect(logo).toBeVisible()
      await expect(question).toContainText('Скрытая категория')
      const answers = question.getByRole('button', { name: /^Вариант ответа/ })
      await expect(answers).toHaveCount(24)
      const first = (await answers.nth(0).boundingBox())!
      const second = (await answers.nth(1).boundingBox())!
      if (width >= 768) expect(Math.abs(first.y - second.y)).toBeLessThan(1)
      else expect(second.y).toBeGreaterThanOrEqual(first.y + first.height)
      for (const answer of await answers.all()) {
        expect(
          await answer.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
        ).toBe(true)
        await expect(answer).toBeEnabled()
      }
      expect(
        await question.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBe(true)
      await question.screenshot({
        path: testInfo.outputPath(`quiz-drawer-${width}.png`),
        animations: 'disabled',
      })
      const last = question.getByRole('button', { name: 'Вариант ответа 24', exact: true })
      await last.scrollIntoViewIfNeeded()
      if (width < 768) await last.tap()
      else await last.click()
      await expect(question).toContainText('Не удалось выполнить действие')
      await expect(last).toBeEnabled()
      await last.focus()
      await page.keyboard.press('Enter')
      await expect.poll(() => Boolean(complete)).toBe(true)
      await expect(answers.nth(0)).toBeDisabled()
      await expect(last).toBeDisabled()
      expect(attempts).toBe(2)
      complete?.()
      await expect(question).toContainText('Ответ принят')
      await expect(question.getByRole('button', { name: /Вариант ответа 24/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      const accepted = question.getByRole('button', { name: /Вариант ответа 24/ })
      await expect(accepted).toHaveCSS('box-shadow', /inset/)
      await accepted.scrollIntoViewIfNeeded()
      await question.screenshot({
        path: testInfo.outputPath(`quiz-drawer-accepted-${width}.png`),
        animations: 'disabled',
      })
      await question.getByRole('button', { name: 'Закрыть вопрос' }).click()
      await page.getByRole('button', { name: 'Открыть вопрос' }).click()
      await expect(question).toContainText('Ответ принят')
    })
  })
}

test('quiz drawer wraps long answers and blocks them at the local deadline', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 600 })
  await mockGame(page, 'active', 'viewer')
  const now = new Date('2026-09-30T12:00:00Z')
  await page.clock.install({ time: now })
  await page.route('**/api/game/quiz/current', (route) =>
    route.fulfill({
      json: {
        questionSessionId: 'quiz-long',
        gameId: board.gameId,
        askOrder: 1,
        questionId: 'question-long',
        questionCode: 'Q-long',
        categoryName: 'Охота',
        text: 'Какой путь выбрать, если нужно добраться до мельницы незамеченным?',
        options: Array.from({ length: 8 }, (_, index) => ({
          optionId: `long-${index}`,
          displayOrder: index,
          text: `${index + 1}. Пройти вдоль берега реки, затем свернуть к заброшенной пристани и продолжить путь через камыши, избегая открытых участков.`,
        })),
        reward: 10,
        status: 'open',
        askedAtUtc: now.toISOString(),
        closesAtUtc: new Date(now.getTime() + 10_000).toISOString(),
      },
    }),
  )
  await page.goto('/panel/game-board')
  const question = page.getByRole('dialog', { name: 'Текущий вопрос' })
  await expect(question.getByRole('timer')).toBeVisible()
  const answers = question.getByRole('button', { name: /Пройти вдоль/ })
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 600 })
    const first = (await answers.nth(0).boundingBox())!
    const second = (await answers.nth(1).boundingBox())!
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height)
    for (const answer of await answers.all())
      expect(
        await answer.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBe(true)
    await question.screenshot({
      path: testInfo.outputPath(`quiz-drawer-long-${width}.png`),
      animations: 'disabled',
    })
  }
  await page.clock.fastForward(11_000)
  await expect(question.getByRole('timer')).toHaveText('00:00')
  await expect(answers.nth(0)).toBeDisabled()
  await expect(answers.nth(7)).toBeDisabled()
  await expect(question.locator('[data-quiz-result]')).toHaveCount(0)
})

test('quiz petal disappears after the question closes', async ({ page }) => {
  let status = 'open'
  let sendEvent: ((message: string) => void) | undefined
  await mockGame(page, 'active', 'viewer', 'Ночные странники', (send) => {
    sendEvent = send
  })
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'in_progress' } }),
  )
  await page.route('**/api/game/quiz/current', (route) =>
    route.fulfill({
      json: {
        questionSessionId: 'quiz-expiring',
        gameId: board.gameId,
        askOrder: 1,
        questionId: 'question-expiring',
        questionCode: 'Q-4',
        categoryName: 'Охота',
        text: 'Куда идти?',
        options: [{ optionId: 'one', text: 'К берегу', displayOrder: 1 }],
        status,
        askedAtUtc: new Date().toISOString(),
        closesAtUtc: new Date(Date.now() + 60_000).toISOString(),
      },
    }),
  )
  await page.goto('/panel/game-round')
  await expect(page.getByRole('dialog', { name: 'Текущий вопрос' })).toBeVisible()
  await expect.poll(() => Boolean(sendEvent)).toBe(true)
  status = 'closed'
  sendEvent?.(JSON.stringify({ type: 1, target: 'quizStateChanged', arguments: [{}] }) + '\u001e')
  await expect(page.getByRole('button', { name: 'Открыть вопрос' })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Текущий вопрос' })).toHaveCount(0)
})

test('moderator can answer the round question and the accepted choice survives a failed refresh', async ({
  page,
}) => {
  let submitted = false
  let submissions = 0
  const writes = await mockGame(page, 'active', 'admin')
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'in_progress' } }),
  )
  await page.route('**/api/game/quiz/current', (route) =>
    submitted
      ? route.fulfill({ status: 500 })
      : route.fulfill({
          json: {
            questionSessionId: 'quiz-moderator',
            gameId: board.gameId,
            askOrder: 1,
            questionId: 'question-moderator',
            questionCode: 'Q-5',
            categoryName: 'Охота',
            text: 'Куда идти?',
            options: [{ optionId: 'one', text: 'К берегу', displayOrder: 1 }],
            status: 'open',
            askedAtUtc: new Date().toISOString(),
            closesAtUtc: new Date(Date.now() + 60_000).toISOString(),
          },
        }),
  )
  await page.route('**/api/game/quiz/question-sessions/quiz-moderator/submissions', (route) => {
    submissions++
    expect(route.request().postDataJSON()).toEqual({ optionId: 'one' })
    submitted = true
    return route.fulfill({
      json: {
        submissionId: 'submission-moderator',
        questionSessionId: 'quiz-moderator',
        userId: 'admin-one',
        selectedOptionId: 'one',
        submittedAtUtc: new Date().toISOString(),
        isExisting: false,
      },
    })
  })
  await page.goto('/panel/game-round')
  const question = page.getByRole('dialog', { name: 'Текущий вопрос' })
  await expect(question).toContainText('Куда идти?')
  await expect(question.getByRole('button', { name: 'К берегу' })).toBeEnabled()
  await question.getByRole('button', { name: 'К берегу' }).focus()
  await page.keyboard.press('Enter')
  await expect(question).toContainText('Ответ принят')
  await expect(question.getByRole('button', { name: /К берегу/ })).toBeDisabled()
  await expect(question).toContainText('Не удалось загрузить')
  expect(submissions).toBe(1)
  expect(writes).toEqual([])
})

test('round refresh errors preserve content and ordering takes priority over the quiz', async ({
  page,
}) => {
  let sendEvent: ((message: string) => void) | undefined
  let phase = 'in_progress'
  let refreshFails = false
  await mockGame(page, 'active', 'viewer', 'Ночные странники', (send) => {
    sendEvent = send
  })
  await page.route('**/api/game/rounds/active', (route) =>
    refreshFails
      ? route.fulfill({ status: 500 })
      : route.fulfill({ json: { ...activeRoundFixture, status: phase } }),
  )
  await page.route('**/api/game/modifiers/state', (route) =>
    route.fulfill({
      json: {
        gameId: board.gameId,
        availableQuizPoints: 10,
        earnedQuizPoints: 10,
        spentQuizPoints: 0,
        isOrderingOpen: phase === 'awaiting_modifiers',
        activeModifiers: [],
        availableModifiers: [],
      },
    }),
  )
  await page.route('**/api/game/quiz/current', (route) =>
    route.fulfill({
      json: {
        questionSessionId: 'quiz-priority',
        gameId: board.gameId,
        askOrder: 1,
        questionId: 'question-priority',
        questionCode: 'Q-3',
        categoryName: 'Охота',
        text: 'Какой путь выбрать?',
        options: [{ optionId: 'one', text: 'К берегу', displayOrder: 1 }],
        status: 'open',
        askedAtUtc: new Date().toISOString(),
        closesAtUtc: new Date(Date.now() + 60_000).toISOString(),
      },
    }),
  )
  const update = () =>
    sendEvent?.(
      JSON.stringify({ type: 1, target: 'roundStateChanged', arguments: [{}] }) + '\u001e',
    )
  await page.goto('/panel/game-round')
  const question = page.getByRole('dialog', { name: 'Текущий вопрос' })
  const modifiers = page.getByRole('dialog', { name: 'Модификаторы', exact: true })
  await expect(question).toBeVisible()
  await expect.poll(() => Boolean(sendEvent)).toBe(true)
  phase = 'awaiting_modifiers'
  update()
  await expect(modifiers).toBeVisible()
  await expect(question).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Открыть вопрос' })).toHaveCount(0)
  await modifiers.getByRole('button', { name: 'Закрыть модификаторы' }).click()
  refreshFails = true
  update()
  const overview = page.getByTestId('current-round-overview')
  await expect(
    page.getByRole('main').getByRole('button', { name: 'Повторить', exact: true }),
  ).toBeVisible()
  await expect(overview).toContainText('Следы на болотах')
  await expect(question).not.toBeVisible()
  refreshFails = false
  phase = 'in_progress'
  await page.getByRole('main').getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(question).toBeVisible()
  await expect(modifiers).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Модификаторы', exact: true })).toHaveCount(0)
  await expect(page).toHaveURL(/\/panel\/game-round$/)
})

test('a question also reaches a player on the board between rounds', async ({ page }) => {
  await mockGame(page, 'active', 'viewer')
  await page.route('**/api/game/quiz/current', (route) =>
    route.fulfill({
      json: {
        questionSessionId: 'quiz-between-rounds',
        gameId: board.gameId,
        askOrder: 1,
        questionId: 'question-between-rounds',
        questionCode: 'Q-2',
        categoryName: 'Охота',
        text: 'Какой путь выбрать?',
        options: [{ optionId: 'option-one', text: 'К берегу', displayOrder: 1 }],
        status: 'open',
        askedAtUtc: new Date(Date.now() - 1_000).toISOString(),
        closesAtUtc: new Date(Date.now() + 60_000).toISOString(),
      },
    }),
  )
  await page.goto('/panel/game-board')
  const question = page.getByRole('dialog', { name: 'Текущий вопрос' })
  await expect(question).toContainText('Какой путь выбрать?')
  await question.getByRole('button', { name: 'Закрыть вопрос' }).click()
  await expect(page.getByTestId('game-board-surface')).toBeVisible()
  await page.getByRole('button', { name: 'Открыть вопрос' }).click()
  await expect(question).toBeVisible()
  await expect(page).toHaveURL(/\/panel\/game-board$/)
})

for (const touch of [false, true]) {
  test(`progress disclosure exposes the roster with ${touch ? 'touch' : 'keyboard'}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: touch ? 390 : 1440, height: 900 },
      hasTouch: touch,
    })
    const page = await context.newPage()
    const writes = await mockGame(page)
    await page.goto('/panel/game-board')
    const toggle = page.getByTestId('game-board-phase-toggle')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toContainText('Ночные странники')
    const roster = page.getByRole('region', { name: 'Активная команда', exact: true })
    await expect(roster).not.toBeVisible()
    if (touch) {
      await toggle.tap()
    } else {
      await toggle.focus()
      await page.keyboard.press('Enter')
    }
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(roster).toContainText('Ночные странники')
    await expect(roster.getByRole('listitem')).toHaveText(['Искатель приключений', 'Ворон'])
    await expect(roster).not.toContainText('Стрелок')
    const rows = await roster.getByRole('listitem').all()
    const first = (await rows[0]!.boundingBox())!
    const second = (await rows[1]!.boundingBox())!
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height)
    expect(await roster.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.getByTestId('game-board-context').screenshot({
      path: `../.tmp/game-board-design/progress-expanded-${touch ? 390 : 1440}.png`,
      animations: 'disabled',
    })
    if (touch) await toggle.tap()
    else await page.keyboard.press('Space')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(roster).not.toBeVisible()
    await expect(toggle).toBeFocused()
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    expect(writes).toEqual([])
    await context.close()
  })
}

test('board progress separates the active team from waiting teams and shows final scores', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockGame(page, 'active', 'admin', 'Ночные странники', undefined, 4, 75, true)
  await page.goto('/panel/game-board')
  const context = page.getByTestId('game-board-context')
  await expandProgress(page)
  const summaries = await context
    .locator('[data-testid="game-board-phase"], [data-testid="game-board-status-title"]')
    .evaluateAll((values) =>
      values.map((value) => {
        const group = value.parentElement!
        const label = group.firstElementChild!
        const styles = getComputedStyle(group)
        return {
          height: value.getBoundingClientRect().height,
          labelGap: value.getBoundingClientRect().top - label.getBoundingClientRect().bottom,
          paddingTop: styles.paddingTop,
          paddingBottom: styles.paddingBottom,
        }
      }),
    )
  expect(summaries).toHaveLength(2)
  expect(summaries[0]).toEqual(summaries[1])
  const queue = page.getByTestId('game-board-team-queue')
  await expect(queue.getByRole('region', { name: 'В очереди · 2' })).toBeVisible()
  await expect(queue.getByRole('heading', { name: 'Сыграли' })).toBeVisible()
  await expect(queue).not.toContainText('Ночные странники')
  const activeTeam = context.getByRole('region', { name: 'Активная команда' })
  await expect(activeTeam).toContainText('Ночные странники')
  expect(
    await activeTeam
      .getByText('Ночные странники')
      .evaluate((element) => getComputedStyle(element).color),
  ).toBe(await activeTeam.getByText('Ворон').evaluate((element) => getComputedStyle(element).color))
  expect(
    await activeTeam.evaluate((element) => {
      const styles = getComputedStyle(element)
      return styles.borderLeftWidth === styles.borderRightWidth
    }),
  ).toBe(true)
  await expect(activeTeam).not.toContainText('Ваша команда')
  await expect(queue.getByText('Команда 3')).toBeVisible()
  const ownPlayedTeam = queue.getByRole('listitem').last()
  await expect(ownPlayedTeam).toContainText('Последний рубеж')
  await expect(ownPlayedTeam).toHaveCSS('border-left-width', '3px')
  await expect(queue.getByLabel('Итоговый результат: 75 очков')).toHaveText('75 очк.')
  await expect(
    queue.getByLabel('Итоговый результат: 75 очков').getByText('75 очк.', { exact: true }),
  ).toHaveCSS('color', 'rgb(144, 151, 128)')
  const contextBox = (await context.boundingBox())!
  const fieldBox = (await page.locator('[data-board-field]').boundingBox())!
  expect(contextBox.x).toBeGreaterThanOrEqual(16)
  expect(Math.abs(contextBox.x + contextBox.width / 2 - (fieldBox.x + 16) / 2)).toBeLessThanOrEqual(
    2,
  )
  expect(contextBox.y).toBe((await page.getByRole('columnheader').first().boundingBox())!.y)
  expect((await queue.boundingBox())!.y).toBeGreaterThan(
    (await context.getByTestId('game-board-status-title').boundingBox())!.y,
  )
  await context.getByText('Выбор карточки', { exact: true }).hover()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
})

test('expanded progress keeps a Full HD board free of page scrollbars', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await mockGame(page, 'active', 'admin', 'Ночные странники', undefined, 20, 75, true)
  await page.goto('/panel/game-board')
  await expandProgress(page)

  const queueScroll = page.getByTestId('game-board-team-queue').locator('..')
  expect(
    await page.getByText('Ваша команда').evaluate((element) => ({
      width: getComputedStyle(element).width,
      height: getComputedStyle(element).height,
    })),
  ).toEqual({ width: '1px', height: '1px' })
  await expect(page.getByTestId('game-board-team-queue').getByRole('listitem')).toHaveCount(19)
  expect(await queueScroll.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
    true,
  )
  expect(
    await page.evaluate(() => ({
      vertical: document.documentElement.scrollHeight <= innerHeight + 1,
      horizontal: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    })),
  ).toEqual({ vertical: true, horizontal: true })
  await queueScroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(
    page.getByTestId('game-board-team-queue').getByRole('listitem').last(),
  ).toBeInViewport()
})

for (const score of [-30, 0, null]) {
  test(`played team queue shows ${score ?? 'no'} final score on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockGame(page, 'active', 'admin', 'Ночные странники', undefined, 2, score)
    await page.goto('/panel/game-board')
    await expandProgress(page)
    await page.getByRole('button', { name: 'Посмотреть очередь команд' }).click()
    const dialog = page.getByRole('dialog', { name: 'Очередь команд' })
    const scoreLabel = dialog.getByLabel(
      score === null ? 'Нет завершённого раунда' : `Итоговый результат: ${score} очков`,
    )
    await expect(scoreLabel).toHaveText(score === null ? '-' : `${score} очк.`)
    if (score !== null && score < 0)
      await expect(scoreLabel.getByText(`${score} очк.`, { exact: true })).toHaveCSS(
        'color',
        'rgb(164, 99, 92)',
      )
  })
}

for (const width of [320, 390, 768, 1024]) {
  test(`stacked board opens its queue without moving cards at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockGame(page, 'active', 'admin', 'Ночные странники', undefined, 20)
    await page.goto('/panel/game-board')
    await expandProgress(page)
    const opener = page.getByRole('button', { name: 'Посмотреть очередь команд' })
    await expect(opener).toHaveText('В очереди 18 · Сыграли 1')
    await expect(page.getByTestId('game-board-team-queue')).toHaveCount(0)
    const card = page.locator('[data-cell-id="card-0"]')
    const before = await card.boundingBox()
    await opener.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Очередь команд' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog.getByText('Ночные странники', { exact: true })).toHaveCount(1)
    await expect(dialog.getByText('Команда 20', { exact: true })).toBeAttached()
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    const bounds = (await dialog.boundingBox())!
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(900)
    await dialog.getByRole('button', { name: 'Закрыть', exact: true }).last().focus()
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await page.screenshot({
      path: `../.tmp/game-board-design/queue-${width}.png`,
      animations: 'disabled',
    })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(opener).toBeFocused()
    expect(await card.boundingBox()).toEqual(before)
  })
}

test('queue dialog survives resizing and restores focus when its mobile trigger disappears', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockGame(page)
  await page.goto('/panel/game-board')
  await expandProgress(page)
  await page.getByRole('button', { name: 'Посмотреть очередь команд' }).click()
  const dialog = page.getByRole('dialog', { name: 'Очередь команд' })
  await expect(dialog).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByTestId('game-board-context').getByRole('heading', { name: 'Ход игры', exact: true }),
  ).toBeFocused()
  await expect(page.getByTestId('game-board-team-queue').getByText('Последний рубеж')).toBeVisible()
})

for (const width of [390, 1440]) {
  test(`management quick team selection is a framed keyboard disclosure at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 })
    const writes = await mockGame(page, 'active', 'admin', 'Ночные странники', undefined, 6)
    await page.goto('/panel/game-board')
    await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
    const team = page.getByTestId('management-team-section')
    const selection = team.getByRole('button', { name: 'Быстрый выбор команды', exact: true })
    await expect(selection).toHaveAttribute('aria-expanded', 'false')
    const phase = page.getByTestId('management-round-phase')
    expect((await phase.locator('[aria-current="step"]').boundingBox())!.height).toBeCloseTo(
      await selection.evaluate((element) => element.parentElement!.getBoundingClientRect().height),
      0,
    )
    const help = page.getByRole('tooltip').filter({ hasText: 'Выбор активной команды и отметка' })
    await team.getByText('Ворон', { exact: true }).hover()
    await expect(help).not.toBeVisible()
    const heading = team
      .getByRole('heading', { name: 'Активная команда', exact: true })
      .locator('span[tabindex="0"]')
    await heading.hover()
    await expect(help).toBeVisible()
    await expect(help).toHaveAttribute('data-popper-placement', width === 1440 ? 'left' : 'top')
    await team.getByText('Ночные странники', { exact: true }).hover()
    await expect(help).not.toBeVisible()

    expect(
      await selection.evaluate((element) =>
        parseFloat(getComputedStyle(element.parentElement!).borderTopWidth),
      ),
    ).toBeGreaterThanOrEqual(1)
    await selection.focus()
    await page.keyboard.press('Enter')
    await expect(selection).toHaveAttribute('aria-expanded', 'true')
    await expect(team.getByRole('button').filter({ hasText: 'Команда' })).not.toHaveCount(0)
    expect(await team.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    await page
      .getByRole('dialog', { name: 'Инструменты управления игрой' })
      .screenshot({ path: info.outputPath('quick-team-selection.png'), animations: 'disabled' })
    expect(writes).toEqual([])
  })
}

for (const width of [320, 390, 1440]) {
  test(`compact manual points keeps fields aligned and requires confirmation at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 })
    const writes = await mockGame(page)
    await page.route('**/api/game/quiz/manual-awards/players', (route) =>
      route.fulfill({
        json: [
          { userId: 'player-one', login: 'raven', displayName: 'Ворон', availableQuizPoints: 20 },
        ],
      }),
    )
    await page.goto('/panel/game-board')
    await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
    const section = page.getByTestId('management-manual-quiz-section')
    await section.getByRole('button', { name: 'Очки викторины', exact: true }).click()
    await section.getByRole('combobox', { name: 'Игрок', exact: true }).click()
    await page.getByRole('option').filter({ hasText: 'Ворон' }).click()
    const points = section.getByRole('textbox', { name: 'Очки', exact: true })
    await points.fill('5')
    await section
      .getByRole('textbox', { name: 'Причина корректировки', exact: true })
      .fill('Исправление результата')
    const operation = section.getByRole('combobox', { name: /^Операция/ })
    const bounds = await Promise.all([points.boundingBox(), operation.boundingBox()])
    expect(Math.abs(bounds[0]!.y - bounds[1]!.y)).toBeLessThanOrEqual(1)
    expect(await section.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    )
    await section.screenshot({
      path: info.outputPath('compact-manual-points.png'),
      animations: 'disabled',
    })
    await section.getByRole('button', { name: 'Применить корректировку', exact: true }).click()
    await expect(page.getByRole('dialog', { name: /корректиров/i })).toBeVisible()
    expect(writes).toEqual([])
    await page.keyboard.press('Escape')
  })
}

for (const width of [320, 1440]) {
  test(`long team names and large scores remain readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 500 : 900 })
    await mockGame(page)
    const longName = 'ОченьДлинноеНазваниеКомандыБезПробеловДляПроверки'
    const category = 'Только куст и корточки в самой дальней части карты'
    await page.route('**/api/game', (route) =>
      route.fulfill({ json: { ...board, colLabels: [category, ...categories.slice(1)] } }),
    )
    await page.route('**/api/game/team-queue', (route) =>
      route.fulfill({
        json: {
          gameId: board.gameId,
          teams: Array.from({ length: 6 }, (_, index) => ({
            teamId: index === 0 ? 'team-one' : `team-${index}`,
            teamName: index === 1 ? longName : `Охотники ${index}`,
            teamSlotIndex: index + 1,
            isPlayed: index > 0,
            playedAtUtc: index > 0 ? '2026-09-01T10:00:00Z' : null,
            finalScore: index === 1 ? 1234567 : index * 100,
            participants:
              index === 1
                ? [{ userId: 'c592262f-8e49-466d-a4fc-2de69ba46771', displayName: 'Охотник' }]
                : [],
          })),
          summary: { totalTeams: 6, remainingTeams: 1, playedTeams: 5 },
        },
      }),
    )
    await page.goto('/panel/game-board')
    await expandProgress(page)
    if (width === 320) {
      await expect(page.getByTestId('board-selected-category')).toHaveText(category)
      await page.getByRole('button', { name: 'Посмотреть очередь команд' }).click()
    }
    const queue = page.getByTestId('game-board-team-queue')
    await expect(queue.getByText(longName)).toBeVisible()
    expect(
      await queue
        .getByText('Ваша команда')
        .evaluate((element) => getComputedStyle(element).clipPath),
    ).toBe('inset(50%)')
    const row = queue.getByRole('listitem').filter({ hasText: longName })
    if (width === 320) {
      await queue.getByText('Охотники 5', { exact: true }).scrollIntoViewIfNeeded()
      await expect(queue.getByText('Охотники 5', { exact: true })).toBeInViewport()
      await row.scrollIntoViewIfNeeded()
    }
    expect(await row.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    const score = row.getByLabel(/Итоговый результат/)
    expect((await score.textContent())!.replace(/\s/g, '')).toBe('1234567очк.')
    await expect(score).toBeVisible()
    const nameBox = (await row.getByText(longName).boundingBox())!
    const scoreBox = (await score.boundingBox())!
    expect(nameBox.width).toBeGreaterThanOrEqual(100)
    expect(nameBox.x + nameBox.width).toBeLessThan(scoreBox.x)
    expect(scoreBox.y).toBeLessThan(nameBox.y + nameBox.height)
    expect(scoreBox.y + scoreBox.height).toBeGreaterThan(nameBox.y)
    await page.screenshot({
      path: `../.tmp/game-board-design/queue-long-${width}.png`,
      animations: 'disabled',
    })
    if (width === 320) {
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Посмотреть очередь команд' })).toBeFocused()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('closed and revealed cards omit hover tooltips and retain accessible actions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockGame(page)
  await page.goto('/panel/game-board')
  for (const id of ['card-0', 'card-2']) {
    const card = page.locator(`[data-cell-id="${id}"]`)
    await card.hover()
    await page.waitForTimeout(500)
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await expect(card).not.toHaveAttribute('title')
    await expect(card).toHaveAccessibleName(/Открыть карточку/)
  }
})

for (const width of [320, 390, 768, 1024, 1200, 1440, 1920, 2560]) {
  test(`game board is readable and operable at ${width}px`, async ({ page }) => {
    const height =
      width === 320
        ? 700
        : width === 390
          ? 844
          : width === 768
            ? 800
            : width === 1440
              ? 900
              : width === 2560
                ? 1440
                : 1080
    await page.setViewportSize({ width, height })
    const writes = await mockGame(page)
    await page.goto('/panel/game-board')
    await expect(page.getByRole('heading', { name: 'Последняя охота' })).toBeVisible()
    await expect(page.getByRole('progressbar')).toHaveCount(0)
    const region = page.getByRole('region', { name: 'Последняя охота' })
    // The queue precedes the board on narrow screens; the card field stays near the top on desktop.
    const firstCardBox = await region.locator('[data-cell-id="card-0"]').boundingBox()
    expect(firstCardBox!.y).toBeLessThan(width < 1200 ? 600 : 270)
    const statusBox = await page
      .getByTestId('game-board-context')
      .locator(':scope > section')
      .boundingBox()
    expect(statusBox!.height).toBeGreaterThan(120)
    if (width >= 1200) {
      expect((await page.getByRole('banner').boundingBox())!.height).toBe(58)
      expect(statusBox!.width).toBeLessThanOrEqual(541)
    }
    const rightCardBox = await region
      .locator(`[data-cell-id="${width < 600 ? 'card-5' : 'card-4'}"]`)
      .boundingBox()
    const cardsCenter = (firstCardBox!.x + rightCardBox!.x + rightCardBox!.width) / 2
    if (width < 1200)
      expect(Math.abs(statusBox!.x + statusBox!.width / 2 - cardsCenter)).toBeLessThan(1)
    else expect(statusBox!.x + statusBox!.width).toBeLessThan(firstCardBox!.x)
    if (width === 1440) expect(Math.abs(cardsCenter - width / 2)).toBeLessThan(1)
    await expect(page.getByTestId('game-board-teams')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Открыть очередь команд' })).toHaveCount(0)
    const managementBox = await page
      .getByRole('button', { name: 'Управление игрой', exact: true })
      .boundingBox()
    if (width >= 900) {
      expect(managementBox!.x + managementBox!.width).toBe(width)
      expect(managementBox!.width).toBe(36)
      expect(managementBox!.height).toBe(128)
      expect(managementBox!.y + managementBox!.height / 2).toBeCloseTo(height / 2, 0)
      if (width >= 1200) {
        const lastCard = await region.locator('[data-cell-id="card-4"]').boundingBox()
        expect(managementBox!.x).toBeGreaterThan(lastCard!.x + lastCard!.width)
      }
    } else {
      expect(managementBox!.height).toBe(36)
      expect(managementBox!.x + managementBox!.width).toBeLessThanOrEqual(width)
      expect(managementBox!.y + managementBox!.height).toBeLessThanOrEqual(height)
    }
    if (width < 600) {
      await expect(page.getByRole('tab', { name: 'Охота', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      await expect(region.locator('[data-cell-id]')).toHaveCount(5)
      await page.getByRole('tab', { name: 'Оружие', exact: true }).click()
      await expect(page.getByRole('tabpanel')).toHaveAccessibleName('Оружие')
      await page.getByRole('tab', { name: 'Охота', exact: true }).focus()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('tab', { name: 'Оружие', exact: true })).toBeFocused()
      await expect(page.getByTestId('board-selected-category')).toHaveText('Оружие')
      await expect(page.getByRole('tooltip')).toHaveCount(0)
      await page.getByRole('tab', { name: 'Охота', exact: true }).click()
    } else {
      await expect(region.locator('[data-cell-id]')).toHaveCount(25)
      await expect(page.getByRole('columnheader')).toHaveCount(5)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const cells = await region.locator('[data-cell-id]').evaluateAll((elements) =>
      elements.map((el) => ({
        client: el.clientHeight,
        scroll: el.scrollHeight,
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
        bottom: el.getBoundingClientRect().bottom,
      })),
    )
    for (const cell of cells) {
      expect(cell.width).toBeGreaterThanOrEqual(width < 600 ? 111 : 79)
      expect(Math.abs(cell.height - cell.width * 1.5)).toBeLessThan(1)
      expect(cell.scroll).toBeLessThanOrEqual(cell.client + 1)
      if (width >= 1200) expect(cell.bottom).toBeLessThanOrEqual(height)
    }
    if (width === 1920 || width === 2560) {
      const valueSize = await region
        .locator('[data-cell-id="card-2"] [data-card-value]')
        .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
      if (width === 1920) expect(valueSize).toBeLessThanOrEqual(20)
      else expect(valueSize).toBeGreaterThanOrEqual(24)
      const statusSize = await page
        .getByTestId('game-board-status-title')
        .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
      expect(statusSize).toBe(20)
    }
    if (width >= 1200) {
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
      ).toBe(true)
    }
    await page.screenshot({ path: `../.tmp/game-board-design/board-${width}.png`, fullPage: true })
    await page
      .getByRole('button', { name: 'Открыть карточку Следы на болотах', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    const unopened = region.locator('[data-cell-id="card-5"]')
    await unopened.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Отмена' }).click()
    await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
    await expect(page.getByTestId('game-management-tool')).toBeVisible()
    const management = page.getByTestId('game-management-tool')
    await expect(management.getByText('Фаза раунда', { exact: true })).toHaveCount(0)
    await expect(management.getByRole('heading', { name: 'Раунд' })).toBeVisible()
    await expect(management.getByRole('heading', { name: 'Активная команда' })).toBeVisible()
    for (const section of ['round', 'team', 'manual-quiz', 'finish-game']) {
      const block = management.getByTestId(`management-${section}-section`)
      await expect(block).toBeVisible()
      if (section === 'manual-quiz' || section === 'finish-game') {
        const trigger = block.getByRole('button').first()
        await expect(trigger).toHaveAttribute('aria-expanded', /true|false/)
        await expect(trigger).toHaveAttribute('aria-controls', /.+/)
      } else {
        expect(
          await block.evaluate((element) => parseFloat(getComputedStyle(element).borderTopWidth)),
        ).toBeGreaterThanOrEqual(1)
      }
    }
    const assistantBounds = await management.getByTestId('management-round-section').boundingBox()
    const teamBounds = await management.getByTestId('management-team-section').boundingBox()
    expect(teamBounds!.y - assistantBounds!.y - assistantBounds!.height).toBeGreaterThanOrEqual(8)
    expect(teamBounds!.y - assistantBounds!.y - assistantBounds!.height).toBeLessThanOrEqual(12)
    for (const label of ['Снять выбор', 'Отыграла']) {
      const action = management.getByRole('button', { name: label, exact: true })
      await expect(action).toHaveClass(/MuiButton-outlinedPrimary/)
      if (label === 'Отыграла') await expect(action).toBeDisabled()
      else await expect(action).toBeEnabled()
    }
    await expect(page.getByRole('tab', { name: 'Управление игрой' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Управление модификаторами' })).toBeVisible()
    await expect
      .poll(async () => {
        const box = await page.getByRole('dialog').boundingBox()
        return Math.round(box!.x + box!.width)
      })
      .toBe(width)
    await page.screenshot({
      path: `../.tmp/game-board-design/management-${width}.png`,
      animations: 'disabled',
    })
    expect(
      await page
        .getByTestId('admin-tool-drawer-scroll-body')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
    await page.getByTestId('admin-tool-drawer-scroll-body').evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    await expect(
      page.getByRole('button', { name: 'Закрыть инструменты управления' }),
    ).toBeInViewport()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Управление игрой', exact: true })).toBeFocused()
    expect(writes).toEqual([])
    if (width === 1440) {
      await page.setViewportSize({ width, height: 700 })
      await expect
        .poll(async () =>
          region
            .locator('[data-cell-id]')
            .evaluateAll((elements) =>
              elements.every((element) => element.getBoundingClientRect().width >= 79),
            ),
        )
        .toBe(true)
      await region.locator('[data-cell-id]').last().scrollIntoViewIfNeeded()
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
      await expect(region.locator('[data-cell-id]').last()).toBeInViewport()
    }
  })
}

test('long team queue uses its own page and leaves the board clear', async ({ page }) => {
  await mockGame(page, 'active', 'admin', 'Ночные странники', undefined, 16)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/panel/game-team-queue')
  const queue = page.getByTestId('team-queue-panel')
  await expect(queue).toBeVisible()
  await expect(queue.getByRole('article')).toHaveCount(16)
  await expect(page.getByTestId('game-board-surface')).toHaveCount(0)
  await queue.getByRole('article', { name: 'Команда 16' }).scrollIntoViewIfNeeded()
  const scroll = queue.getByRole('group', { name: 'Не отыграли', exact: true })
  expect(await scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
  await expect(queue.getByRole('heading', { name: 'Не отыграли', exact: true })).toBeInViewport()
})

for (const width of [390, 768, 1440]) {
  test(`team queue page keeps search and play order readable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await mockGame(page, 'active', 'viewer')
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/panel/game-team-queue')
    const queue = page.getByTestId('team-queue-panel')
    await expect(queue.getByRole('article', { name: 'Ночные странники' })).toBeVisible()
    await expect(queue.getByRole('article', { name: 'Последний рубеж' })).toBeVisible()
    await expect(queue.getByText(/Отыгрыш #/)).toHaveCount(0)
    await expect(queue.getByLabel('Всего команд: 2')).toHaveCount(0)
    await queue.screenshot({ path: testInfo.outputPath(`team-queue-${width}.png`) })
    const search = queue.getByRole('textbox', { name: 'Поиск по названию команды или участнику' })
    await search.fill('ворон')
    await expect(queue.getByRole('article', { name: 'Ночные странники' })).toBeVisible()
    await expect(queue.getByRole('article', { name: 'Последний рубеж' })).toHaveCount(0)
    await search.fill('несуществующая команда')
    await expect(queue.getByRole('status')).toContainText('Команды не найдены')
    await queue.getByRole('button', { name: 'Очистить поиск команд' }).click()
    await expect(search).toBeFocused()
    await expect(queue.getByRole('article', { name: 'Последний рубеж' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

for (const width of [320, 390, 768, 1440]) {
  test(
    'queue highlights membership and shows authoritative results at ' + width + 'px',
    async ({ page }, info) => {
      const score = width === 390 ? 0 : width === 768 ? -25 : null
      const writes = await mockGame(
        page,
        'active',
        'viewer',
        'Ночные странники',
        undefined,
        2,
        score,
        true,
      )
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/panel/game-team-queue')
      const panel = page.getByTestId('team-queue-panel')
      const active = panel.getByRole('article', { name: 'Ночные странники' })
      const personal = panel.getByRole('article', { name: 'Последний рубеж' })
      await expect(active.getByText('Играет', { exact: true })).toBeVisible()
      await expect(personal.getByText('Ваша команда', { exact: true })).toBeVisible()
      await expect(
        personal.getByLabel(
          score === null ? 'Нет завершённого раунда' : 'Итоговый результат: ' + score + ' очков',
        ),
      ).toBeVisible()
      expect(await active.evaluate((el) => getComputedStyle(el).borderImageSource)).toBe('none')
      expect(
        await active.evaluate((el) => getComputedStyle(el, '::after').backgroundImage),
      ).toContain('linear-gradient')
      expect(await active.evaluate((el) => getComputedStyle(el).borderStyle)).toBe('solid')
      const slot = active.getByLabel('Место в очереди 1')
      const slotBounds = await slot.boundingBox()
      const activeName = (await active
        .getByText('Ночные странники', { exact: true })
        .boundingBox())!
      const activeBounds = (await active.boundingBox())!
      expect(Math.abs(slotBounds!.y - activeName.y)).toBeLessThan(2)
      expect(slotBounds!.x - activeBounds.x).toBeLessThan(14)
      expect(slotBounds!.y - activeBounds.y).toBeLessThan(14)
      const playing = (await active.getByText('Играет', { exact: true }).boundingBox())!
      expect(Math.abs(playing.y - activeName.y)).toBeLessThan(2)
      expect(playing.x).toBeGreaterThan(activeName.x + activeName.width)
      const personalBounds = (await personal.boundingBox())!
      expect(activeName.x + activeName.width / 2).toBeCloseTo(
        activeBounds.x + activeBounds.width / 2,
        0,
      )
      const ownBadge = (await personal.getByText('Ваша команда', { exact: true }).boundingBox())!
      expect(personalBounds.x + personalBounds.width - ownBadge.x - ownBadge.width).toBeLessThan(14)
      expect(ownBadge.y).toBeLessThan(
        (await personal.getByRole('listitem').first().boundingBox())!.y,
      )
      await expect(
        active.getByRole('listitem').first().locator('[aria-hidden="true"]'),
      ).toHaveCount(1)
      const scoreBounds = await personal
        .getByLabel(
          score === null ? 'Нет завершённого раунда' : 'Итоговый результат: ' + score + ' очков',
        )
        .boundingBox()
      const nameBounds = await personal.getByText('Последний рубеж', { exact: true }).boundingBox()
      expect(nameBounds!.x + nameBounds!.width / 2).toBeCloseTo(
        personalBounds.x + personalBounds.width / 2,
        0,
      )
      expect(scoreBounds!.x).toBeGreaterThanOrEqual(nameBounds!.x + nameBounds!.width)
      expect(Math.abs(scoreBounds!.y - nameBounds!.y)).toBeLessThan(2)
      expect(await personal.evaluate((el) => getComputedStyle(el).borderImageSource)).toBe('none')
      expect(
        await personal.evaluate((el) => getComputedStyle(el, '::after').backgroundImage),
      ).toContain('linear-gradient')
      expect(await personal.evaluate((el) => getComputedStyle(el).borderColor)).toBe(
        await active.evaluate((el) => getComputedStyle(el).borderColor),
      )
      expect(await personal.evaluate((el) => getComputedStyle(el).backgroundImage)).not.toBe(
        await active.evaluate((el) => getComputedStyle(el).backgroundImage),
      )
      const sections = await panel.getByRole('region').evaluateAll((elements) =>
        elements.map((el) => {
          const bounds = el.getBoundingClientRect()
          return { width: bounds.width, top: bounds.top, bottom: bounds.bottom }
        }),
      )
      if (width >= 600) {
        expect(sections[0]!.width).toBeCloseTo(sections[1]!.width, 0)
        expect(sections[0]!.top).toBe(sections[1]!.top)
        expect(sections[0]!.bottom).toBeCloseTo(876, 0)
        expect(sections[1]!.bottom).toBeCloseTo(876, 0)
      }
      const input = panel.getByRole('textbox', { name: 'Поиск по названию команды или участнику' })
      await input.fill('стрелок')
      const clear = panel.getByRole('button', { name: 'Очистить поиск команд' })
      expect((await clear.boundingBox())!.width).toBeGreaterThanOrEqual(44)
      await expect(clear.locator('svg')).toHaveCount(1)
      await clear.click()
      await expect(input).toBeFocused()
      expect(writes).toEqual([])
      await page.mouse.move(0, 0)
      await panel.screenshot({ path: info.outputPath('queue-membership.png') })
    },
  )
}

for (const width of [390, 1440]) {
  test(
    'personal active team retains its surface with a continuous frame at ' + width + 'px',
    async ({ page }, info) => {
      const writes = await mockGame(
        page,
        'active',
        'viewer',
        'Ночные странники',
        undefined,
        2,
        75,
        'active',
      )
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/panel/game-team-queue')
      const panel = page.getByTestId('team-queue-panel')
      const active = panel.getByRole('article', { name: 'Ночные странники' })
      await expect(active.getByText('Играет', { exact: true })).toBeVisible()
      await expect(active.getByText('Ваша команда', { exact: true })).toBeVisible()
      expect(await active.evaluate((el) => getComputedStyle(el).borderImageSource)).toBe('none')
      expect(
        await active.evaluate((el) => getComputedStyle(el, '::after').backgroundImage),
      ).toContain('linear-gradient')
      const foreign = panel.getByRole('article', { name: 'Последний рубеж' })
      expect(await active.evaluate((el) => getComputedStyle(el).backgroundImage)).not.toBe(
        await foreign.evaluate((el) => getComputedStyle(el).backgroundImage),
      )
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
      ).toBe(true)
      await panel.screenshot({ path: info.outputPath('own-active-frame.png') })
      expect(writes).toEqual([])
    },
  )
}

for (const width of [320, 1440]) {
  test(`long team names fit the queue at ${width}px`, async ({ page }) => {
    const teamName = 'Ночные странники с очень длинным названием команды и дальним маршрутом'
    await mockGame(page, 'active', 'viewer', teamName)
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/panel/game-team-queue')
    const queue = page.getByTestId('team-queue-panel')
    const team = queue.getByRole('article', { name: teamName })
    await expect(team).toBeVisible()
    expect(await team.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: `../.tmp/game-board-design/queue-long-name-${width}.png`,
      animations: 'disabled',
    })
  })
}

for (const role of ['admin', 'viewer'] as const) {
  for (const [width, height] of [
    [390, 900],
    [768, 900],
    [1440, 900],
    [1440, 480],
    [390, 568],
  ]) {
    test(
      'queue confines scrolling to lists for ' + role + ' at ' + width + 'x' + height,
      async ({ page }, info) => {
        const writes = await mockGame(page, 'active', role, 'Ночные странники', undefined, 16)
        await page.setViewportSize({ width: width!, height: height! })
        await page.goto('/panel/game-team-queue')
        const panel = page.getByTestId('team-queue-panel')
        await expect(panel.getByRole('article')).toHaveCount(16)
        const centeredTitles = await panel.getByRole('article').evaluateAll((elements) =>
          elements.every((article) => {
            const card = article.getBoundingClientRect()
            const name = article.querySelector('p')!.getBoundingClientRect()
            return Math.abs(card.left + card.width / 2 - (name.left + name.width / 2)) < 0.5
          }),
        )
        expect(centeredTitles).toBe(true)
        const list = panel.getByRole('group', { name: 'Не отыграли', exact: true })
        expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
        const first = list.getByRole('article').first()
        expect(await first.evaluate((el) => getComputedStyle(el).width)).not.toBe('auto')
        const cardBounds = (await first.boundingBox())!
        const listWidth = await list.evaluate((el) => el.clientWidth)
        expect(cardBounds.width).toBeCloseTo(listWidth, 0)
        expect(
          await first
            .getByText('Ночные странники', { exact: true })
            .evaluate((el) => getComputedStyle(el).textAlign),
        ).toBe('center')
        const participant = first.getByRole('listitem').first()
        expect(await participant.evaluate((el) => getComputedStyle(el).justifyContent)).toBe(
          'center',
        )
        await expect(first.locator('hr')).toHaveCount(1)
        await list.focus()
        await page.keyboard.press('End')
        await list.getByRole('article', { name: 'Команда 16' }).scrollIntoViewIfNeeded()
        expect(await list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
        await expect(
          panel.getByRole('heading', { name: 'Не отыграли', exact: true }),
        ).toBeInViewport()
        await expect(
          panel.getByRole('heading', { name: 'Отыгравшие', exact: true }),
        ).toBeInViewport()
        expect(
          await page.evaluate(() => ({
            vertical: document.documentElement.scrollHeight <= innerHeight + 1,
            horizontal: document.documentElement.scrollWidth <= innerWidth,
            scroll: window.scrollY,
          })),
        ).toEqual({ vertical: true, horizontal: true, scroll: 0 })
        await list.evaluate((el) => {
          el.scrollTop = 0
        })
        await page.mouse.move(0, 0)
        await page.screenshot({ path: info.outputPath('queue-bounded.png') })
        expect(writes).toEqual([])
      },
    )
  }
}

test('team queue is a separate navigation page before the leaderboard', async ({ page }) => {
  await mockGame(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/panel/game-board')
  await expect(page.getByTestId('team-queue-panel')).toHaveCount(0)
  const navigation = page.getByRole('navigation', { name: 'Основная навигация' })
  const queueLink = navigation.getByRole('link', { name: 'Очередь команд' })
  const leaderboardLink = navigation.getByRole('link', { name: 'Лидерборд' })
  expect(
    await queueLink.evaluate(
      (element, next) =>
        Boolean(element.compareDocumentPosition(next as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
      await leaderboardLink.elementHandle(),
    ),
  ).toBe(true)
  await queueLink.click()
  await expect(page).toHaveURL(/\/panel\/game-team-queue$/)
  await expect(page.getByRole('heading', { name: 'Очередь команд' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByTestId('team-queue-panel')).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
})

for (const status of ['ready', 'finished'] as const) {
  for (const width of [320, 390, 1440]) {
    test(`shows ${status} state and highlighted player actions at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await mockGame(page, status, 'viewer')
      await page.goto('/panel/game-board')
      await expect(page.getByRole('heading', { name: 'Последняя охота' })).toBeVisible()
      const actionLabel = status === 'ready' ? 'Подать заявку' : 'Открыть результаты'
      const action = page.getByTestId('game-board-context').getByRole('link', { name: actionLabel })
      await expect(action).toBeVisible()
      await expect(action).toHaveClass(/MuiButton-containedPrimary/)
      await expect(action).toHaveAttribute(
        'href',
        status === 'ready' ? '/panel/game-application' : '/panel/game-history?gameId=board-layout',
      )
      expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      expect(
        await action.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
      ).toBe(true)
      await action.focus()
      await expect(action).toBeFocused()
      await page.screenshot({ path: `../.tmp/game-board-design/${status}-${width}.png` })
      await expect(page.getByRole('button', { name: 'Управление игрой' })).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    })
  }
}

for (const width of [320, 390, 768, 1440]) {
  test(`management highlights the round action at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    const writes = await mockGame(page)
    await page.route('**/api/game/rounds/active', (route) =>
      route.fulfill({
        json: {
          ...activeRoundFixture,
          cellId: 'card-0',
          teamId: 'team-one',
          teamName: 'Ночные странники',
          teamSlotIndex: 1,
          status: 'awaiting_modifiers',
          baseScore: 100,
          roundVersion: 1,
        },
      }),
    )
    await page.goto('/panel/game-board')
    await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
    const assistant = page.getByTestId('management-round-section')
    const primaryAction = assistant.getByRole('button', {
      name: 'Завершить заказ модификаторов',
      exact: true,
    })
    await expect(primaryAction).toBeVisible()
    await expect(primaryAction).toBeEnabled()
    const stages = assistant.getByRole('button', { name: 'Выбор модификаторов', exact: true })
    const phase = assistant.getByTestId('management-round-phase')
    const currentStep = assistant.locator('[aria-current="step"]')
    const currentFill = await currentStep.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    )
    const neutralFill = await phase.evaluate((element) => getComputedStyle(element).backgroundImage)
    await expect(stages).toHaveAttribute('aria-expanded', 'false')
    await expect(phase.getByRole('listitem')).toHaveCount(3)
    await expect(phase.getByRole('listitem').nth(0)).toContainText('Карточка открыта')
    await expect(phase.getByRole('listitem').nth(2)).toContainText('Подготовка к игре')
    await stages.focus()
    await page.keyboard.press('Enter')
    await expect(stages).toHaveAttribute('aria-expanded', 'true')
    await expect(assistant.getByRole('listitem')).toHaveCount(7)
    await expect(assistant.locator('[aria-current="step"]')).toContainText('Выбор модификаторов')
    await expect(assistant.locator('[data-state="complete"]')).toHaveCount(3)
    expect(await currentStep.evaluate((element) => getComputedStyle(element).backgroundImage)).toBe(
      currentFill,
    )
    expect(await phase.evaluate((element) => getComputedStyle(element).backgroundImage)).toBe(
      neutralFill,
    )
    const list = assistant.getByRole('list')
    const listGeometry = await list.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const borderLeft = parseFloat(getComputedStyle(element).borderLeftWidth)
      const borderRight = parseFloat(getComputedStyle(element).borderRightWidth)
      return {
        width: bounds.width - borderLeft - borderRight,
        rows: Array.from(element.querySelectorAll('[role="listitem"]'), (row) => {
          const rowBounds = row.getBoundingClientRect()
          return { offset: rowBounds.x - bounds.x - borderLeft, width: rowBounds.width }
        }),
      }
    })
    expect(listGeometry.width).toBeCloseTo(
      await phase.evaluate((element) => element.clientWidth),
      0,
    )
    for (const row of listGeometry.rows) {
      expect(row.offset).toBeCloseTo(0, 0)
      expect(row.width).toBeCloseTo(listGeometry.width, 0)
    }
    await assistant.screenshot({
      path: `../.tmp/game-board-design/round-stages-${width}.png`,
      animations: 'disabled',
    })
    await expect(
      assistant.getByRole('listitem').filter({ hasText: 'Подготовка к игре' }),
    ).toBeVisible()
    await stages.click()
    await expect(phase.getByRole('listitem')).toHaveCount(3)
    expect(await phase.evaluate((element) => getComputedStyle(element).backgroundImage)).toBe(
      neutralFill,
    )
    await expect(page.getByTestId('management-team-section')).toContainText('Ворон')
    for (const label of ['Снять выбор', 'Отыграла']) {
      const action = page
        .getByTestId('management-team-section')
        .getByRole('button', { name: label, exact: true })
      await expect(action).toHaveClass(/MuiButton-outlinedPrimary/)
      await expect(action).toBeDisabled()
    }
    expect(
      await page
        .getByTestId('admin-tool-drawer-scroll-body')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
    await page.screenshot({
      path: `../.tmp/game-board-design/management-round-${width}.png`,
      animations: 'disabled',
    })
    expect(writes).toEqual([])
  })
}

test('admin starts modifier ordering from the current-round management petal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockGame(page)
  let status = 'card_opened'
  let roundVersion = 1
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status, roundVersion } }),
  )
  await page.route('**/api/game/rounds/round-one/start-modifier-ordering', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ expectedRoundVersion: 1 })
    status = 'awaiting_modifiers'
    roundVersion = 2
    await route.fulfill({ json: { ...activeRoundFixture, status, roundVersion } })
  })

  await page.goto('/panel/game-board')
  await expect(page.getByTestId('game-board-context')).toContainText('Карточка открыта')
  await page.goto('/panel/game-round')
  await expect(page.getByTestId('current-round-overview')).toContainText('Карточка открыта')
  await expect(page.getByRole('button', { name: 'Начать выбор модификаторов' })).toHaveCount(0)
  const managementPetal = page.getByRole('button', { name: 'Управление игрой', exact: true })
  await expect(managementPetal).toBeVisible()
  await page.screenshot({
    path: '../.tmp/game-board-design/card-opened-round-390.png',
    animations: 'disabled',
  })
  await managementPetal.click()
  await page
    .getByTestId('management-round-section')
    .getByRole('button', { name: 'Начать выбор модификаторов' })
    .click()
  await expect(page.getByTestId('current-round-overview')).toContainText('Выбор модификаторов')
  await expect(page.getByRole('dialog', { name: 'Модификаторы' })).toBeVisible()
})

test('admin starts gameplay after preparation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockGame(page)
  let status = 'preparing'
  let roundVersion = 1
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({
      json: {
        ...activeRoundFixture,
        status,
        roundVersion,
        preparedAtUtc: '2026-09-01T12:00:00Z',
        gameplayStartedAtUtc: status === 'in_progress' ? '2026-09-01T12:01:00Z' : null,
      },
    }),
  )
  await page.route('**/api/game/rounds/round-one/begin-gameplay', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ expectedRoundVersion: 1 })
    status = 'in_progress'
    roundVersion = 2
    await route.fulfill({ json: { ...activeRoundFixture, status, roundVersion } })
  })

  await page.goto('/panel/game-board')
  await expect(page.getByTestId('game-board-context')).toContainText('Подготовка к игре')
  await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
  const roundSection = page.getByTestId('management-round-section')
  await expect(roundSection.getByRole('button', { name: 'Начать игру', exact: true })).toBeVisible()
  await expect(roundSection.getByRole('button', { name: 'Завершить подготовку' })).toHaveCount(0)
  await page.screenshot({
    path: '../.tmp/game-board-design/management-preparing-390.png',
    animations: 'disabled',
  })
  await roundSection.getByRole('button', { name: 'Подготовка к игре', exact: true }).click()
  await expect(roundSection.locator('[aria-current="step"]')).toContainText('Подготовка к игре')
  await roundSection.screenshot({
    path: '../.tmp/game-board-design/round-stages-preparing-390.png',
    animations: 'disabled',
  })
  await roundSection.getByRole('button', { name: 'Начать игру', exact: true }).click()
  await expect(roundSection).toContainText('Проведение игры')
  await expect(roundSection.locator('[aria-current="step"]')).toContainText('Проведение игры')
  await expect(roundSection.getByRole('button', { name: 'Завершить игру' })).toBeVisible()
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`round context reveals both sides with motion preference ${reducedMotion}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion })
    await mockGame(page)
    await page.route('**/api/game/rounds/active', (route) =>
      route.fulfill({ json: { ...activeRoundFixture, status: 'preparing' } }),
    )
    await page.goto('/panel/game-board')
    await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
    const phase = page.getByTestId('management-round-phase')
    const trigger = phase.getByRole('button', { name: 'Подготовка к игре', exact: true })
    await expect(phase.getByRole('listitem')).toHaveCount(3)
    const samples = await trigger.evaluate(async (button) => {
      const ids = button.getAttribute('aria-controls')!.split(' ')
      ;(button as HTMLButtonElement).click()
      const heights: number[][] = []
      for (let frame = 0; frame < 14; frame += 1) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        heights.push(ids.map((id) => document.getElementById(id)!.getBoundingClientRect().height))
      }
      return heights
    })
    await expect(phase.getByRole('listitem')).toHaveCount(7)
    for (const side of [0, 1]) {
      const heights = samples.map((sample) => sample[side]!)
      if (reducedMotion === 'reduce')
        expect(Math.max(...heights)).toBeCloseTo(Math.min(...heights), 0)
      else expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(5)
    }
    await trigger.focus()
    await page.keyboard.press('Space')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(phase.getByRole('listitem')).toHaveCount(3)
    await expect(trigger).toBeFocused()
  })
}

test('current-round management is an edge petal on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockGame(page)
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'card_opened' } }),
  )

  await page.goto('/panel/game-round')
  const petal = page.getByRole('button', { name: 'Управление игрой', exact: true })
  await expect(petal).toBeVisible()
  const bounds = await petal.boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.x + bounds!.width).toBeCloseTo(1440, 0)
  expect(bounds!.height).toBeGreaterThan(bounds!.width)
  await page.screenshot({
    path: '../.tmp/game-board-design/card-opened-round-1440.png',
    animations: 'disabled',
  })
})

test('players see the opened-card phase without staff controls', async ({ page }) => {
  await mockGame(page, 'active', 'viewer')
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'card_opened' } }),
  )

  await page.goto('/panel/game-round')
  await expect(page.getByTestId('current-round-overview')).toContainText('Карточка открыта')
  await expect(page.getByRole('button', { name: 'Начать выбор модификаторов' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Управление игрой' })).toHaveCount(0)
})

test('moderator does not see current-round management', async ({ page }) => {
  await mockGame(page, 'active', 'moderator')
  await page.route('**/api/game/rounds/active', (route) =>
    route.fulfill({ json: { ...activeRoundFixture, status: 'card_opened' } }),
  )

  await page.goto('/panel/game-round')
  await expect(page.getByTestId('current-round-overview')).toContainText('Карточка открыта')
  await expect(page.getByRole('button', { name: 'Управление игрой' })).toHaveCount(0)
})

for (const width of [320, 390, 1440]) {
  test(`live round actions stay visible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 })
    const teamName =
      width === 320 ? 'ОченьДлинноеНазваниеКомандыБезПробеловДляПроверки' : 'Ночные странники'
    await mockGame(page, 'active', 'viewer', teamName)
    await page.route('**/api/game', (route) =>
      route.fulfill({
        json: {
          ...board,
          colLabels:
            width < 600
              ? ['Охота', 'Оружие', 'Легенды', 'Только куст и корточки', 'Контракты']
              : board.colLabels,
          cells: board.cells.map((cell, index) =>
            index === 0 ? { ...cell, media: [{ url: '/media/cards/current-round.svg' }] } : cell,
          ),
        },
      }),
    )
    await page.route('**/media/cards/current-round.svg', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="120"><rect width="80" height="120" fill="gold"/></svg>',
      }),
    )
    let roundStatus = 'awaiting_modifiers'
    await page.route('**/api/game/rounds/active', (route) =>
      route.fulfill({
        json: {
          ...activeRoundFixture,
          cellId: 'card-0',
          teamId: 'team-one',
          teamName: 'Ночные странники',
          teamSlotIndex: 1,
          status: roundStatus,
          baseScore: 100,
          version: 1,
        },
      }),
    )
    await page.goto('/panel/game-board')
    const currentCard = page.locator('[data-cell-id="card-0"]')
    await expect(currentCard).toHaveText('Текущий раунд')
    await expect(currentCard.locator('img')).toBeVisible()
    expect(
      await currentCard.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth),
    ).toBe(80)
    if (width < 600) {
      const verticalPosition = () =>
        page.evaluate(() => {
          const panel = document.querySelector('[data-testid="game-board-context"]')
          const boardField = document.querySelector('[data-board-field]')
          if (!panel || !boardField) throw new Error('Board layout is missing')
          return {
            panel: Math.round(panel.getBoundingClientRect().top + window.scrollY),
            field: Math.round(boardField.getBoundingClientRect().top + window.scrollY),
          }
        })
      const beforeSwitch = await verticalPosition()
      await page.getByRole('tab', { name: 'Оружие', exact: true }).click()
      expect(await verticalPosition()).toEqual(beforeSwitch)
      await page.getByRole('tab', { name: 'Только куст и корточки', exact: true }).click()
      expect(await verticalPosition()).toEqual(beforeSwitch)
      await page.getByRole('button', { name: 'Текущий раунд', exact: true }).click()
      expect(await verticalPosition()).toEqual(beforeSwitch)
    }
    await expect(page.locator('[data-cell-id="card-0"]')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Открыть текущий раунд' })).toBeVisible()
    const modifierAction = page.getByTestId('game-board-context').getByRole('link', {
      name: 'Открыть текущий раунд',
    })
    await expect(modifierAction).toHaveClass(/MuiButton-containedPrimary/)
    const context = page.getByTestId('game-board-context')
    await expect(context).toContainText(teamName)
    await expect(context.getByTestId('game-board-phase')).toHaveText('Выбор модификаторов')
    const statusBox = await context.locator(':scope > section').boundingBox()
    const actionBox = (await modifierAction.boundingBox())!
    expect(actionBox.height).toBeGreaterThanOrEqual(44)
    expect(actionBox.x).toBeGreaterThan(statusBox!.x)
    expect(actionBox.x + actionBox.width).toBeLessThan(statusBox!.x + statusBox!.width)
    expect(await context.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await expect(page.getByRole('button', { name: 'Меню игры' })).toHaveCount(0)
    if (width >= 1024) {
      expect(
        await page
          .locator('[data-cell-id]')
          .evaluateAll((elements) =>
            elements.every((element) => element.getBoundingClientRect().bottom <= innerHeight),
          ),
      ).toBe(true)
    } else {
      const lastCard = page.locator('[data-cell-id="card-20"]')
      await lastCard.scrollIntoViewIfNeeded()
      await expect(lastCard).toBeInViewport()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: `../.tmp/game-board-design/live-round-${width}.png`,
      fullPage: true,
    })
    // A phase change keeps the round action and board geometry stable.
    await page.evaluate(() => window.scrollTo(0, 0))
    const teamBoxBefore = await page
      .getByTestId('game-board-context')
      .getByTestId('game-board-status-title')
      .boundingBox()
    const cardBoxBefore = await page.locator('[data-cell-id="card-0"]').boundingBox()
    roundStatus = 'in_progress'
    await page.reload()
    await expect(page.getByTestId('game-board-context')).toContainText('Проведение игры')
    await expect(page.getByRole('link', { name: 'Открыть текущий раунд' })).toBeVisible()
    await expect(page.getByTestId('game-board-phase')).toHaveText('Проведение игры')
    const teamBoxAfter = await page
      .getByTestId('game-board-context')
      .getByTestId('game-board-status-title')
      .boundingBox()
    const cardBoxAfter = await page.locator('[data-cell-id="card-0"]').boundingBox()
    expect(
      await page.getByTestId('game-board-context').locator(':scope > section').boundingBox(),
    ).toEqual(statusBox)
    expect(teamBoxAfter).toEqual(teamBoxBefore)
    expect(cardBoxAfter).toEqual(cardBoxBefore)
  })
}

test('side panels honour reduced motion and expose modal semantics', async ({ page }) => {
  await mockGame(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 640 })
  await page.goto('/panel/game-board')
  const opener = page.getByRole('button', { name: 'Управление игрой', exact: true })
  await opener.click()
  const panel = page.getByRole('dialog', { name: 'Инструменты управления игрой' })
  await expect(panel).toBeVisible()
  await expect(panel).toHaveAttribute('aria-modal', 'true')
  await expect(panel).toHaveCSS('transition-duration', '0s')
  await page.keyboard.press('Escape')
  await expect(opener).toBeFocused()
  await expect(opener).toHaveCSS('transition-duration', '0s')
})

for (const viewport of [
  { width: 844, height: 390 },
  { width: 390, height: 500 },
]) {
  test(`short viewport preserves readable cards and native keyboard actions at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    const writes = await mockGame(page)
    await page.goto('/panel/game-board')
    const cards = page.locator('[data-cell-id]')
    await expect(cards.first()).toBeVisible()
    const sizes = await cards.evaluateAll((elements) =>
      elements.map((element) => ({
        width: element.getBoundingClientRect().width,
        scroll: element.scrollHeight,
        client: element.clientHeight,
        tag: element.tagName,
      })),
    )
    for (const card of sizes) {
      expect(card.width).toBeGreaterThanOrEqual(viewport.width < 600 ? 111 : 79)
      expect(card.scroll).toBeLessThanOrEqual(card.client + 1)
      expect(card.tag).toBe('BUTTON')
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const last = cards.last()
    await last.scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await expect(last).toBeInViewport()
    await page.locator('[data-cell-id="card-0"]').focus()
    await page.keyboard.press('Space')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-cell-id="card-0"]')).toBeFocused()
    expect(writes).toEqual([])
  })
}

test('a twelve-column board uses categories when its container cannot keep cards readable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 })
  let sendEvent: ((message: string) => void) | undefined
  await mockGame(page, 'active', 'admin', 'Ночные странники', (send) => {
    sendEvent = send
  })
  const largeBoard = {
    ...board,
    cols: 12,
    colLabels: Array.from({ length: 12 }, (_, index) => `Категория ${index + 1}`),
    cells: Array.from({ length: 60 }, (_, index) => ({
      ...board.cells[index % 25]!,
      id: `large-${index}`,
      row: Math.floor(index / 12),
      col: index % 12,
    })),
  }
  let currentBoard: GameBoardSnapshot = largeBoard
  await page.route('**/api/game', (route) => route.fulfill({ json: currentBoard }))
  await page.goto('/panel/game-board')
  const categories = page.getByRole('tablist', { name: 'Категории поля' })
  await expect(categories).toBeVisible()
  await expect(page.locator('[data-cell-id]')).toHaveCount(5)
  await page.getByRole('tab', { name: 'Категория 2', exact: true }).click()
  await expect(page.getByRole('tabpanel')).toHaveAccessibleName('Категория 2')
  const status = await page.getByTestId('game-board-context').boundingBox()
  const first = await page.locator('[data-cell-id="large-1"]').boundingBox()
  const second = await page.locator('[data-cell-id="large-13"]').boundingBox()
  expect(
    Math.abs(status!.x + status!.width / 2 - (first!.x + second!.x + second!.width) / 2),
  ).toBeLessThan(1)
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.locator('[data-cell-id]')).toHaveCount(60)
  expect(
    await page
      .locator('[data-cell-id]')
      .evaluateAll((elements) =>
        elements.every((element) => element.getBoundingClientRect().width >= 79),
      ),
  ).toBe(true)
  await page.setViewportSize({ width: 768, height: 900 })
  await expect(page.getByRole('tabpanel')).toHaveAccessibleName('Категория 2')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect.poll(() => Boolean(sendEvent)).toBe(true)
  for (const nextBoard of [board, largeBoard]) {
    currentBoard = { ...nextBoard, gameId: `resized-${nextBoard.cols}` }
    sendEvent?.(
      JSON.stringify({
        type: 1,
        target: realtimeHubs.gameBoard.events.gameLifecycleChanged,
        arguments: [
          {
            gameId: currentBoard.gameId,
            status: currentBoard.status,
            boardVersion: currentBoard.version,
            occurredAtUtc: '2026-09-01T12:00:00Z',
          },
        ],
      }) + '\u001e',
    )
    await expect(page.locator('[data-cell-id]')).toHaveCount(nextBoard.cols === 5 ? 25 : 5)
    await expect
      .poll(() =>
        page.evaluate(() => {
          const context = document
            .querySelector('[data-testid="game-board-context"]')!
            .getBoundingClientRect()
          const first = document.querySelector('[data-cell-id]')!.getBoundingClientRect()
          const row = [...document.querySelectorAll('[data-cell-id]')]
            .map((el) => el.getBoundingClientRect())
            .filter((rect) => Math.abs(rect.top - first.top) < 1)
          const right = Math.max(...row.map((rect) => rect.right))
          return Math.abs(context.left - first.left) + Math.abs(context.right - right)
        }),
      )
      .toBeLessThanOrEqual(2)
  }
})

for (const width of [320, 1440]) {
  test(`round result counters preserve a draft across resize at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const writes = await mockGame(page)
    const score = {
      scoreUnit: 100,
      killsScore: 0,
      bountyScore: 0,
      modifierKillDelta: 0,
      modifierKillScore: 0,
      modifierScoreDelta: 0,
      emptyCardPenaltyApplied: false,
      emptyCardPenaltyScore: 0,
      penaltyTotal: 0,
      bonusDelta: 0,
      totalKillCount: 0,
      finalScore: 0,
      calculationLines: [],
    }
    await page.route('**/api/game/rounds/active', (route) =>
      route.fulfill({
        json: {
          roundId: 'round-one',
          gameId: 'board-layout',
          cellId: 'card-0',
          cellTitle: 'Следы на болотах',
          teamId: 'team-one',
          teamName: 'Ночные странники',
          teamSlotIndex: 1,
          status: 'reviewing_results',
          baseScore: 100,
          roundVersion: 1,
          startedAtUtc: '2026-09-01T12:00:00Z',
          gameplayStartedAtUtc: '2026-09-01T12:00:00Z',
          reviewedAtUtc: '2026-09-01T12:02:00Z',
          serverNowUtc: '2026-09-01T12:02:00Z',
          participants: [],
          modifierResults: [],
          killsCount: 0,
          bountyCount: 0,
          emptyCardPenaltyApplied: false,
          scoreDetails: score,
        },
      }),
    )
    await page.route('**/api/game/rounds/round-one/score-preview', (route) =>
      route.fulfill({
        json: {
          scoreDetails: score,
          modifierResults: [],
          roundVersion: 1,
          normalizedInputHash: 'preview-hash',
          calculationTrace: [],
        },
      }),
    )
    await page.goto('/panel/game-board')
    await expect(page.getByTestId('game-board-context')).toContainText('Подведение итогов')
    await page.getByRole('button', { name: 'Управление игрой', exact: true }).click()
    await page.getByRole('button', { name: 'Подвести итоги', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Итоги раунда', exact: true })
    const kills = dialog.getByRole('spinbutton', { name: 'Убитые враги', exact: true })
    const plus = dialog.getByRole('button', { name: 'Увеличить: Убитые враги', exact: true })
    const minus = dialog.getByRole('button', { name: 'Уменьшить: Убитые враги', exact: true })
    await expect(minus).toBeDisabled()
    await plus.focus()
    await page.keyboard.press('Space')
    await expect(kills).toHaveValue('1')
    const buttonBox = await plus.boundingBox()
    expect(buttonBox!.width).toBeGreaterThanOrEqual(44)
    expect(buttonBox!.height).toBeGreaterThanOrEqual(44)
    await kills.fill('7')
    await page.setViewportSize({ width: width === 320 ? 1440 : 320, height: 900 })
    await expect(kills).toHaveValue('7')
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    )
    await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click()
    const confirmation = page.getByRole('dialog', { name: 'Закрыть итоги без сохранения?' })
    await confirmation.getByRole('button', { name: 'Продолжить редактирование' }).click()
    await expect(kills).toHaveValue('7')
    await page.setViewportSize({ width, height: 900 })
    await kills.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: testInfo.outputPath('result-form.png'),
      animations: 'disabled',
    })
    expect(writes).toEqual([])
  })
}

test('card background and preview load through the shared image component', async ({
  page,
}, testInfo) => {
  const writes = await mockGame(page)
  await page.route('**/media/cards/ui-check.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="120"><rect width="80" height="120" fill="gold"/></svg>',
    }),
  )
  await page.route('**/api/game', (route) =>
    route.fulfill({
      json: {
        ...board,
        cells: board.cells.map((cell, index) =>
          index === 0 ? { ...cell, media: [{ url: '/media/cards/ui-check.svg' }] } : cell,
        ),
      },
    }),
  )
  await page.goto('/panel/game-board')
  const card = page.locator('[data-cell-id="card-0"]')
  await expect(card.locator('img')).toBeVisible()
  expect(await card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(
    80,
  )
  await card.click()
  const dialog = page.getByRole('dialog', { name: 'Следы на болотах', exact: true })
  await expect(dialog.getByRole('img', { name: 'Следы на болотах' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('card-preview.png'), animations: 'disabled' })
  expect(writes).toEqual([])
})

for (const width of [390, 768, 1440]) {
  test(`played card preview keeps media, three players and mixed modifier scores readable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const writes = await mockGame(page, 'active', 'viewer')
    const mediaUrl = '/media/cards/played-check.svg'
    await page.route('**/media/cards/played-check.svg', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><rect width="240" height="360" fill="#392d24"/></svg>',
      }),
    )
    await page.route('**/api/game', (route) =>
      route.fulfill({
        json: {
          ...board,
          cells: board.cells.map((cell, index) =>
            index === 0 ? { ...cell, media: [{ url: mediaUrl }] } : cell,
          ),
        },
      }),
    )
    await page.route('**/api/game/history/games/board-layout', (route) =>
      route.fulfill({
        json: {
          mainGame: {
            rounds: [
              {
                roundId: 'played-round',
                cellId: 'card-0',
                cellTitle: 'Следы на болотах',
                cellCost: 100,
                cellMedia: [{ url: mediaUrl }],
                teamName: 'Ночные призраки',
                teamSlotIndex: 1,
                status: 'completed',
                finishedAtUtc: '2026-09-01T12:00:00Z',
                finalScore: 390,
                scoreDetails: {
                  scoreUnit: 100,
                  killsScore: 200,
                  bountyScore: 100,
                  modifierKillDelta: 1,
                  modifierKillScore: 100,
                  modifierScoreDelta: -10,
                  emptyCardPenaltyApplied: false,
                  emptyCardPenaltyScore: 0,
                  penaltyTotal: 0,
                  bonusDelta: 290,
                  totalKillCount: 3,
                  finalScore: 390,
                  calculationLines: [],
                },
                bountyCount: 1,
                modifiers: [
                  {
                    modifierId: 'bonus-1',
                    modifierName: 'Бонус',
                    iconEmoji: '⚔️',
                    modifierDescription: 'Бонус за серию убийств.',
                    scoreDelta: 10,
                    killDelta: 1,
                    outcomeStatus: 'calculated',
                    definitionRevision: 1,
                  },
                  {
                    modifierId: 'bonus-1',
                    modifierName: 'Бонус',
                    scoreDelta: 20,
                    killDelta: 0,
                    outcomeStatus: 'calculated',
                    definitionRevision: 1,
                  },
                  {
                    modifierId: 'deduction',
                    modifierName: 'Списание',
                    scoreDelta: -40,
                    killDelta: 0,
                    outcomeStatus: 'calculated',
                    definitionRevision: 1,
                  },
                ],
                participants: [
                  { userId: 'p1', displayName: 'Александр Неверовский' },
                  { userId: 'p2', displayName: 'Екатерина Савельева' },
                  { userId: 'p3', displayName: 'ИгрокСОченьДлиннымНепрерывнымНикнеймом' },
                ],
              },
            ],
          },
        },
      }),
    )

    await page.goto('/panel/game-board')
    await page.locator('[data-cell-id="card-0"]').click()
    const dialog = page.getByRole('dialog', { name: 'Следы на болотах' })
    const result = dialog.getByTestId('played-card-result-panel')
    await expect(dialog.getByRole('img', { name: 'Следы на болотах' })).toBeVisible()
    await expect(result.getByText('ИгрокСОченьДлиннымНепрерывнымНикнеймом')).toBeVisible()
    await expect(result.getByText('Бонус').locator('..')).toContainText('+130 очк.')
    await expect(result.getByText('Списания').locator('..')).toContainText('-40 очк.')
    await expect(result.getByText('Итог', { exact: true }).locator('..')).toContainText('390 очк.')
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    )
    if (width < 900) {
      const imageBounds = await dialog.getByRole('img', { name: 'Следы на болотах' }).boundingBox()
      const resultBounds = await result.boundingBox()
      expect(imageBounds!.y + imageBounds!.height).toBeLessThan(resultBounds!.y)
    }
    await page.screenshot({
      path: testInfo.outputPath('played-card-preview.png'),
      animations: 'disabled',
    })
    await dialog.getByRole('button', { name: 'Как рассчитан итог' }).click()
    await dialog.getByRole('button', { name: 'Модификаторы' }).click()
    await dialog.getByRole('button', { name: /Бонус ×2/ }).click()
    await expect(dialog.getByText('Бонус за серию убийств.')).toBeVisible()
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    )
    await page.screenshot({
      path: testInfo.outputPath('played-card-preview-expanded.png'),
      animations: 'disabled',
    })
    expect(writes).toEqual([])
  })
}

for (const width of [390, 768, 1440]) {
  test(`played card keeps its result and team readable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 768 ? 800 : 900 })
    const writes = await mockGame(page)
    const finalScore = width === 390 ? -30 : width === 768 ? 0 : 1234
    await page.route('**/api/game/history/games/board-layout', (route) =>
      route.fulfill({
        json: {
          mainGame: {
            rounds: [
              {
                roundId: 'played-round',
                cellId: 'card-0',
                cellTitle: 'Следы на болотах',
                cellDescription: '',
                cellCost: 100,
                cellMedia: [],
                teamName: 'Ночные призраки',
                teamSlotIndex: 1,
                finalScore,
                baseScore: 100,
                emptyCardPenaltyApplied: false,
                scoreDetails: {
                  scoreUnit: 100,
                  killsScore: 100,
                  bountyScore: 0,
                  modifierKillDelta: 0,
                  modifierKillScore: 0,
                  modifierScoreDelta: finalScore - 100,
                  emptyCardPenaltyApplied: false,
                  emptyCardPenaltyScore: 0,
                  penaltyTotal: 0,
                  bonusDelta: finalScore - 100,
                  totalKillCount: 1,
                  finalScore,
                  calculationLines: [],
                },
                killsCount: 1,
                bountyCount: 0,
                status: 'completed',
                finishedAtUtc: '2026-09-01T12:00:00Z',
                modifiers: [],
                participants: [
                  { userId: 'p1', displayName: 'Александр Неверовский' },
                  { userId: 'p2', displayName: 'Екатерина Савельева' },
                  { userId: 'p3', displayName: 'Игрок с длинным именем' },
                ],
              },
            ],
          },
        },
      }),
    )
    await page.goto('/panel/game-board')
    const card = page.locator('[data-cell-id="card-0"]')
    const label = card.getByTestId('played-cell-result-label')
    const points = card.getByTestId('played-cell-result-points')
    await expect(label).toHaveText('Сыграно')
    await expect(points).toHaveText(`${finalScore} очк.`)
    await expect(points).toHaveCSS(
      'color',
      width === 390
        ? 'rgb(164, 99, 92)'
        : width === 768
          ? 'rgb(209, 207, 199)'
          : 'rgb(144, 151, 128)',
    )
    await expect(card.getByTestId('played-cell-team')).toHaveText('Ночные призраки')
    await expect(card).toHaveAccessibleDescription(`Сыграно ${finalScore} очк. Ночные призраки`)
    await expect(card).not.toContainText('Александр Неверовский')
    const labelBox = await label.boundingBox()
    const pointsBox = await points.boundingBox()
    expect(labelBox!.y + labelBox!.height).toBeLessThan(pointsBox!.y)
    await expect(label).toHaveCSS('white-space', 'nowrap')
    await expect(points).toHaveCSS('white-space', 'nowrap')
    expect(await label.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    )
    expect(await points.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    )
    expect(await card.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(
      true,
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width >= 768) {
      const last = await page.locator('[data-cell-id="card-24"]').boundingBox()
      if (width === 1440) expect(last!.y + last!.height).toBeLessThanOrEqual(900)
      const bounds = await card.boundingBox()
      expect(Math.round(bounds!.width)).toBeGreaterThanOrEqual(width === 768 ? 79 : 80)
    }
    await page.screenshot({ path: testInfo.outputPath('played-board.png'), fullPage: true })
    expect(writes).toEqual([])
  })
}

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1280, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`current round fits its parent without horizontal scrolling at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport)
    await mockGame(page, 'active', 'admin')
    await page.route('**/api/game/rounds/active', (route) =>
      route.fulfill({ json: { ...activeRoundFixture, status: 'in_progress' } }),
    )
    await page.goto('/panel/game-round')
    await expect(page.getByTestId('round-phase-value')).toContainText('Проведение игры')
    // Classic vertical scrollbars reduce the parent's available width on desktop.
    await page.addStyleTag({ content: 'html { overflow-y: scroll; }' })
    const bounds = await page.getByTestId('current-round-screen').evaluate((el) => {
      const main = el.closest('main')!
      const mainBounds = main.getBoundingClientRect()
      const styles = getComputedStyle(main)
      const contentLeft = mainBounds.left + parseFloat(styles.paddingLeft)
      const contentRight = mainBounds.left + main.clientWidth - parseFloat(styles.paddingRight)
      const screen = el.getBoundingClientRect()
      return { left: screen.left, right: screen.right, contentLeft, contentRight }
    })
    expect(bounds.left).toBeGreaterThanOrEqual(bounds.contentLeft - 1)
    expect(bounds.right).toBeLessThanOrEqual(bounds.contentRight + 1)
    expect(bounds.left - bounds.contentLeft).toBeCloseTo(bounds.contentRight - bounds.right, 0)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true)
    const overflowing = await page.getByTestId('current-round-screen').evaluate(
      (el) =>
        [el, ...el.querySelectorAll('*')].filter((child) => {
          const styles = getComputedStyle(child)
          return (
            ['auto', 'scroll'].includes(styles.overflowX) &&
            child.scrollWidth > child.clientWidth + 1
          )
        }).length,
    )
    expect(overflowing).toBe(0)
    await page.screenshot({ path: info.outputPath('round.png'), animations: 'disabled' })
  })
}
