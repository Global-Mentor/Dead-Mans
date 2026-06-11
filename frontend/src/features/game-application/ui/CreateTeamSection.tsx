import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton, SectionCard } from '../../../shared/ui/index.ts'

interface CreateTeamSectionProps {
  onCreate: (recruitmentOpen: boolean) => void
  isCreating: boolean
}

export function CreateTeamSection({ onCreate, isCreating }: CreateTeamSectionProps) {
  const { t } = useTranslation()

  return (
    <SectionCard sx={{ mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {t('gameApplication.createTeamTitle')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <AppButton disabled={isCreating} onClick={() => onCreate(true)}>
          {t('gameApplication.createOpenTeam')}
        </AppButton>
        <AppButton tone="secondary" disabled={isCreating} onClick={() => onCreate(false)}>
          {t('gameApplication.createClosedTeam')}
        </AppButton>
      </Stack>
    </SectionCard>
  )
}
