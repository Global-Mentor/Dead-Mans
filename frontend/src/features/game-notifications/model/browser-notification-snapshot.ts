import type { TFunction } from 'i18next'
import type { QueryClient } from '@tanstack/react-query'
import { currentGameBoardQueryOptions } from '../../game-board/index.ts'
import {
  gameRegistrationSnapshotQueryOptions,
  gameRegistrationAdminSnapshotQueryOptions,
} from '../../game-registration/index.ts'
import { gameNotificationsQueryOptions } from '../api/game-notification-queries.ts'
import {
  getGameNotificationTitle,
  getGameNotificationDescription,
} from './game-notification-content.ts'
import type { BrowserNotificationItem } from '../browser/browser-notification-delivery.ts'

export function browserNotificationSnapshot(
  client: QueryClient,
  t: TFunction,
  canSeeStaff: boolean,
) {
  const items = new Map<string, BrowserNotificationItem[]>()
  const game = client.getQueryData(currentGameBoardQueryOptions.queryKey)
  const saved = client.getQueryState(gameNotificationsQueryOptions.queryKey)
  if (saved?.status === 'success') {
    items.set(
      'saved',
      (saved.data ?? [])
        .filter((notice) =>
          [
            'modifier_cancelled',
            'team_rejected',
            'team_member_assigned',
            'team_member_transferred',
            'team_member_removed',
            'team_disbanded',
          ].includes(notice.type),
        )
        .map((notice) => ({
          id: `saved:${notice.notificationId}`,
          title: getGameNotificationTitle(t, notice),
          body: getGameNotificationDescription(t, notice),
          path:
            notice.type === 'modifier_cancelled'
              ? '/panel/game-modifiers'
              : '/panel/game-application',
        })),
    )
  }
  const registration = client.getQueryState(gameRegistrationSnapshotQueryOptions.queryKey)
  if (
    game?.status === 'ready' &&
    registration?.status === 'success' &&
    registration.data?.gameId === game.gameId
  ) {
    items.set(
      `invitations:${game.gameId}`,
      registration.data.myPendingInvitations.map((invite) => ({
        id: `invitation:${invite.invitationId}`,
        title: t('navigation.invitationItemTitle', {
          player: invite.invitedByDisplayName ?? t('navigation.someone'),
        }),
        body: t('navigation.invitationItemDescription', { slot: invite.teamSlotIndex }),
        path: '/panel/game-application',
      })),
    )
  }
  const admin = client.getQueryState(gameRegistrationAdminSnapshotQueryOptions.queryKey)
  if (
    canSeeStaff &&
    (game?.status === 'ready' || game?.status === 'active') &&
    admin?.status === 'success' &&
    admin.data?.gameId === game.gameId
  ) {
    items.set(
      `disband:${game.gameId}`,
      admin.data.teams
        .filter((team) => team.status === 'confirmed' && team.disbandRequestedAtUtc != null)
        .map((team) => ({
          id: `disband:${team.teamId}:${team.disbandRequestedAtUtc}`,
          title: t('navigation.disbandRequestItemTitle', {
            player: team.disbandRequestedByDisplayName ?? t('navigation.someone'),
          }),
          body: t('navigation.disbandRequestItemDescription', { slot: team.teamSlotIndex }),
          path: '/panel/team-registrations',
        })),
    )
  }
  return items
}

export function newBrowserNotifications(
  before: ReturnType<typeof browserNotificationSnapshot>,
  after: ReturnType<typeof browserNotificationSnapshot>,
) {
  return [...after.entries()].flatMap(([source, items]) => {
    const previous = before.get(source)
    if (!previous) return [] // First successful load is a baseline, not a live event.
    const known = new Set(previous.map((item) => item.id))
    return items.filter((item) => !known.has(item.id))
  })
}
