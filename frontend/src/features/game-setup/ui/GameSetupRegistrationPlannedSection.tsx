import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton, FormTextField, PlannedFeatureFormShell, PlannedFeatureRoadmap } from '../../../shared/ui/index.ts'
import { gameSetupPlannedRoadmap } from '../game-setup-planned-features.ts'

export function GameSetupRegistrationPlannedSection() {
  const { t } = useTranslation()

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <PlannedFeatureFormShell
        titleKey="plannedFeatures.gameSetup.form.registrationTitle"
        descriptionKey="plannedFeatures.gameSetup.form.registrationDescription"
      >
        <Stack spacing={2}>
          <FormTextField
            label={t('plannedFeatures.gameSetup.form.teamSlotCount')}
            type="number"
            disabled
            defaultValue={6}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField
              label={t('plannedFeatures.gameSetup.form.minPlayers')}
              type="number"
              disabled
              defaultValue={1}
            />
            <FormTextField
              label={t('plannedFeatures.gameSetup.form.maxPlayers')}
              type="number"
              disabled
              defaultValue={3}
            />
          </Stack>
          <FormTextField
            label={t('plannedFeatures.gameSetup.form.reservedSlots')}
            placeholder={t('plannedFeatures.gameSetup.form.reservedSlotsPlaceholder')}
            disabled
            multiline
            minRows={2}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <AppButton disabled fullWidth>
              {t('plannedFeatures.gameSetup.form.openRegistration')}
            </AppButton>
            <AppButton tone="secondary" disabled fullWidth>
              {t('plannedFeatures.gameSetup.form.startGame')}
            </AppButton>
          </Stack>
        </Stack>
      </PlannedFeatureFormShell>
      <PlannedFeatureRoadmap items={gameSetupPlannedRoadmap} />
    </Stack>
  )
}
