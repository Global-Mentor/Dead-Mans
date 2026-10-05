import { expect, test, type Locator, type Page, type WebSocketRoute } from '@playwright/test'

// Row metrics keep each label beside its value and share a numeric column.
async function expectMetricRows(scope: Locator) {
  const metrics = await scope.getByRole('group').evaluateAll((elements) =>
    elements.flatMap((element) => {
      const label = element.querySelector('dt')
      const value = element.querySelector('dd')
      if (!label || !value || !element.getClientRects().length) return []
      const cell = element.getBoundingClientRect()
      const text = label.getBoundingClientRect()
      const number = value.getBoundingClientRect()
      return [
        {
          name: label.textContent,
          column: cell.right,
          labelLeft: text.left,
          labelRight: text.right,
          labelTop: text.top,
          valueLeft: number.left,
          valueTop: number.top,
          valueRight: number.right,
        },
      ]
    }),
  )
  expect(metrics.length).toBeGreaterThan(1)
  for (const metric of metrics) {
    expect(metric.labelRight, metric.name ?? '').toBeLessThan(metric.valueLeft)
    expect(Math.abs(metric.labelTop - metric.valueTop), metric.name ?? '').toBeLessThanOrEqual(1)
    for (const neighbour of metrics.filter((item) => Math.abs(item.column - metric.column) < 1)) {
      expect(
        Math.abs(metric.labelLeft - neighbour.labelLeft),
        metric.name ?? '',
      ).toBeLessThanOrEqual(1)
      expect(
        Math.abs(metric.valueRight - neighbour.valueRight),
        metric.name ?? '',
      ).toBeLessThanOrEqual(1)
    }
  }
}

const gameId = '11111111-1111-4111-8111-111111111111'

function createRound(teamIndex: number, roundIndex: number) {
  const score = 120 - teamIndex * 4 + roundIndex * 6
  return {
    roundId: `${teamIndex.toString().padStart(8, '0')}-0000-4000-8000-${roundIndex
      .toString()
      .padStart(12, '0')}`,
    teamId: `${teamIndex.toString().padStart(8, '0')}-1111-4111-8111-111111111111`,
    teamName: `Команда с длинным названием ${teamIndex}`,
    teamSlotIndex: teamIndex,
    status: 'completed',
    roundVersion: 4,
    startedAtUtc: `2026-09-21T1${roundIndex}:00:00Z`,
    preparedAtUtc: null,
    gameplayStartedAtUtc: null,
    reviewedAtUtc: null,
    finishedAtUtc: `2026-09-21T1${roundIndex}:05:00Z`,
    baseScore: score,
    finalScore: score,
    emptyCardPenaltyApplied: false,
    scoreDetails: {
      scoreUnit: 1,
      killsScore: score,
      bountyScore: 0,
      modifierKillDelta: 0,
      modifierKillScore: 0,
      modifierScoreDelta: 0,
      emptyCardPenaltyApplied: false,
      emptyCardPenaltyScore: 0,
      penaltyTotal: 0,
      bonusDelta: 0,
      totalKillCount: 2 + roundIndex,
      finalScore: score,
      calculationLines: [],
    },
    killsCount: 2 + roundIndex,
    bountyCount: roundIndex,
    cellId: `${teamIndex.toString().padStart(8, '0')}-2222-4222-8222-${roundIndex
      .toString()
      .padStart(12, '0')}`,
    cellRowIndex: roundIndex,
    cellColIndex: teamIndex,
    cellType: 'regular',
    cellTitle: `Карточка ${roundIndex + 1}`,
    cellDescription: null,
    cellCost: 100,
    notes: null,
    technicalCancellationReasonCode: null,
    publicCancellationSummary: null,
    technicalCancellationStage: null,
    purchasesRefunded: false,
    cellMedia: [],
    participants:
      teamIndex === 1
        ? [
            {
              userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
              displayName: 'Ведущий',
              createdAtUtc: '2026-09-21T10:00:00Z',
            },
          ]
        : [],
    modifiers: [],
  }
}

const teams = Array.from({ length: 14 }, (_, index) => {
  const teamIndex = index + 1
  const rounds = Array.from({ length: 4 }, (_, roundIndex) => createRound(teamIndex, roundIndex))
  const bestRound = rounds.at(-1)!
  const totalScore = rounds.reduce((total, round) => total + round.scoreDetails.finalScore, 0)
  return {
    teamId: bestRound.teamId,
    teamName: bestRound.teamName,
    teamSlotIndex: teamIndex,
    roundsPlayed: rounds.length,
    bestScore: bestRound.scoreDetails.finalScore,
    penaltyTotal: index % 3,
    finalScore: bestRound.scoreDetails.finalScore - (index % 3),
    bestRound,
    latestRound: bestRound,
    rounds,
    totalScore,
    averageScore: Math.round(totalScore / rounds.length),
    totalBonusDelta: 0,
    totalKills: 14,
    totalBounties: 6,
    participantNames: [`Игрок ${teamIndex}А`, `Игрок ${teamIndex}Б`],
    lastFinishedAtUtc: bestRound.finishedAtUtc,
  }
})

