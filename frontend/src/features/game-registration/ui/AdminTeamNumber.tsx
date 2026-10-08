import { Stack, SvgIcon } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { HelpTooltip, StatusBadge } from '../../../shared/ui/index.ts'

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
              <SvgIcon
                fontSize="inherit"
                titleAccess={t('teamRegistrations.closedTeam')}
                role="img"
                aria-label={t('teamRegistrations.closedTeam')}
                tabIndex={0}
              >
                <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2ZM10 6a2 2 0 0 1 4 0v2h-4v-2Zm3 10v2h-2v-2a2 2 0 1 1 2 0Z" />
              </SvgIcon>
            </HelpTooltip>
          ) : null}
        </Stack>
      }
    />
  )
}
