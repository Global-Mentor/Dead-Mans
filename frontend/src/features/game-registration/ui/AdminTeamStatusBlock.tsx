import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { HelpTooltip, SectionCard, StatusBadge } from '../../../shared/ui/index.ts'
import { formatRegistrationTeamStatus } from '../model/registration-team-status.ts'

export function AdminTeamStatusBlock({
  team,
  reserveSpace = true,
}: {
  team: RegistrationTeam
  reserveSpace?: boolean
}) {
  const { t } = useTranslation()
  return (
    <SectionCard surface="inset" sx={{ p: 0.75, minWidth: 0 }}>
      <Stack
        role="group"
        aria-label={t('teamRegistrations.status')}
        gap={0.5}
        sx={{ minHeight: reserveSpace ? 52 : 0 }}
      >
        <StatusBadge
          textFlow="singleLine"
          color={team.status === 'confirmed' ? 'success' : 'default'}
          variant={team.status === 'confirmed' ? 'filled' : 'outlined'}
          label={formatRegistrationTeamStatus(team.status, t)}
        />
        {team.isActiveInGame || team.isPlayed ? (
          <StatusBadge
            textFlow="singleLine"
            color={team.isActiveInGame ? 'warning' : 'default'}
            variant="outlined"
            label={t(
              team.isActiveInGame
                ? 'gameApplication.adminPanel.activeTeamChip'
                : 'gameApplication.adminPanel.playedTeamChip',
            )}
          />
        ) : null}
        {team.disbandRequestedAtUtc ? (
          <HelpTooltip
            title={
              team.disbandRequestedByDisplayName
                ? t('gameApplication.adminPanel.disbandRequestDescription', {
                    player: team.disbandRequestedByDisplayName,
                  })
                : t('gameApplication.adminPanel.disbandRequestTitle')
            }
            describeChild
            arrow
          >
            <StatusBadge
              tabIndex={0}
              textFlow="singleLine"
              color="warning"
              variant="outlined"
              label={t('gameApplication.adminPanel.disbandRequestedChip')}
            />
          </HelpTooltip>
        ) : null}
      </Stack>
    </SectionCard>
  )
}