const modifierBehavior = {
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
}

function createSnapshot(name: string, successfulActivationsCount: number) {
  return {
    modifierId: crypto.randomUUID(),
    versionId: crypto.randomUUID(),
    revision: 1,
    name,
    description: 'Описание модификатора',
    category: 'round',
    iconEmoji: '⚓',
    activationCommand: null,
    activationCost: 2,
    activationLimit: null,
    normalizedTags: [],
    behaviorV2: modifierBehavior,
    conflicts: [],
    successfulActivationsCount,
    cancelledActivationsCount: 0,
    resultsCount: successfulActivationsCount,
    isEmergencyDisabled: false,
    emergencyDisabledAtUtc: null,
  }
}

async function mockLeaderboard(
  page: Page,
  teamCount = teams.length,
  withMedia = false,
  untitled = false,
  mixedResults = false,
  withModifiers = false,
  extraModifiers = 0,
) {
  const usedSnapshot = {
    ...createSnapshot('Использованный модификатор', 3),
    modifierId: 'modifier-used',
    cancelledActivationsCount: 1,
    resultsCount: 2,
  }
  let modifierSnapshots = withModifiers
    ? [
        usedSnapshot,
        {
          ...usedSnapshot,
          versionId: 'version-2',
          revision: 2,
          successfulActivationsCount: 1,
          cancelledActivationsCount: 0,
          resultsCount: 1,
        },
        {
          ...createSnapshot('Отменённый модификатор', 0),
          modifierId: 'modifier-cancelled',
          cancelledActivationsCount: 2,
          isEmergencyDisabled: true,
        },
        createSnapshot('Неиспользованный модификатор', 0),
      ]
    : [
        createSnapshot('Использованный модификатор', 2),
        createSnapshot('Неиспользованный модификатор', 0),
      ]
  modifierSnapshots.push(
    ...Array.from({ length: extraModifiers }, (_, index) => ({
      ...createSnapshot(`Модификатор ${index + 1}`, 1),
      resultsCount: 0,
    })),
  )
  let modifierSnapshotStatus = 'complete'
  let quizPoints = 25
  let gameStatus = 'active'
  let socket: WebSocketRoute | undefined
  let connections = 0
  const withCardMedia = (round: ReturnType<typeof createRound>) => ({
    ...round,
    modifiers:
      withModifiers && round.cellRowIndex < 3
        ? [
            {
              modifierResultId: round.roundId,
              modifierId: usedSnapshot.modifierId,
              modifierName: usedSnapshot.name,
              modifierDescription: usedSnapshot.description,
              modifierCategory: 'round',
              outcomeStatus: round.cellRowIndex === 1 ? 'failed' : 'completed',
              scoreDelta: [15, -20, -5][round.cellRowIndex],
              killDelta: round.cellRowIndex === 0 ? 1 : 0,
              activationId: round.roundId,
              definitionRevision: round.cellRowIndex === 1 ? 2 : 1,
            },
          ]
        : [],
    scoreDetails: mixedResults
      ? {
          ...round.scoreDetails,
          finalScore: [625, -100, 0, 50][round.cellRowIndex],
          penaltyTotal: [0, 100, 0, 25][round.cellRowIndex],
        }
      : withModifiers
        ? {
            ...round.scoreDetails,
            modifierScoreDelta: [15, -20, -5, 0][round.cellRowIndex],
            modifierKillDelta: round.cellRowIndex === 0 ? 1 : 0,
            modifierKillScore: round.cellRowIndex === 0 ? 1 : 0,
          }
        : round.scoreDetails,
    cellTitle: untitled ? null : round.cellTitle,
    cellMedia: withMedia ? [{ url: '/card-preview-test.svg' }] : [],
  })
  const selectedTeams = teams.slice(0, teamCount).map((team) => ({
    ...team,
    bestRound: withCardMedia(team.bestRound),
    latestRound: withCardMedia(team.latestRound),
    rounds: team.rounds.map(withCardMedia),
  }))
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  await page.routeWebSocket(/\/hubs\/game-board/, (route) => {
    socket = route
    route.onMessage((message) => {
      if (message.toString().includes('"protocol"')) {
        route.send('{}\u001e')
        connections += 1
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
            connectionId: 'leaderboard',
            connectionToken: 'leaderboard',
            negotiateVersion: 1,
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
          },
        })
      if (route.request().method() !== 'GET') return route.fulfill({ status: 204 })
      if (path === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
            displayName: 'Ведущий',
            roles: ['viewer'],
          },
        })
      if (path === '/api/game')
        return route.fulfill({
          json: {
            gameId,
            status: gameStatus,
            title: 'Большая командная игра',
            version: 1,
            rows: 4,
            cols: 15,
            rowLabels: ['100', '200', '300', '400'],
            colLabels: Array.from({ length: 15 }, (_, index) => `Категория ${index}`),
            cells: [],
            enabledModifierIds: [],
            activeModifiers: [],
            activeTeamId: null,
          },
        })
      if (path === '/api/game/history/games') return route.fulfill({ json: [] })
      if (path === `/api/game/history/games/${gameId}`)
        return route.fulfill({
          json: {
            gameId,
            gameTitle: 'Большая командная игра',
            gameStatus,
            createdAtUtc: '2026-09-21T10:00:00Z',
            startedAtUtc: '2026-09-21T10:01:00Z',
            finishedAtUtc: null,
            mainGame: {
              playerStats: [],
              teamStats: selectedTeams,
              modifierActivations: withModifiers
                ? modifierSnapshots.flatMap((snapshot) =>
                    Array.from(
                      {
                        length:
                          snapshot.successfulActivationsCount + snapshot.cancelledActivationsCount,
                      },
                      (_, index) => ({
                        activationId: snapshot.versionId + index,
                        modifierId: snapshot.modifierId,
                        modifierName: snapshot.name,
                        activatedByUserId: 'viewer',
                        activatedByDisplayName: 'Зритель',
                        activatedAtUtc: '2026-09-21T10:30:00Z',
                        status:
                          index < snapshot.successfulActivationsCount ? 'consumed' : 'cancelled',
                        cancelledAtUtc:
                          index < snapshot.successfulActivationsCount
                            ? null
                            : '2026-09-21T10:35:00Z',
                        refundAmount: index < snapshot.successfulActivationsCount ? 0 : 2,
                      }),
                    ),
                  )
                : [],
              rounds: selectedTeams.flatMap((team) => team.rounds),
            },
            quiz: {
              totalPoints: quizPoints + 10,
              playerStats: [
                {
                  userId: '10000000-0000-4000-8000-000000000001',
                  displayName: 'Лучший знаток',
                  points: quizPoints,
                  spentPoints: 10,
                  availablePoints: quizPoints - 10,
                  attempts: 4,
                  correctAnswers: 3,
                  lastActivityAtUtc: '2026-09-21T11:00:00Z',
                },
                {
                  userId: '10000000-0000-4000-8000-000000000002',
                  displayName: 'Второй знаток',
                  points: 10,
                  spentPoints: 0,
                  availablePoints: 10,
                  attempts: 3,
                  correctAnswers: 1,
                  lastActivityAtUtc: '2026-09-21T10:55:00Z',
                },
              ],
              questionSessions: mixedResults
                ? Array.from({ length: 5 }, (_, index) => ({
                    questionSessionId: 'session-' + index,
                    questionId: 'question-' + index,
                    questionCode: 'Q' + index,
                    questionText: 'Исторический вопрос ' + index,
                    categoryName: 'Общие знания',
                    reward: 10,
                    status: index === 4 ? 'skipped' : 'closed',
                    askedAtUtc: '2026-09-21T10:00:00Z',
                    closedAtUtc: '2026-09-21T10:01:00Z',
                    options: [],
                    submissions: [],
                  }))
                : [],
              manualAwards: [],
            },
            finalResult: null,
            modifierSnapshotStatus,
            modifierSnapshots,
          },
        })
      return route.fulfill({ status: 204 })
    },
  )
  return {
    clearModifiers: (legacy = false) => {
      modifierSnapshots = []
      modifierSnapshotStatus = legacy ? 'legacy_unavailable' : 'complete'
    },
    setQuizPoints: (points: number) => {
      quizPoints = points
    },
    finish: () => {
      gameStatus = 'finished'
    },
    connectionCount: () => connections,
    ping: () => socket!.send(JSON.stringify({ type: 6 }) + '\u001e'),
    emit: (target: string) =>
      socket!.send(JSON.stringify({ type: 1, target, arguments: [] }) + '\u001e'),
    disconnect: () => socket!.close({ code: 1012 }),
  }
}

