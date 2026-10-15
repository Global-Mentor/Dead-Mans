import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import i18n from '../../../i18n.ts'
import { currentGameBoardQueryOptions } from '../../game-board/index.ts'
import {
  gameRegistrationAdminSnapshotQueryOptions,
  gameRegistrationSnapshotQueryOptions,
} from '../../game-registration/index.ts'
import { gameNotificationsQueryOptions } from '../api/game-notification-queries.ts'
import {
  browserNotificationSnapshot,
  newBrowserNotifications,
} from './browser-notification-snapshot.ts'

function registrationClient() {
  const client = new QueryClient()
  client.setQueryData(currentGameBoardQueryOptions.queryKey, { gameId: 'game', status: 'ready' })
  client.setQueryData(gameRegistrationSnapshotQueryOptions.queryKey, {
    gameId: 'game',
    myPendingInvitations: [
      { invitationId: 'invite', teamSlotIndex: 2, invitedByDisplayName: 'Captain' },
    ],
  })
  client.setQueryData(gameRegistrationAdminSnapshotQueryOptions.queryKey, {
    gameId: 'game',
    teams: [
      {
        teamId: 'team',
        status: 'confirmed',
        teamSlotIndex: 1,
        disbandRequestedAtUtc: '2026-10-15T12:00:00Z',
        disbandRequestedByDisplayName: 'Player',
      },
    ],
  })
  return client
}

describe('browser notification candidates', () => {
  it('never exposes cached staff requests to a player', () => {
    const client = registrationClient()
    const snapshot = browserNotificationSnapshot(client, i18n.t, false)
    expect([...snapshot.values()].flat().map((item) => item.id)).toEqual(['invitation:invite'])
    expect(browserNotificationSnapshot(client, i18n.t, true).get('disband:game')).toHaveLength(1)
  })

  it('drops invitations after registration closes and all cached requests after the game changes or ends', () => {
    const client = registrationClient()
    client.setQueryData(currentGameBoardQueryOptions.queryKey, { gameId: 'game', status: 'active' })
    expect([...browserNotificationSnapshot(client, i18n.t, true).keys()]).toEqual(['disband:game'])
    for (const game of [
      { gameId: 'other', status: 'ready' },
      { gameId: 'game', status: 'finished' },
    ]) {
      client.setQueryData(currentGameBoardQueryOptions.queryKey, game)
      expect(browserNotificationSnapshot(client, i18n.t, true).size).toBe(0)
    }
  })

  it('keeps unknown future notification types out of system delivery', () => {
    const client = new QueryClient()
    client.setQueryData(gameNotificationsQueryOptions.queryKey, [
      {
        notificationId: 'known',
        type: 'team_member_removed',
        createdAtUtc: '2026-10-15T12:00:00Z',
      },
      {
        notificationId: 'unknown',
        type: 'future_routine_event',
        createdAtUtc: '2026-10-15T12:00:00Z',
      },
    ])
    expect(
      browserNotificationSnapshot(client, i18n.t, false)
        .get('saved')
        ?.map((item) => item.id),
    ).toEqual(['saved:known'])
  })

  it('does not replay first loads or a newly selected game, but detects a new invitation', () => {
    const client = registrationClient()
    const initial = browserNotificationSnapshot(client, i18n.t, false)
    expect(newBrowserNotifications(new Map(), initial)).toEqual([])
    expect(newBrowserNotifications(initial, initial)).toEqual([])
    client.setQueryData(gameRegistrationSnapshotQueryOptions.queryKey, {
      gameId: 'game',
      myPendingInvitations: [{ invitationId: 'next', teamSlotIndex: 3 }],
    })
    const next = browserNotificationSnapshot(client, i18n.t, false)
    expect(newBrowserNotifications(initial, next).map((item) => item.id)).toEqual([
      'invitation:next',
    ])
    client.setQueryData(currentGameBoardQueryOptions.queryKey, { gameId: 'other', status: 'ready' })
    client.setQueryData(gameRegistrationSnapshotQueryOptions.queryKey, {
      gameId: 'other',
      myPendingInvitations: [{ invitationId: 'other-game', teamSlotIndex: 1 }],
    })
    expect(
      newBrowserNotifications(next, browserNotificationSnapshot(client, i18n.t, false)),
    ).toEqual([])
  })
})
