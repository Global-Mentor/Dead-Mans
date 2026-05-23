import { Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { PlannedFeatureFormShell } from '../../../shared/ui/PlannedFeatureFormShell.tsx'
import { PlannedFeatureRoadmap } from '../../../shared/ui/PlannedFeatureRoadmap.tsx'
import { gameApplicationPlannedRoadmap } from '../game-application-planned-features.ts'

export function GameApplicationPlannedSection() {
  const { t } = useTranslation()

  return (
    <Stack spacing={2} sx={{ mt: 3 }}>
      <PlannedFeatureFormShell
        titleKey="plannedFeatures.gameApplication.form.slotsTitle"
        descriptionKey="plannedFeatures.gameApplication.form.slotsDescription"
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {[1, 2, 3, 4, 5, 6].map((slot) => (
            <Paper
              key={slot}
              variant="outlined"
              sx={{
                p: 1.5,
                minWidth: 88,
                textAlign: 'center',
                borderStyle: 'dashed',
              }}
            >
              <Typography variant="caption" display="block">
                {t('plannedFeatures.gameApplication.form.slotLabel', { slot })}
              </Typography>
              <Chip size="small" label={t('plannedFeatures.gameApplication.form.slotFree')} />
            </Paper>
          ))}
        </Stack>
      </PlannedFeatureFormShell>

      <PlannedFeatureFormShell
        titleKey="plannedFeatures.gameApplication.form.memberInviteTitle"
        descriptionKey="plannedFeatures.gameApplication.form.memberInviteDescription"
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="outlined" disabled fullWidth>
            {t('plannedFeatures.gameApplication.form.inviteTeammate')}
          </Button>
          <Button variant="text" disabled fullWidth>
            {t('plannedFeatures.gameApplication.form.submitForReview')}
          </Button>
        </Stack>
      </PlannedFeatureFormShell>

      <PlannedFeatureRoadmap items={gameApplicationPlannedRoadmap} />
    </Stack>
  )
}
