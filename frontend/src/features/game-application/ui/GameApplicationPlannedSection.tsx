import { Chip, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton, PlannedFeatureFormShell, PlannedFeatureRoadmap, SectionCard } from '../../../shared/ui/index.ts'
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
            <SectionCard
              key={slot}
              variantStyle="dashed"
              sx={{
                p: 1.5,
                minWidth: 88,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" display="block">
                {t('plannedFeatures.gameApplication.form.slotLabel', { slot })}
              </Typography>
              <Chip size="small" label={t('plannedFeatures.gameApplication.form.slotFree')} />
            </SectionCard>
          ))}
        </Stack>
      </PlannedFeatureFormShell>

      <PlannedFeatureFormShell
        titleKey="plannedFeatures.gameApplication.form.memberInviteTitle"
        descriptionKey="plannedFeatures.gameApplication.form.memberInviteDescription"
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <AppButton tone="secondary" disabled fullWidth>
            {t('plannedFeatures.gameApplication.form.inviteTeammate')}
          </AppButton>
          <AppButton tone="ghost" disabled fullWidth>
            {t('plannedFeatures.gameApplication.form.submitForReview')}
          </AppButton>
        </Stack>
      </PlannedFeatureFormShell>

      <PlannedFeatureRoadmap items={gameApplicationPlannedRoadmap} />
    </Stack>
  )
}
