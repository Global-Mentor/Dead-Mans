import { Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { StatusBadge } from '../../../shared/ui/index.ts'
import { TeamPresentation } from '../../../shared/game-ui/index.ts'
import {
  formatRegistrationTeamStatus,
  RegistrationTeamMarker,
} from '../../game-registration/index.ts'
import { getTeamFreePlaces, isTeamJoinable } from '../model/team-availability.ts'

interface TeamSummaryProps {
  team: RegistrationTeam
  capacity: number
  action?: ReactNode
  nameAction?: ReactNode
  showStatus?: boolean
}

export function TeamSummary({
  team,
  capacity,
  action,
  nameAction,
  showStatus = true,
}: TeamSummaryProps) {
  const { t } = useTranslation()
  const pending = team.pendingInvitations ?? []
  const freePlaces = getTeamFreePlaces(team, capacity)
  const isOpen = isTeamJoinable(team, capacity)
  const state =
    team.status !== 'forming'
      ? formatRegistrationTeamStatus(team.status, t)
      : freePlaces === 0
        ? t('gameApplication.teamFull')
        : t(
            team.recruitmentOpen
              ? 'gameApplication.recruitmentOpen'
              : 'gameApplication.recruitmentClosed',
          )

  return (
    <TeamPresentation
      name={team.name?.trim() || t('gameApplication.unnamedTeam')}
      emptyLabel={t('gameApplication.emptyTeamMembers')}
      leading={<RegistrationTeamMarker team={team} capacity={capacity} showNumber={false} />}
      status={
        showStatus ? (
          <Typography
            variant="caption"
            color={
              isOpen
                ? 'primary.light'
                : team.status === 'confirmed'
                  ? 'success.main'
                  : 'text.secondary'
            }
          >
            {state}
          </Typography>
        ) : null
      }
      members={[
        ...team.members.map(({ player, readyAtUtc }) => ({
          id: player.userId,
          name: player.displayName,
          detail: (
            <StatusBadge
              density="tight"
              size="small"
              color={readyAtUtc ? 'success' : 'default'}
              variant={readyAtUtc ? 'filled' : 'outlined'}
              label={t(
                readyAtUtc ? 'gameApplication.playerReady' : 'gameApplication.playerNotReady',
              )}
            />
          ),
        })),
        ...pending.map((invitation) => ({
          id: invitation.invitationId,
          name: t('gameApplication.pendingInvitedPlayerChip', {
            player: invitation.player.displayName,
          }),
          pending: true,
        })),
      ]}
      actions={
        nameAction || action ? (
          <>
            {nameAction}
            {action}
          </>
        ) : null
      }
    />
  )
}