test('leaderboard names untitled played cards by column and row', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockLeaderboard(page, 1, false, true)
  await page.goto('/panel/game-leaderboard')
  const details = page.getByTestId('current-leaderboard-team-details')
  await expect(details.getByText('Категория 1 · 100', { exact: true })).toBeVisible()
  await expect(details.getByText('Категория 1 · 400', { exact: true })).toBeVisible()
  await expect(details.getByText('Игровая карточка', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('untitled-cards.png') })
})

test('leaderboard distinguishes positive, zero and penalized card results', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockLeaderboard(page, 1, false, false, true)
  await page.goto('/panel/game-leaderboard')
  const details = page.getByTestId('current-leaderboard-team-details')
  const first = details.getByRole('article', { name: 'Карточка 1', exact: true })
  await expect(first.getByText('Итог +625 очк.', { exact: true })).toBeVisible()
  await expect(first.getByText(/Штрафы/)).toHaveCount(0)
  const second = details.getByRole('article', { name: 'Карточка 2', exact: true })
  await expect(second.getByText('Итог -100 очк.', { exact: true })).toBeVisible()
  await expect(second.getByText('Штрафы -100 очк.', { exact: true })).toBeVisible()
  await expect(
    details
      .getByRole('article', { name: 'Карточка 3', exact: true })
      .getByText('Итог 0 очк.', { exact: true }),
  ).toBeVisible()
  const fourth = details.getByRole('article', { name: 'Карточка 4', exact: true })
  await expect(fourth.getByText('Итог +50 очк.', { exact: true })).toBeVisible()
  await expect(fourth.getByText('Штрафы -25 очк.', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('card-results.png') })
})

