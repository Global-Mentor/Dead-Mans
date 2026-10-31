import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { HelpTooltip, LockIcon, StatusBadge } from '../../../shared/ui/index.ts'

export function RegistrationTeamMarker({
  team,
  capacity,
  showNumber = true,
}: {
  team: RegistrationTeam
  capacity: number
  showNumber?: boolean
}) {
  const { t } = useTranslation()
  const closedMarker = !team.recruitmentOpen ? (
    <HelpTooltip title={t('gameRegistration.closedTeamHint')} describeChild arrow>
      <LockIcon
        fontSize="inherit"
        titleAccess={t('gameRegistration.closedTeam')}
        role="img"
        aria-label={t('gameRegistration.closedTeam')}
        tabIndex={0}
      />
    </HelpTooltip>
  ) : null
  return (
    <Stack direction="row" gap={0.5} alignItems="center" sx={{ minWidth: 0 }}>
      {showNumber || closedMarker ? (
        <StatusBadge
          density="compact"
          variant="outlined"
          textFlow="singleLine"
          aria-label={t(
            showNumber ? 'gameRegistration.teamNumber' : 'gameRegistration.closedTeam',
            { slot: team.teamSlotIndex },
          )}
          label={
            <Stack direction="row" gap={0.5} alignItems="center">
              {showNumber ? team.teamSlotIndex : null}
              {closedMarker}
            </Stack>
          }
        />
      ) : null}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ whiteSpace: 'nowrap' }}
        aria-label={t('gameRegistration.rosterCount', {
          count: team.members.length,
          max: capacity,
        })}
      >
        {team.members.length}/{capacity}
      </Typography>
    </Stack>
  )
}
