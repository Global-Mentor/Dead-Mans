import type { Page } from '@playwright/test'
import type {
  GameBoardSnapshot,
  GameRegistrationSnapshot,
} from '../../src/shared/api/contracts/index.ts'
import type { SupportedLanguage } from '../../src/locales/index.ts'

const labels = {
  en: {
    title: 'Dead Mans',
    columns: ['Weapons', 'Hunt', 'Challenges'],
    teams: ['Ravens', 'Trackers', 'Wanderers'],
  },
  ru: {
    title: 'Dead Mans',
    columns: ['Оружие', 'Охота', 'Испытания'],
    teams: ['Вороны', 'Следопыты', 'Странники'],
  },
  uk: {
    title: 'Dead Mans',
    columns: ['Зброя', 'Полювання', 'Випробування'],
    teams: ['Круки', 'Слідопити', 'Мандрівники'],
  },
  pl: {
    title: 'Dead Mans',
    columns: ['Broń', 'Polowanie', 'Wyzwania'],
    teams: ['Kruki', 'Tropiciele', 'Wędrowcy'],
  },
}

export async function mockGuideGame(
  page: Page,
  language: SupportedLanguage = 'ru',
  hasGame = true,
  status: 'ready' | 'active' = 'active',
) {
  const copy = labels[language]
  const board: GameBoardSnapshot = {
    gameId: 'guide-game',
    title: copy.title,
    description: '',
    status,
    version: 1,
    rows: 3,
    cols: 3,
    rowLabels: ['100', '200', '300'],
    colLabels: copy.columns,
    activeTeamId: 'team-0',
    enabledModifierIds: [],
    activeModifiers: [],
    cells: Array.from({ length: 9 }, (_, index) => ({
      id: `card-${index}`,
      row: Math.floor(index / 3),
      col: index % 3,
      title: '',
      description: '',
      cost: (Math.floor(index / 3) + 1) * 100,
      type: 'question',
      state: 'closed',
      media: [],
    })),
  }
  await page.addInitScript((locale) => localStorage.setItem('i18nextLng', locale), language)
  await page.routeWebSocket(/\/hubs\//, (socket) => {
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
            connectionId: 'guide',
            connectionToken: 'guide',
            negotiateVersion: 1,
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
          },
        })
      if (path === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
            displayName: 'Visitor',
            roles: ['viewer'],
          },
        })
      if (path === '/api/game') return route.fulfill(hasGame ? { json: board } : { status: 204 })
      if (path === '/api/game/registration' && status === 'ready') {
        const registration: GameRegistrationSnapshot = {
          gameId: board.gameId,
          gameStatus: 'ready',
          minPlayersPerTeam: 2,
          maxPlayersPerTeam: 2,
          teamSlots: [
            {
              teamSlotId: 'slot-3',
              teamSlotIndex: 3,
              teamSlotType: 'public',
              isAvailableForNewTeam: true,
            },
          ],
          teams: copy.teams.slice(0, 2).map((name, index) => ({
            teamId: `team-${index}`,
            name,
            teamSlotIndex: index + 1,
            teamSlotType: 'public',
            recruitmentOpen: index === 0,
            status: 'forming',
            isPlayed: false,
            isActiveInGame: false,
            isReady: false,
            members: [
              {
                player: {
                  userId: `player-${index}`,
                  login: index === 0 ? 'raven' : 'scout',
                  displayName: index === 0 ? 'Raven' : 'Scout',
                },
                joinedAtUtc: '2026-10-15T10:00:00Z',
              },
            ],
            pendingInvitations: [],
          })),
          myTeam: null,
          myPendingInvitations: [],
          myOutgoingInvitations: [],
          canInvitePlayersToMyTeam: false,
          invitablePlayers: [],
        }
        return route.fulfill({ json: registration })
      }
      if (path === '/api/game/history/games/guide-game')
        return route.fulfill({ json: { mainGame: { rounds: [] } } })
      return route.fulfill({ status: 204 })
    },
  )
}