for (const width of [390, 768, 1440]) {
  test(`game statistics show recorded results and stay inside the viewport at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const server = await mockLeaderboard(page, 1, false, false, true)
    await page.goto('/panel/game-leaderboard')
    await page.getByRole('tab', { name: 'Статистика', exact: true }).click()
    const statistics = page.getByTestId('current-game-statistics')
    const heading = statistics.getByRole('heading', { name: 'Статистика игры', exact: true })
    await expect(heading).toBeInViewport()
    await expect(
      statistics.getByRole('group', { name: 'Сыгравших команд', exact: true }),
    ).toContainText('1')
    await expect(
      statistics.getByRole('group', { name: 'Всего убийств', exact: true }),
    ).toContainText('14')
    await expect(
      statistics.getByRole('group', { name: 'Всего штрафов', exact: true }),
    ).toContainText('125 очк.')
    await expect(
      statistics.getByRole('group', { name: 'Раундов в плюс', exact: true }),
    ).toContainText('2')
    await expect(
      statistics.getByRole('group', { name: 'Раундов в минус', exact: true }),
    ).toContainText('1')
    await expect(statistics.getByRole('group', { name: 'Всего очков', exact: true })).toContainText(
      '575 очк.',
    )
    await expect(
      statistics.getByRole('group', { name: 'Нулевых раундов', exact: true }),
    ).toHaveCount(0)
    await expect(
      statistics.getByRole('group', { name: 'Точность ответов', exact: true }),
    ).toContainText('57,1%')
    await expect(
      statistics.getByRole('group', { name: 'Заданных вопросов', exact: true }),
    ).toContainText('5')
    await expect(statistics.getByRole('group')).toHaveCount(16)
    for (const name of [
      'Итог команд',
      'Итог раундов',
      'Средний раунд',
      'Стоимость карточек',
      'Потрачено',
      'На руках',
    ])
      await expect(statistics.getByRole('group', { name, exact: true })).toHaveCount(0)
    if (width === 1440) {
      const bounds = async (name: string) => {
        const rect = await statistics.getByRole('region', { name, exact: true }).boundingBox()
        expect(rect).not.toBeNull()
        if (!rect) throw new Error('Statistics section has no bounds')
        return rect
      }
      const overview = await bounds('Основные итоги')
      for (const name of ['Результаты раундов', 'Викторина', 'Рекорды раундов']) {
        const full = await bounds(name)
        expect(Math.abs(full.x - overview.x)).toBeLessThanOrEqual(1)
        expect(Math.abs(full.width - overview.width)).toBeLessThanOrEqual(1)
      }
    }
    for (const name of ['Основные итоги', 'Результаты раундов', 'Викторина'])
      await expectMetricRows(statistics.getByRole('region', { name, exact: true }))
    for (const [top, bottom] of [
      ['Сыгравших команд', 'Завершено раундов'],
      ['Всего убийств', 'Всего наград'],
      ['Сыгравших игроков', 'Технических отмен'],
      ['Верных ответов', 'Неверных ответов'],
      ['Точность ответов', 'Заработано'],
    ]) {
      const upper = await statistics.getByRole('group', { name: top, exact: true }).boundingBox()
      const lower = await statistics.getByRole('group', { name: bottom, exact: true }).boundingBox()
      expect(upper).not.toBeNull()
      expect(lower).not.toBeNull()
      expect(Math.abs(upper!.x - lower!.x)).toBeLessThanOrEqual(1)
      expect(upper!.y).toBeLessThan(lower!.y)
    }
    for (const record of await statistics.getByRole('article').all()) {
      await expect(record.getByRole('heading')).toHaveCSS('text-align', 'center')
    }
    await expect(page.getByRole('tab')).toHaveText([
      'Команды',
      'Викторина',
      'Модификаторы',
      'Статистика',
    ])
    await page.screenshot({ path: testInfo.outputPath('statistics.png') })
    await statistics
      .getByRole('article', { name: 'Больше всего наград', exact: true })
      .scrollIntoViewIfNeeded()
    await expect(
      statistics.getByRole('article', { name: 'Лучший счёт раунда', exact: true }),
    ).toContainText('625 очк.')
    if (width >= 768) {
      const values = await statistics
        .getByTestId('record-value')
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().bottom),
        )
      for (const bottom of values) expect(Math.abs(bottom - values[0]!)).toBeLessThanOrEqual(1)
      const names = await statistics
        .getByTestId('record-card-name')
        .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top))
      for (const top of names) expect(Math.abs(top - names[0]!)).toBeLessThanOrEqual(1)
    }
    await expect(heading).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
      900,
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    await page.screenshot({ path: testInfo.outputPath('statistics-records.png') })
    await expect.poll(server.connectionCount).toBe(1)
    server.setQuizPoints(40)
    server.emit('quizStateChanged')
    await expect(statistics.getByRole('group', { name: 'Заработано', exact: true })).toContainText(
      '50 очк.',
    )
  })
}

test('quiz standings update live and recover missed results after reconnect', async ({ page }) => {
  const server = await mockLeaderboard(page, 1)
  await page.goto('/panel/game-leaderboard')
  await page.getByRole('tab', { name: 'Викторина', exact: true }).click()
  const leaderboard = page.getByTestId('quiz-leaderboard')
  await expect(leaderboard.getByText('25 очк.')).toBeVisible()
  await expect.poll(server.connectionCount).toBe(1)

  server.setQuizPoints(40)
  server.emit('quizStateChanged')
  await expect(leaderboard.getByText('40 очк.')).toBeVisible()

  // Points change while disconnected, with no quiz event to replay.
  await server.disconnect()
  server.setQuizPoints(55)
  await expect.poll(server.connectionCount, { timeout: 15_000 }).toBe(2)
  await expect(leaderboard.getByText('55 очк.')).toBeVisible()

  server.setQuizPoints(60)
  server.finish()
  server.emit('gameLifecycleChanged')
  await expect(leaderboard.getByText('60 очк.')).toBeVisible()
  const navigation = page.getByRole('navigation', { name: 'Основная навигация' })
  await expect(navigation.getByRole('link', { name: 'Викторина' })).toHaveCount(0)
})

test('quiz standings recover a lost event through the active-game fallback refresh', async ({
  page,
}) => {
  await page.clock.install()
  const server = await mockLeaderboard(page, 1)
  await page.goto('/panel/game-leaderboard')
  await page.getByRole('tab', { name: 'Викторина', exact: true }).click()
  const leaderboard = page.getByTestId('quiz-leaderboard')
  await expect(leaderboard.getByText('25 очк.')).toBeVisible()
  await expect.poll(server.connectionCount).toBe(1)
  server.setQuizPoints(45)
  await page.clock.fastForward(15_000)
  server.ping()
  // Deliver the ping before advancing past the server timeout window.
  await expect.poll(server.connectionCount).toBe(1)
  await page.clock.fastForward(16_000)
  await expect(leaderboard.getByText('45 очк.')).toBeVisible()
  expect(server.connectionCount()).toBe(1)
})

for (const size of [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]) {
  test(`leaderboard panels use the viewport at ${size.width}x${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size)
    await mockLeaderboard(page)
    await page.goto('/panel/game-leaderboard')

    const summary = page.getByTestId('current-game-summary')
    const table = page.getByTestId('current-leaderboard-table')
    const details = page.getByTestId('current-leaderboard-team-details')
    await expect(summary).toBeVisible()
    await expect(summary.getByRole('heading', { level: 1 })).toHaveText('Большая командная игра')
    await expect(summary.getByText('Активна', { exact: true })).toHaveCount(0)
    await expect(table).toBeVisible()
    await expect(details).toBeVisible()
    const quizTab = page.getByRole('tab', { name: 'Викторина', exact: true })
    await expect(quizTab).toBeInViewport()
    await quizTab.click()
    const quizLeaderboard = page.getByTestId('quiz-leaderboard')
    await expect(quizLeaderboard).toBeVisible()
    await expect(quizLeaderboard.getByText('Лучший знаток')).toBeVisible()
    await expect(quizLeaderboard.getByText('25 очк.')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('quiz-leaderboard.png') })
    await page.getByRole('tab', { name: 'Команды', exact: true }).click()
    const rows = table
      .getByRole('row')
      .filter({ has: page.getByRole('cell', { name: /Команда с длинным названием/ }) })
    expect(
      await rows.evaluateAll((elements) =>
        elements.every((element) => {
          const grid = element
          return grid.scrollWidth <= grid.clientWidth + 1
        }),
      ),
    ).toBe(true)
    await expect(
      table.getByRole('columnheader', { name: 'Всего убийств', exact: true }),
    ).toBeVisible()
    await expect(
      table.getByRole('columnheader', { name: 'Всего наград', exact: true }),
    ).toBeVisible()
    await expect(rows.nth(1).getByRole('cell').nth(3)).toHaveText('14')
    await expect(rows.nth(1).getByRole('cell').nth(4)).toHaveText('6')
    await rows.nth(1).getByRole('cell').last().click()
    await expect(details.getByRole('button', { name: /Лучшая карточка/ })).toHaveCount(0)
    await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect(table.locator('[data-own-team]')).toHaveCount(1)
    await expect(table.locator('[data-own-team]')).toHaveAttribute('aria-selected', 'false')
    await expect(details.getByRole('heading', { level: 2 })).toHaveText('Итоги команды')
    await expect(details.getByRole('heading', { level: 3 })).toHaveText(
      'Команда с длинным названием 2',
    )
    await page.screenshot({ path: testInfo.outputPath('leaderboard.png') })

    expect(
      await summary.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true)
    const tableMetrics = await table.evaluate((element) => ({
      bottom: element.getBoundingClientRect().bottom,
      height: element.clientHeight,
      content: element.scrollHeight,
    }))
    expect(tableMetrics.bottom).toBeLessThanOrEqual(size.height)
    expect(tableMetrics.content).toBeLessThanOrEqual(tableMetrics.height + 1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      size.width,
    )
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
      size.height,
    )
    await expect(page.getByText('Неиспользованный модификатор')).toHaveCount(0)
    await page.getByRole('tab', { name: 'Статистика', exact: true }).click()
    await expect(page.getByTestId('modifier-summary-disclosure')).toHaveCount(0)
    await page.getByRole('tab', { name: 'Модификаторы', exact: true }).click()
    const results = page.getByTestId('current-game-modifier-results')
    await expect(results.getByText('Использованный модификатор', { exact: false })).toBeVisible()
    await expect(results.getByText('Неиспользованный модификатор', { exact: false })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
      size.height,
    )
  })
}

