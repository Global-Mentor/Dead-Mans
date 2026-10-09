import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { HelpTooltip, LockIcon, StatusBadge } from '../../../shared/ui/index.ts'

export function AdminTeamNumber({ team }: { team: RegistrationTeam }) {
  const { t } = useTranslation()
  return (
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
  )
}
