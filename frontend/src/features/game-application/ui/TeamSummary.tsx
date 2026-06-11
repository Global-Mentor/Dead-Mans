import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'

export function TeamSummary({ team }: { team: RegistrationTeam }) {
  const { t } = useTranslation()

  return (
    <Box>
      <Typography variant="body2">
        {t('gameApplication.teamSlot', {
          slot: team.slotIndex,
          count: team.members.length,
        })}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {team.members.map((member) => member.player.displayName).join(', ')}
      </Typography>
    </Box>
  )
}
