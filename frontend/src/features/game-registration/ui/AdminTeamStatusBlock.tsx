import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { HelpTooltip } from '../../../shared/ui/index.ts'
import { formatRegistrationTeamStatus } from '../model/registration-team-status.ts'

export function AdminTeamStatusBlock({ team }: { team: RegistrationTeam }) {
  const { t } = useTranslation()
  const ready = team.status === 'forming' && team.isReady
  return (
    <Stack
      role="group"
      aria-label={t('teamRegistrations.status')}
      gap={0.25}
      sx={{ minWidth: 0, textAlign: 'right', overflowWrap: 'anywhere' }}
    >
      <Typography
        variant="caption"
        color={ready || team.status === 'confirmed' ? 'success.main' : 'text.secondary'}
      >
        {ready
          ? t('gameRegistration.teamStatus.ready')
          : formatRegistrationTeamStatus(team.status, t)}
      </Typography>
      {team.isActiveInGame || team.isPlayed ? (
        <Typography
          variant="caption"
          color={team.isActiveInGame ? 'warning.main' : 'text.secondary'}
        >
          {t(
            team.isActiveInGame
              ? 'gameApplication.adminPanel.activeTeamChip'
              : 'gameApplication.adminPanel.playedTeamChip',
          )}
        </Typography>
      ) : null}
      {team.disbandRequestedAtUtc ? (
        <HelpTooltip
          describeChild
          arrow
          title={
            team.disbandRequestedByDisplayName
              ? t('gameApplication.adminPanel.disbandRequestDescription', {
                  player: team.disbandRequestedByDisplayName,
                })
              : t('gameApplication.adminPanel.disbandRequestTitle')
          }
        >
          <Typography variant="caption" color="warning.main" tabIndex={0}>
            {t('gameApplication.adminPanel.disbandRequestedChip')}
          </Typography>
        </HelpTooltip>
      ) : null}
    </Stack>
  )
}
