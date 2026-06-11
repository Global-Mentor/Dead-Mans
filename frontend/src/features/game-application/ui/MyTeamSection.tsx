import { Chip, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { AppButton, SectionCard } from '../../../shared/ui/index.ts'
import { formatRegistrationTeamStatus } from '../../game-registration/index.ts'
import { TeamSummary } from './TeamSummary.tsx'

interface MyTeamSectionProps {
  team: RegistrationTeam
  onLeave: () => void
  isLeaving: boolean
}

export function MyTeamSection({ team, onLeave, isLeaving }: MyTeamSectionProps) {
  const { t } = useTranslation()

  return (
    <SectionCard>
      <Typography variant="subtitle1" gutterBottom>
        {t('gameApplication.myTeamTitle')}
      </Typography>
      <TeamSummary team={team} />
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Chip size="small" label={formatRegistrationTeamStatus(team.status, t)} />
        <AppButton tone="warningGhost" disabled={isLeaving} onClick={onLeave}>
          {t('gameApplication.leaveTeam')}
        </AppButton>
      </Stack>
    </SectionCard>
  )
}
