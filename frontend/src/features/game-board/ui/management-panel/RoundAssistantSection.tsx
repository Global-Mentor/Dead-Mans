import { Box, Chip, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton } from '../../../../shared/ui/index.ts'
import type { RoundActionModel } from '../../model/game-management-panel.ts'
import { ManagementControlSurface, ManagementSectionTitle } from './ManagementPanelSurfaces.tsx'

export function RoundAssistantSection({
  roundAction,
  isChangingRoundStage,
}: {
  roundAction: RoundActionModel
  isChangingRoundStage: boolean
}) {
  const { t } = useTranslation()

  return (
    <ManagementControlSurface kind="round">
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          gap={1}
          flexWrap="wrap"
          useFlexGap
          alignItems="center"
          justifyContent="space-between"
        >
          <ManagementSectionTitle
            icon="round"
            title={t('gameBoard.managementRoundAssistantTitle')}
            tooltip={t('gameBoard.managementRoundAssistantTooltip')}
          />
          <Stack direction="row" spacing={0.55} alignItems="center" flexWrap="wrap" useFlexGap>
            {roundAction.stepNumber ? (
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {t('gameBoard.managementRoundStepProgress', {
                  current: roundAction.stepNumber,
                  total: 6,
                })}
              </Typography>
            ) : null}
            {roundAction.statusLabel !== roundAction.title ? (
              <Chip
                size="small"
                color={roundAction.statusTone}
                variant="outlined"
                label={roundAction.statusLabel}
              />
            ) : null}
          </Stack>
        </Stack>

        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={750}
            sx={{ fontSize: 25, lineHeight: 1.15, overflowWrap: 'anywhere' }}
          >
            {roundAction.title}
          </Typography>
          {roundAction.description &&
          (roundAction.stepId !== 'select_team' || roundAction.actionLabel) ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {roundAction.description}
            </Typography>
          ) : null}
        </Box>

        {roundAction.actionLabel && roundAction.onAction ? (
          <AppButton
            tone={roundAction.actionTone}
            size="medium"
            fullWidth
            disabled={isChangingRoundStage}
            onClick={roundAction.onAction}
            sx={{ minHeight: 46, fontWeight: 850 }}
          >
            {roundAction.actionLabel}
          </AppButton>
        ) : null}
      </Stack>
    </ManagementControlSurface>
  )
}
