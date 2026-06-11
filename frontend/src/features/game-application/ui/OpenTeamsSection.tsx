import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { AppButton, SectionCard } from '../../../shared/ui/index.ts'
import { TeamSummary } from './TeamSummary.tsx'

interface OpenTeamsSectionProps {
  teams: RegistrationTeam[]
  onJoin: (teamId: string) => void
  joiningTeamId: string | undefined
}

export function OpenTeamsSection({ teams, onJoin, joiningTeamId }: OpenTeamsSectionProps) {
  const { t } = useTranslation()

  if (teams.length === 0) {
    return null
  }

  return (
    <SectionCard>
      <Typography variant="subtitle1" gutterBottom>
        {t('gameApplication.openTeamsTitle')}
      </Typography>
      <Stack spacing={2}>
        {teams.map((team) => (
          <Stack
            key={team.teamId}
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
          >
            <TeamSummary team={team} />
            <AppButton disabled={joiningTeamId === team.teamId} onClick={() => onJoin(team.teamId)}>
              {t('gameApplication.joinTeam')}
            </AppButton>
          </Stack>
        ))}
      </Stack>
    </SectionCard>
  )
}
