import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { formatRegistrationTeamStatus } from '../../game-registration/index.ts'
import { getTeamFreePlaces, isTeamJoinable } from '../model/team-availability.ts'

interface TeamSummaryProps {
  team: RegistrationTeam
  capacity: number
  action?: ReactNode
  showStatus?: boolean
  showNameLabel?: boolean
}

export function TeamSummary({
  team,
  capacity,
  action,
  showStatus = true,
  showNameLabel = false,
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
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: action ? 'minmax(0, 1fr) auto' : 'minmax(0, 1fr)',
        },
        gap: 1.25,
        alignItems: 'center',
        minWidth: 0,
      }}
    >
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="space-between"
          alignItems="baseline"
          flexWrap="wrap"
          useFlexGap
        >
          <Typography
            component="h3"
            variant="h6"
            sx={{ fontSize: 24, lineHeight: 1.15, overflowWrap: 'anywhere' }}
          >
            {showNameLabel ? (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                {t('gameApplication.teamNameLabel')}
              </Typography>
            ) : null}
            <Box component="span" sx={{ color: showNameLabel ? 'primary.light' : 'inherit' }}>
              {team.name?.trim() || t('gameApplication.unnamedTeam')}
            </Box>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {t('gameApplication.rosterCapacity', { count: team.members.length, max: capacity })}
          </Typography>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="space-between"
          alignItems="baseline"
          flexWrap="wrap"
          useFlexGap
        >
          <Box
            component="ul"
            sx={{
              m: 0,
              p: 0,
              listStyle: 'none',
              display: 'grid',
              gap: 0.75,
              '& > li': {
                display: 'flex',
                gap: 1.25,
                alignItems: 'flex-start',
                minWidth: 0,
                maxWidth: '100%',
                overflowWrap: 'anywhere',
              },
              '& > li::before': {
                content: '""',
                width: 5,
                height: 5,
                mt: '0.6em',
                flexShrink: 0,
                transform: 'rotate(45deg)',
                bgcolor: 'primary.main',
              },
            }}
          >
            {team.members.map(({ player }) => (
              <Box component="li" key={player.userId}>
                <Typography component="span" variant="body2">
                  {player.displayName}
                </Typography>
              </Box>
            ))}
            {pending.map((invitation) => (
              <Box component="li" key={invitation.invitationId}>
                <Typography component="span" variant="body2" color="text.secondary">
                  {t('gameApplication.pendingInvitedPlayerChip', {
                    player: invitation.player.displayName,
                  })}
                </Typography>
              </Box>
            ))}
            {team.members.length === 0 && pending.length === 0 ? (
              <li>
                <Typography component="span" variant="body2" color="text.secondary">
                  {t('gameApplication.emptyTeamMembers')}
                </Typography>
              </li>
            ) : null}
          </Box>
          <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
            {showStatus ? (
              <Typography variant="caption" color={isOpen ? 'primary.light' : 'text.secondary'}>
                {state}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </Stack>
      {action ? <Box sx={{ justifySelf: 'end' }}>{action}</Box> : null}
    </Box>
  )
}