for (const width of [320, 390, 768]) {
  test(`leaderboard opens team details without scrolling at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await mockLeaderboard(page)
    await page.goto('/panel/game-leaderboard')

    const table = page.getByTestId('current-leaderboard-table')
    await expect(table).toBeVisible()
    await expect(page.getByTestId('current-leaderboard-team-details')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
      844,
    )
    const team = table
      .getByRole('row')
      .filter({ has: page.getByRole('cell', { name: /Команда с длинным названием/ }) })
      .nth(1)
    await team.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Команда', exact: true })
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole('heading', { name: 'Команда с длинным названием 2' }),
    ).toBeVisible()
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    )
    await page.screenshot({ path: testInfo.outputPath('team-details.png'), animations: 'disabled' })
    const bestCard = dialog.getByRole('button', { name: 'Открыть карточку', exact: true }).last()
    await bestCard.click()
    const preview = page.getByRole('dialog', { name: 'Карточка 4', exact: true })
    await expect(preview).toBeVisible()
    const resultPanel = preview.getByTestId('played-card-result-panel')
    expect(
      await resultPanel.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
    ).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('played-card.png'), animations: 'disabled' })
    await preview.getByRole('button', { name: 'Закрыть', exact: true }).click()
    await expect(preview).not.toBeVisible()
    await expect(dialog).toBeVisible()
    await expect(bestCard).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(team).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
  })
}

for (const width of [390, 1366]) {
  test(`played card media and results fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await mockLeaderboard(page, 1, true)
    await page.route('**/card-preview-test.svg', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640"><rect width="480" height="640" fill="#282827"/><path d="M40 40H440V600H40Z" fill="none" stroke="#a4a08a" stroke-width="4"/></svg>',
      }),
    )
    await page.goto('/panel/game-leaderboard')
    if (width < 1000)
      await page.getByTestId('current-leaderboard-table').getByRole('row').last().click()
    await page
      .getByTestId('current-leaderboard-team-details')
      .getByRole('button', { name: 'Открыть карточку', exact: true })
      .last()
      .click()
    const preview = page.getByRole('dialog', { name: 'Карточка 4', exact: true })
    await expect(preview.getByRole('img')).toBeVisible()
    await expect(preview.getByTestId('played-card-result-panel')).toBeVisible()
    expect(
      await preview.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true)
    await expect(preview.getByRole('button', { name: 'Закрыть', exact: true })).toBeInViewport()
    await page.screenshot({
      path: testInfo.outputPath('played-card-media.png'),
      animations: 'disabled',
    })
  })
}

