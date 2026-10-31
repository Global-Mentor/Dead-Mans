import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { HelpTooltip, LockIcon, StatusBadge } from '../../../shared/ui/index.ts'

export function AdminTeamNumber({ team, capacity }: { team: RegistrationTeam; capacity: number }) {
  const { t } = useTranslation()
  return (
    <Stack direction="row" gap={0.5} alignItems="center" sx={{ minWidth: 0 }}>
      <StatusBadge
        density="compact"
        variant="outlined"
        textFlow="singleLine"
        aria-label={t('teamRegistrations.teamNumber', { slot: team.teamSlotIndex })}
        label={
          <Stack direction="row" gap={0.5} alignItems="center">
            {team.teamSlotIndex}
            {!team.recruitmentOpen ? (
              <HelpTooltip title={t('teamRegistrations.closedTeamHint')} describeChild arrow>
                <LockIcon
                  fontSize="inherit"
                  titleAccess={t('teamRegistrations.closedTeam')}
                  role="img"
                  aria-label={t('teamRegistrations.closedTeam')}
                  tabIndex={0}
                />
              </HelpTooltip>
            ) : null}
          </Stack>
        }
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ whiteSpace: 'nowrap' }}
        aria-label={t('teamRegistrations.rosterCount', {
          count: team.members.length,
          max: capacity,
        })}
      >
        {team.members.length}/{capacity}
      </Typography>
    </Stack>
  )
}
