import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { connectOverlayEvents, key, type Snapshot } from './support/overlay-fixture'

for (const width of [390, 768, 1440, 1920]) {
  test(`leaderboard fits and keeps the operator-selected page at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 800 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.install()
    let frame: Snapshot = {
      gameId: 'standings',
      phase: 'leaderboard',
      team: null,
      board: null,
      round: null,
      leaderboard: Array.from({ length: 7 }, (_, index) => ({
        rank: index === 6 ? null : index + 1,
        slotIndex: index + 1,
        name: `Команда ${index + 1} с очень длинным названием`,
        players: ['ПервыйОхотникСДлиннымИменем', 'ВторойОхотник'],
        roundsPlayed: index === 6 ? 0 : 2,
        totalKills: index === 0 ? 17 : 0,
        totalBounties: index === 0 ? 5 : 0,
        finalScore: index === 6 ? null : index === 0 ? 2147483647 : -index * 100,
      })),
    }
    await page.route('**/api/overlay/snapshot', (route) => route.fulfill({ json: frame }))
    const notify = await connectOverlayEvents(page)
    await page.goto(`/overlay?lng=ru#key=${key}`)
    const leaderboard = page.getByTestId('overlay-leaderboard')
    await expect(leaderboard).toBeVisible()
    await expect(leaderboard).toContainText('Страница 1 из 2')
    await expect(leaderboard.getByRole('row')).toHaveCount(7)
    const bounds = (await leaderboard.boundingBox())!
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.y).toBeCloseTo(24, 0)
    await expect(leaderboard.getByRole('columnheader')).toHaveText([
      'Место',
      'Команда',
      'Раунды',
      'Всего убийств',
      'Всего наград',
      'Итог',
    ])
    await expect(leaderboard.getByRole('row').nth(1).getByRole('cell')).toContainText([
      '1',
      'Команда 1',
      '2',
      '17',
      '5',
      '2',
    ])
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(width === 1920 ? 1080 : 800)
    await mkdir('../.tmp/agent-work/overlay', { recursive: true })
    await page.screenshot({ path: `../.tmp/agent-work/overlay/leaderboard-dense-${width}.png` })
    await page.clock.fastForward(30000)
    await expect(leaderboard).toContainText('Страница 1 из 2')
    frame = { ...frame, leaderboardPage: 1 }
    notify()
    await page.clock.fastForward(2000)
    await expect(leaderboard).toContainText('Страница 2 из 2')
    await expect(leaderboard).toContainText('Команда 7')
    await expect(leaderboard).toContainText('Нет завершённых раундов')
    expect((await leaderboard.boundingBox())!.y).toBeCloseTo(24, 0)
    await expect(leaderboard.getByRole('row')).toHaveCount(2)
    await page.clock.fastForward(30000)
    await expect(leaderboard).toContainText('Страница 2 из 2')
    frame = { ...frame, leaderboardPage: 0 }
    notify()
    await page.clock.fastForward(2000)
    await expect(leaderboard).toContainText('Страница 1 из 2')
    await page.setViewportSize({ width, height: 360 })
    await expect
      .poll(async () => {
        const fitted = (await leaderboard.boundingBox())!
        return fitted.y + fitted.height
      })
      .toBeLessThanOrEqual(336)
    expect((await leaderboard.boundingBox())!.y).toBeCloseTo(24, 0)
    frame = { ...frame, leaderboard: [] }
    notify()
    await page.clock.fastForward(2000)
    await expect(leaderboard).toContainText('Команд пока нет.')
    await expect(leaderboard.getByRole('row')).toHaveCount(1)
  })
}

for (const width of [390, 768, 1440, 1920]) {
  test(`quiz leaderboard shares standings, stays at the top and keeps manual pages at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 800 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.install()
    let frame: Snapshot = {
      gameId: 'quiz',
      phase: 'quiz_leaderboard',
      team: null,
      board: null,
      round: null,
      leaderboardPage: 0,
      quizLeaderboard: Array.from({ length: 7 }, (_, index) => ({
        displayName: `Игрок ${index + 1} с длинным именем охотника`,
        points: 700 - index * 100,
        attempts: index + 1,
        correctAnswers: index,
      })),
    }
    await page.route('**/api/overlay/snapshot', (route) => route.fulfill({ json: frame }))
    const notify = await connectOverlayEvents(page)
    await page.goto(`/overlay?lng=ru#key=${key}`)
    const quiz = page.getByTestId('overlay-quiz-leaderboard')
    await expect(quiz).toContainText(
      'Все очки, заработанные в викторине за эту игру, без учёта трат.',
    )
    await expect(quiz.getByRole('columnheader')).toHaveText([
      'Место',
      'Игрок',
      'Верные ответы',
      'Заработано',
    ])
    await expect(quiz.getByRole('row')).toHaveCount(7)
    const bounds = (await quiz.boundingBox())!
    expect(bounds.y).toBeCloseTo(24, 0)
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
    await page.clock.fastForward(30000)
    await expect(quiz).toContainText('Страница 1 из 2')
    await page.screenshot({ path: `../.tmp/agent-work/overlay/quiz-dense-${width}.png` })
    frame = { ...frame, leaderboardPage: 1 }
    notify()
    await page.clock.fastForward(2000)
    await expect(quiz).toContainText('Игрок 7')
    await expect(quiz.getByRole('row').nth(1).getByRole('cell').first()).toHaveText('7')
    await page.clock.fastForward(30000)
    await expect(quiz).toContainText('Страница 2 из 2')
    frame = { ...frame, quizLeaderboard: [] }
    notify()
    await page.clock.fastForward(2000)
    await expect(quiz).toContainText('Участников викторины пока нет.')
    await expect(quiz.getByRole('row')).toHaveCount(0)
  })
}
