import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { HelpTooltip, StatusBadge } from '../../../shared/ui/index.ts'
import { formatRegistrationTeamStatus } from '../model/registration-team-status.ts'

export function AdminTeamStatusBlock({ team }: { team: RegistrationTeam }) {
  const { t } = useTranslation()
  const ready = team.status === 'forming' && team.isReady
  return (
    <Stack
      role="group"
      aria-label={t('teamRegistrations.status')}
      gap={0.5}
      alignItems="flex-end"
      sx={{ minWidth: 0, textAlign: 'right', overflowWrap: 'anywhere' }}
    >
      <StatusBadge
        size="small"
        density="tight"
        variant="outlined"
        color={
          ready || team.status === 'confirmed'
            ? 'success'
            : team.status === 'forming'
              ? 'warning'
              : 'error'
        }
        label={
          ready
            ? t('gameRegistration.teamStatus.ready')
            : formatRegistrationTeamStatus(team.status, t)
        }
      />
      {team.isActiveInGame || team.isPlayed ? (
        <StatusBadge
          size="small"
          density="tight"
          variant="outlined"
          color={team.isActiveInGame ? 'warning' : 'default'}
          label={t(
            team.isActiveInGame
              ? 'gameApplication.adminPanel.activeTeamChip'
              : 'gameApplication.adminPanel.playedTeamChip',
          )}
        />
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
          <StatusBadge
            size="small"
            density="tight"
            variant="outlined"
            color="error"
            tabIndex={0}
            label={t('gameApplication.adminPanel.disbandRequestedChip')}
          />
        </HelpTooltip>
      ) : null}
    </Stack>
  )
}