test('a short leaderboard fills the row width without reserving an empty scrollbar strip', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await mockLeaderboard(page, 1)
  await page.goto('/panel/game-leaderboard')
  const table = page.getByTestId('current-leaderboard-table')
  const row = table.getByRole('row').last()
  await expect(row).toBeVisible()
  const tableBounds = await table.getByRole('table').boundingBox()
  const rowBounds = await row.boundingBox()
  expect(
    Math.abs(tableBounds!.x + tableBounds!.width - rowBounds!.x - rowBounds!.width),
  ).toBeLessThanOrEqual(2)
})

for (const width of [390, 768, 1440]) {
  test(`modifier results join revisions, expose descriptions and stay bounded at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await mockLeaderboard(page, 1, false, false, false, true)
    await page.goto('/panel/game-leaderboard')
    await page.getByRole('tab', { name: 'Модификаторы', exact: true }).click()
    const panel = page.getByTestId('current-game-modifier-results')
    const heading = panel.getByRole('heading', { name: 'Итоги модификаторов', exact: true })
    await expect(heading).toBeInViewport()
    const cards = panel.getByTestId('modifier-results-list').getByRole('listitem')
    await expect(cards).toHaveCount(3)
    const first = cards
      .filter({ hasText: 'Редакция 1' })
      .filter({ hasText: 'Использованный модификатор' })
    const toggle = first.getByRole('button')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toContainText('Активаций: 3 · Отмен: 1')
    await expect(toggle).toContainText('Очки: +10')
    await expect(
      first.getByRole('group', { name: 'Бонус от модификаторов', exact: true }),
    ).not.toBeVisible()
    const overview = panel.getByTestId('modifier-results-overview')
    for (const name of ['Активации', 'Раунды', 'Эффект']) {
      await expect(overview.getByRole('region', { name, exact: true })).toBeVisible()
    }
    if (width >= 768) {
      const bounds = await overview.getByRole('region').evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect()
          return { y: rect.y, width: rect.width, height: rect.height }
        }),
      )
      expect(bounds).toHaveLength(3)
      for (const rect of bounds) {
        expect(Math.abs(rect.y - bounds[0]!.y)).toBeLessThanOrEqual(1)
        expect(Math.abs(rect.width - bounds[0]!.width)).toBeLessThanOrEqual(1)
        expect(Math.abs(rect.height - bounds[0]!.height)).toBeLessThanOrEqual(1)
      }
    }
    await expect(
      overview.getByRole('group', { name: 'Раундов с модификаторами', exact: true }),
    ).toContainText('3')
    await expect(
      overview.getByRole('group', { name: 'Без модификаторов', exact: true }),
    ).toContainText('1')
    await expect(
      overview.getByRole('group', { name: 'Бонус от модификаторов', exact: true }),
    ).toContainText('+16 очк.')
    await expect(
      overview.getByRole('group', { name: 'Штраф от модификаторов', exact: true }),
    ).toContainText('-25 очк.')
    await expect(overview.getByRole('region', { name: 'Участие', exact: true })).toHaveCount(0)
    await expectMetricRows(overview)
    await page.screenshot({ path: testInfo.outputPath('modifier-results.png') })
    await toggle.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(first.getByRole('group', { name: 'Применено', exact: true })).toContainText('3')
    await expect(first.getByRole('group', { name: 'Результатов', exact: true })).toContainText('2')
    await expect(
      first.getByRole('group', { name: 'Бонус от модификаторов', exact: true }),
    ).toContainText('+16 очк.')
    await expect(
      first.getByRole('group', { name: 'Штраф от модификаторов', exact: true }),
    ).toContainText('-5 очк.')
    await expectMetricRows(first)
    const activation = first.getByRole('group', { name: 'Применено', exact: true })
    await activation.focus()
    await expect(page.getByRole('tooltip')).toContainText(
      'Некоторые могут ещё ожидать результата раунда.',
    )
    await toggle.focus()
    const second = cards.filter({ hasText: 'Редакция 2' })
    await expect(second.getByRole('button')).toContainText('Очки: -20')
    await second.getByRole('button').click()
    await expect(
      second.getByRole('group', { name: 'Штраф от модификаторов', exact: true }),
    ).toContainText('-20')
    await expect(first.getByText('Описание модификатора', { exact: true })).toBeVisible()
    await expect(
      first.getByRole('link', { name: 'История редакции', exact: true }),
    ).toHaveAttribute('href', /modifierId=modifier-used&revision=1/)
    const cancelled = cards.filter({ hasText: 'Отменённый модификатор' })
    await cancelled.getByRole('button').click()
    await cancelled.scrollIntoViewIfNeeded()
    await expect(cancelled.getByText('Аварийно отключён')).toBeVisible()
    await expect(cancelled.getByRole('group', { name: 'Отменено', exact: true })).toContainText('2')
    await expect(cancelled.getByText('В завершённых раундах результатов пока нет.')).toBeVisible()
    await expect(heading).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
      900,
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    await page.screenshot({ path: testInfo.outputPath('modifier-results-details.png') })
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(first.getByText('Описание модификатора', { exact: true })).not.toBeVisible()
  })
}

test('modifier results distinguish empty history from unavailable legacy revisions', async ({
  page,
}) => {
  const server = await mockLeaderboard(page, 1)
  server.clearModifiers()
  await page.goto('/panel/game-leaderboard')
  await page.getByRole('tab', { name: 'Модификаторы', exact: true }).click()
  const panel = page.getByTestId('current-game-modifier-results')
  await expect(panel.getByText('Активаций и результатов модификаторов пока нет.')).toBeVisible()
  await expect(panel.getByText(/Недостающие редакции/)).toHaveCount(0)
  await expect.poll(server.connectionCount).toBe(1)
  server.clearModifiers(true)
  server.emit('quizStateChanged')
  await expect(panel.getByText(/Недостающие редакции не восстанавливаются/)).toBeVisible()
})

test('many modifiers remain compact and expanded state survives a live refresh', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const server = await mockLeaderboard(page, 1, false, false, false, true, 17)
  await page.goto('/panel/game-leaderboard')
  await page.getByRole('tab', { name: 'Модификаторы', exact: true }).click()
  const panel = page.getByTestId('current-game-modifier-results')
  const list = panel.getByTestId('modifier-results-list')
  const rows = list.getByRole('listitem')
  await expect(rows).toHaveCount(20)
  await expect(list.locator('details[open]')).toHaveCount(0)
  const row = rows
    .filter({ hasText: 'Использованный модификатор' })
    .filter({ hasText: 'Редакция 1' })
  const toggle = row.getByRole('button')
  const viewport = panel.getByRole('region', { name: 'Итоги модификаторов', exact: true })
  const sizes = await viewport.evaluate((element) => ({
    height: element.clientHeight,
    content: element.scrollHeight,
  }))
  expect(sizes.content).toBeLessThan(sizes.height * 2)
  const compact = await row.boundingBox()
  expect(compact?.height).toBeLessThan(100)
  await page.screenshot({ path: testInfo.outputPath('many-modifiers-compact.png') })
  await toggle.click()
  const expanded = await row.boundingBox()
  expect(expanded?.height).toBeGreaterThan((compact?.height ?? 0) * 2)
  await expect.poll(server.connectionCount).toBe(1)
  server.setQuizPoints(40)
  const refreshed = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/game/history/games/${gameId}`) &&
      response.request().method() === 'GET',
  )
  server.emit('quizStateChanged')
  await refreshed
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(900)
})

