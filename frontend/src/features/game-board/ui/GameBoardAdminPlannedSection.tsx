import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton, PlannedFeatureFormShell, PlannedFeatureRoadmap } from '../../../shared/ui/index.ts'
import { gameBoardPlannedRoadmap } from '../game-board-planned-features.ts'

export function GameBoardAdminPlannedSection() {
  const { t } = useTranslation()

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <PlannedFeatureFormShell
        titleKey="plannedFeatures.gameBoard.form.lifecycleTitle"
        descriptionKey="plannedFeatures.gameBoard.form.lifecycleDescription"
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
          <AppButton disabled sx={{ flex: 1 }}>
            {t('plannedFeatures.gameBoard.form.openRegistration')}
          </AppButton>
          <AppButton tone="success" disabled sx={{ flex: 1 }}>
            {t('plannedFeatures.gameBoard.form.startGame')}
          </AppButton>
          <AppButton tone="warningGhost" disabled sx={{ flex: 1 }}>
            {t('plannedFeatures.gameBoard.form.finishGame')}
          </AppButton>
        </Stack>
      </PlannedFeatureFormShell>
      <PlannedFeatureRoadmap items={gameBoardPlannedRoadmap} />
    </Stack>
  )
}
