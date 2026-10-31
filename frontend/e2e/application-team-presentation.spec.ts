import { expect, test } from '@playwright/test'
import type {
  GameRegistrationSnapshot,
  RegistrationTeam,
} from '../src/shared/api/contracts/index.ts'
import { mockGuideGame } from './support/game-guide-fixture.ts'
import { expectTeamPresentation } from './team-presentation-assertions.ts'

for (const width of [390, 768, 1440]) {
  test(`application long nicknames and alternating teams at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await mockGuideGame(page, 'ru', true, 'ready')
    const names = ['Серые волки', 'Тихая охота', 'Странники', 'Ночной дозор']
    const longName = 'VeryLongHunterNickname_1234567890'
    const teams: RegistrationTeam[] = names.map((name, index) => ({
      teamId: `example-${index}`,
      name,
      teamSlotIndex: index + 1,
      teamSlotType: 'public',
      status: 'forming',
      recruitmentOpen: false,
      isPlayed: false,
      isActiveInGame: false,
      isReady: false,
      members: [longName, index === 2 ? 'ОхотникСОченьДлиннымНикнеймом' : 'Ворон'].map(
        (displayName, player) => ({
          player: {
            userId: `player-${index}-${player}`,
            login: `hunter${index}${player}`,
            displayName,
          },
          joinedAtUtc: '2026-10-31T10:00:00Z',
          readyAtUtc: player === 0 ? '2026-10-31T10:01:00Z' : null,
        }),
      ),
      pendingInvitations: [],
    }))
    const snapshot: GameRegistrationSnapshot = {
      gameId: 'guide-game',
      gameStatus: 'ready',
      minPlayersPerTeam: 2,
      maxPlayersPerTeam: 2,
      teamSlots: [],
      teams,
      myTeam: teams[3]!,
      myPendingInvitations: [],
      myOutgoingInvitations: [],
      canInvitePlayersToMyTeam: false,
      invitablePlayers: [],
    }
    await page.route('**/api/game/registration', (route) => route.fulfill({ json: snapshot }))
    await page.goto('/panel/game-application')
    await expect(page.getByRole('heading', { name: 'Состав команды' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const cards = page.locator('#application-teams').getByRole('article')
    await expect(cards).toHaveCount(4)
    const backgrounds = await cards.evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).backgroundImage),
    )
    expect(backgrounds[0]).not.toBe(backgrounds[1])
    expect(backgrounds[0]).toBe(backgrounds[2])
    expect(backgrounds[3]).not.toBe(backgrounds[1])
    for (const profile of await page.getByTestId('team-presentation').all()) {
      await expectTeamPresentation(profile, 2)
      for (const member of await profile.getByRole('listitem').all()) {
        const cell = (await member.boundingBox())!
        const name = (await member.locator('p').boundingBox())!
        const status = (await member.getByText(/^(Не готов|Готов)$/).boundingBox())!
        expect(name.x + name.width / 2).toBeCloseTo(cell.x + cell.width / 2, 0)
        expect(status.x + status.width).toBeLessThanOrEqual(name.x)
        expect(name.height).toBeLessThanOrEqual(4 * 24)
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.locator('#application-teams').screenshot({
      path: `../.tmp/agent-work/public-guide-teams/application-teams-${width}.png`,
      animations: 'disabled',
    })
    await page.locator('#application-roster').screenshot({
      path: `../.tmp/agent-work/public-guide-teams/application-roster-${width}.png`,
      animations: 'disabled',
    })
    await cards.first().screenshot({
      path: `../.tmp/agent-work/public-guide-teams/application-team-${width}.png`,
      animations: 'disabled',
    })
    await page.getByRole('searchbox', { name: 'Найти команду или игрока' }).fill('Тихая охота')
    await expect(cards).toHaveCount(1)
    await expect(cards).toHaveCSS('background-image', backgrounds[0]!)
  })
}
