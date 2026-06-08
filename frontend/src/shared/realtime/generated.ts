
export const realtimeHubs = {
  gameBoard: {
    path: '/hubs/game-board',
    events: {
      cellOpened: 'cellOpened',
      modifierActivated: 'modifierActivated',
    },
  },
  gameSetup: {
    path: '/hubs/game-setup',
    events: {
      draftChanged: 'draftChanged',
    },
  },
} as const

export type RealtimeHubKey = keyof typeof realtimeHubs
export type RealtimeServerEventName<H extends RealtimeHubKey> =
  (typeof realtimeHubs)[H]['events'][keyof (typeof realtimeHubs)[H]['events']]
