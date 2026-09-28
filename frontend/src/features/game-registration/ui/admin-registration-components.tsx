import { Box, Stack, Typography } from '@mui/material'
import type { DragEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { RegistrationPlayer, RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { ActionIcon, HelpTooltip, StatusBadge } from '../../../shared/ui/index.ts'
import { formatRegistrationTeamStatus } from '../model/registration-team-status.ts'
import type { AdminInviteTeamTarget } from './AdminInvitePlayerDialog.tsx'
import { writeRegistrationDragPayload } from './admin-registration-support.ts'

export type OrderedAdminTeamEntry = AdminInviteTeamTarget

export function AdminRegistrationPlayerCard({
  player,
  compact = false,
  onDragStart,
  onDragEnd,
  actions,
  testId,
}: {
  player: RegistrationPlayer
  compact?: boolean
  onDragStart?: (event: DragEvent<HTMLElement>) => void
  onDragEnd?: () => void
  actions?: ReactNode
  testId?: string
}) {
  return (
    <Stack
      component="li"
      data-testid={testId}
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="space-between"
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      sx={(theme) => ({
        listStyle: 'none',
        minWidth: 0,
        py: compact ? 0.6 : 0.75,
        px: compact ? 0 : 0.5,
        borderBottom: `1px solid ${theme.palette.divider}`,
        cursor: onDragStart ? 'grab' : undefined,
        '&:last-child': {
          borderBottom: 0,
        },
      })}
    >
      <Stack direction="row" spacing={0.75} alignItems="baseline" sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap sx={{ minWidth: 0 }}>
          {player.displayName}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          @{player.login}
        </Typography>
      </Stack>
      {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
    </Stack>
  )
}

export function AdminRegistrationTeamHeaderChips({ team }: { team: RegistrationTeam }) {
  const { t } = useTranslation()
  const disbandRequestDescription = team.disbandRequestedAtUtc
    ? t('gameApplication.adminPanel.disbandRequestDescription', {
        player: team.disbandRequestedByDisplayName ?? t('gameApplication.unknownPlayer'),
      })
    : null

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
      <StatusBadge
        textFlow="singleLine"
        size="small"
        label={t('gameApplication.adminPanel.slotLabel', { slot: team.teamSlotIndex })}
        draggable
        onDragStart={(event) =>
          writeRegistrationDragPayload(event, { kind: 'team', teamId: team.teamId })
        }
        sx={{ cursor: 'grab' }}
      />
      <StatusBadge
        textFlow="singleLine"
        size="small"
        label={formatRegistrationTeamStatus(team.status, t)}
      />
      {team.isActiveInGame ? (
        <StatusBadge
          textFlow="singleLine"
          size="small"
          color="primary"
          label={t('gameApplication.adminPanel.activeTeamChip')}
        />
      ) : null}
      {team.isPlayed ? (
        <StatusBadge
          textFlow="singleLine"
          size="small"
          color="success"
          label={t('gameApplication.adminPanel.playedTeamChip')}
        />
      ) : null}
      {team.disbandRequestedAtUtc ? (
        <HelpTooltip title={disbandRequestDescription} describeChild arrow>
          <StatusBadge
            textFlow="singleLine"
            size="small"
            color="warning"
            label={t('gameApplication.adminPanel.disbandRequestedChip')}
            tabIndex={0}
          />
        </HelpTooltip>
      ) : null}
    </Stack>
  )
}

export function AdminRegistrationOperationalStatus({
  readyTeamsCount,
  availablePlayersCount,
  disbandRequestsCount,
  minPlayers,
  maxPlayers,
}: {
  readyTeamsCount: number
  availablePlayersCount: number
  disbandRequestsCount: number
  minPlayers: number
  maxPlayers: number
}) {
  const { t } = useTranslation()

  return (
    <Stack
      role="status"
      aria-label={t('gameApplication.adminPanel.statusStripLabel')}
      direction="row"
      spacing={0.75}
      flexWrap="wrap"
      useFlexGap
    >
      <HelpTooltip title={t('gameApplication.adminPanel.teamReadyHint')} describeChild arrow>
        <StatusBadge
          textFlow="singleLine"
          size="small"
          color={readyTeamsCount > 0 ? 'success' : 'default'}
          variant={readyTeamsCount > 0 ? 'filled' : 'outlined'}
          label={`${t('gameApplication.adminPanel.readyTeams')}: ${readyTeamsCount}`}
          tabIndex={0}
        />
      </HelpTooltip>
      <HelpTooltip
        title={t('gameApplication.adminPanel.availablePlayersDescription')}
        describeChild
        arrow
      >
        <StatusBadge
          textFlow="singleLine"
          size="small"
          variant="outlined"
          label={`${t('gameApplication.adminPanel.freePlayersStatus')}: ${availablePlayersCount}`}
          tabIndex={0}
        />
      </HelpTooltip>
      <HelpTooltip
        title={t('gameApplication.adminPanel.disbandRequestsAlertDescription')}
        describeChild
        arrow
      >
        <StatusBadge
          textFlow="singleLine"
          size="small"
          color={disbandRequestsCount > 0 ? 'warning' : 'default'}
          variant={disbandRequestsCount > 0 ? 'filled' : 'outlined'}
          label={`${t('gameApplication.adminPanel.disbandRequestsStatus')}: ${disbandRequestsCount}`}
          tabIndex={0}
        />
      </HelpTooltip>
      <HelpTooltip title={t('gameApplication.adminPanel.assignHint')} describeChild arrow>
        <StatusBadge
          textFlow="singleLine"
          size="small"
          variant="outlined"
          label={t('gameApplication.adminPanel.teamRulesStatus', {
            min: minPlayers,
            max: maxPlayers,
          })}
          tabIndex={0}
        />
      </HelpTooltip>
    </Stack>
  )
}

export function AdminRegistrationTeamNameSummary({ team }: { team: RegistrationTeam }) {
  const { t } = useTranslation()
  const currentName = team.name?.trim() ?? ''
  const fallbackName = t('common.teamWithSlot', { slot: team.teamSlotIndex })

  return (
    <Typography variant="subtitle1" fontWeight={700} noWrap>
      {currentName || fallbackName}
    </Typography>
  )
}

export function AdminRegistrationTeamReorderButton({
  label,
  disabled,
  direction,
  onClick,
}: {
  label: string
  disabled: boolean
  direction: 'up' | 'down'
  onClick: () => void
}) {
  return (
    <HelpTooltip title={label} placement="right">
      <span>
        <ActionIcon
          size="small"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          appearance="outlined"
        >
          <Box component="span" aria-hidden sx={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
            {direction === 'up' ? '↑' : '↓'}
          </Box>
        </ActionIcon>
      </span>
    </HelpTooltip>
  )
}
