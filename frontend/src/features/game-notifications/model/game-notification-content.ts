import type { TFunction } from 'i18next'
import type { GameUserNotification } from '../../../shared/api/contracts/index.ts'

export function getGameNotificationTitle(t: TFunction, notification: GameUserNotification) {
  switch (notification.type) {
    case 'team_member_assigned':
      return t('navigation.teamMemberAssignedTitle')
    case 'team_member_transferred':
      return t('navigation.teamMemberTransferredTitle')
    case 'team_member_removed':
      return t('navigation.teamMemberRemovedTitle')
    case 'team_disbanded':
      return t('navigation.teamDisbandedTitle')
    case 'team_rejected':
      return t('navigation.teamRejectedItemTitle', {
        team: notification.teamName ?? t('navigation.teamFallback'),
      })
    case 'modifier_cancelled':
      return t('navigation.modifierCancelledItemTitle', {
        modifier: notification.modifierName ?? t('navigation.modifierFallback'),
      })
    default:
      return t('navigation.genericNotificationTitle')
  }
}

export function getGameNotificationDescription(t: TFunction, notification: GameUserNotification) {
  const teamLabel = (name: string | null | undefined, slot: number | null | undefined) =>
    name
      ? t('navigation.notificationTeamName', { name })
      : slot != null
        ? t('navigation.notificationTeamSlot', { slot })
        : t('navigation.teamFallback')
  const teams = {
    team: teamLabel(notification.teamName, notification.teamSlotIndex),
    previousTeam: teamLabel(notification.previousTeamName, notification.previousTeamSlotIndex),
  }
  switch (notification.type) {
    case 'team_member_assigned':
      return t('navigation.teamMemberAssignedDescription', teams)
    case 'team_member_transferred':
      return t('navigation.teamMemberTransferredDescription', teams)
    case 'team_member_removed':
      return t('navigation.teamMemberRemovedDescription', teams)
    case 'team_disbanded':
      return t('navigation.teamDisbandedDescription', teams)
    case 'team_rejected':
      return t('navigation.teamRejectedItemDescription')
    case 'modifier_cancelled':
      return t('navigation.modifierCancelledItemDescription', {
        player: notification.actorDisplayName ?? t('navigation.someone'),
        points: notification.quizPointsDelta ?? 0,
      })
    default:
      return t('navigation.genericNotificationDescription')
  }
}
