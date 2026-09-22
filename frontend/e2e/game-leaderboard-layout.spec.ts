import { expect, test, type Page } from '@playwright/test'

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
    participants: [],
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

async function mockLeaderboard(page: Page, teamCount = teams.length, withMedia = false) {
  const withCardMedia = (round: ReturnType<typeof createRound>) => ({
    ...round,
    cellMedia: withMedia ? [{ url: '/card-preview-test.svg' }] : [],
  })
  const selectedTeams = teams.slice(0, teamCount).map((team) => ({
    ...team,
    bestRound: withCardMedia(team.bestRound),
    latestRound: withCardMedia(team.latestRound),
    rounds: team.rounds.map(withCardMedia),
  }))
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  await page.routeWebSocket(/\/hubs\/game-board/, (socket) => {
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
            status: 'active',
            title: 'Большая командная игра',
            version: 1,
            rows: 1,
            cols: 1,
            rowLabels: [],
            colLabels: [],
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
            gameStatus: 'active',
            createdAtUtc: '2026-09-21T10:00:00Z',
            startedAtUtc: '2026-09-21T10:01:00Z',
            finishedAtUtc: null,
            mainGame: {
              playerStats: [],
              teamStats: selectedTeams,
              modifierActivations: [],
              rounds: selectedTeams.flatMap((team) => team.rounds),
            },
            quiz: {
              totalPoints: 35,
              playerStats: [],
              questionSessions: [],
              manualAwards: [],
            },
            finalResult: null,
            modifierSnapshotStatus: 'complete',
            modifierSnapshots: [
              createSnapshot('Использованный модификатор', 2),
              createSnapshot('Неиспользованный модификатор', 0),
            ],
          },
        })
      return route.fulfill({ status: 204 })
    },
  )
}

for (const size of [
  { width: 1366, height: 768 },
  { width: 1400, height: 900 },
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
    await expect(table).toBeVisible()
    await expect(details).toBeVisible()
    const rows = table.getByRole('button')
    expect(
      await rows.evaluateAll((elements) =>
        elements.every((element) => {
          const grid = element.firstElementChild!
          return grid.scrollWidth <= grid.clientWidth + 1
        }),
      ),
    ).toBe(true)
    await rows.nth(1).click()
    await expect(rows.nth(1)).toHaveAttribute('aria-pressed', 'true')
    await expect(details.getByRole('heading')).toHaveText('Команда с длинным названием 2')
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
    await expect(page.getByText('Неиспользованный модификатор')).toHaveCount(0)
    const modifierSummary = page.getByTestId('modifier-summary-disclosure')
    const activeModifier = page.getByText('Использованный модификатор', { exact: false })
    await expect(modifierSummary).not.toHaveAttribute('open', '')
    await expect(modifierSummary.locator('.modifier-summary-description')).not.toBeVisible()
    await expect(activeModifier).not.toBeVisible()
    await modifierSummary.locator('summary').click()
    await expect(modifierSummary.locator('.modifier-summary-description')).toBeVisible()
    await expect(activeModifier).toBeVisible()
  })
}

for (const width of [390, 800]) {
  test(`leaderboard opens team details without scrolling at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await mockLeaderboard(page)
    await page.goto('/panel/game-leaderboard')

    const table = page.getByTestId('current-leaderboard-table')
    await expect(table).toBeVisible()
    await expect(page.getByTestId('current-leaderboard-team-details')).toHaveCount(0)
    const team = table.getByRole('button').nth(1)
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
    const bestCard = dialog.getByRole('button', { name: /Лучшая карточка/ })
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
      await page.getByTestId('current-leaderboard-table').getByRole('button').click()
    await page
      .getByTestId('current-leaderboard-team-details')
      .getByRole('button', { name: /Лучшая карточка/ })
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
  const row = table.getByRole('button')
  await expect(row).toBeVisible()
  const tableBounds = await table.boundingBox()
  const rowBounds = await row.boundingBox()
  expect(
    Math.abs(tableBounds!.x + tableBounds!.width - rowBounds!.x - rowBounds!.width),
  ).toBeLessThanOrEqual(2)
})