test('asked-question count includes the current session without mixing another game or duplicating history', async ({
  page,
}) => {
  const server = await mockLeaderboard(page, 1, false, false, true)
  let sessionId = 'new-current-question'
  let currentGameId = gameId
  await page.route('**/api/game/quiz/current', (route) =>
    route.fulfill({
      json: {
        gameId: currentGameId,
        questionSessionId: sessionId,
        questionId: 'question',
        askOrder: 6,
        questionCode: 'Q6',
        categoryName: 'Тест',
        text: 'Тестовый вопрос',
        options: [],
        status: 'open',
        askedAtUtc: new Date().toISOString(),
        closesAtUtc: new Date(Date.now() + 60_000).toISOString(),
      },
    }),
  )
  await page.goto('/panel/game-leaderboard')
  await page.getByRole('tab', { name: 'Статистика', exact: true }).click()
  const count = page
    .getByTestId('current-game-statistics')
    .getByRole('group', { name: 'Заданных вопросов', exact: true })
  await expect(count).toContainText('6')
  await expect.poll(server.connectionCount).toBe(1)
  sessionId = 'different-current-question'
  currentGameId = 'other-game'
  server.emit('quizStateChanged')
  await expect(count).toContainText('5')
  currentGameId = gameId
  server.emit('quizStateChanged')
  await expect(count).toContainText('6')
  sessionId = 'session-0'
  server.emit('quizStateChanged')
  await expect(count).toContainText('5')
})

test('leaderboard restores active tab and viewed team after leaving and reloading', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockLeaderboard(page)
  await page.goto('/panel/game-leaderboard')
  const team = page.getByRole('row', { name: 'Команда с длинным названием 2', exact: true })
  await team.click()
  await page.getByRole('tab', { name: 'Статистика', exact: true }).click()
  const saved = page.url()
  await page.getByRole('link', { name: 'Модификаторы', exact: true }).click()
  await expect(page).toHaveURL(/panel\/game-modifiers/)
  await page.goBack()
  await expect(page).toHaveURL(saved)
  await expect(page.getByRole('tab', { name: 'Статистика', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.reload()
  await expect(page.getByRole('tab', { name: 'Статистика', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('tab', { name: 'Команды', exact: true }).click()
  await expect(team).toHaveAttribute('aria-selected', 'true')
  await expect(
    page
      .getByTestId('current-leaderboard-team-details')
      .getByRole('heading', { name: 'Команда с длинным названием 2', exact: true }),
  ).toBeVisible()
})
