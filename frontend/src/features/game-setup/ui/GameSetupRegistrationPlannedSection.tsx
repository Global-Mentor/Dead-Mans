import { Button, Stack, TextField } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { PlannedFeatureFormShell } from '../../../shared/ui/PlannedFeatureFormShell.tsx'
import { PlannedFeatureRoadmap } from '../../../shared/ui/PlannedFeatureRoadmap.tsx'
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
          <TextField
            label={t('plannedFeatures.gameSetup.form.teamSlotCount')}
            type="number"
            size="small"
            disabled
            defaultValue={6}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('plannedFeatures.gameSetup.form.minPlayers')}
              type="number"
              size="small"
              disabled
              defaultValue={1}
              fullWidth
            />
            <TextField
              label={t('plannedFeatures.gameSetup.form.maxPlayers')}
              type="number"
              size="small"
              disabled
              defaultValue={3}
              fullWidth
            />
          </Stack>
          <TextField
            label={t('plannedFeatures.gameSetup.form.reservedSlots')}
            placeholder={t('plannedFeatures.gameSetup.form.reservedSlotsPlaceholder')}
            size="small"
            disabled
            fullWidth
            multiline
            minRows={2}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="contained" disabled fullWidth>
              {t('plannedFeatures.gameSetup.form.openRegistration')}
            </Button>
            <Button variant="outlined" disabled fullWidth>
              {t('plannedFeatures.gameSetup.form.startGame')}
            </Button>
          </Stack>
        </Stack>
      </PlannedFeatureFormShell>
      <PlannedFeatureRoadmap items={gameSetupPlannedRoadmap} />
    </Stack>
  )
}
