import type { buildGameManagementFlow } from '../../model/game-management-flow.ts'
import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton, NativeDisclosure, StatusBadge } from '../../../../shared/ui/index.ts'
import type { RoundActionModel } from '../../model/game-management-panel.ts'
import { ManagementControlSurface, ManagementSectionTitle } from './ManagementPanelSurfaces.tsx'

export function RoundAssistantSection({
  roundAction,
  flow,
  isChangingRoundStage,
}: {
  flow: ReturnType<typeof buildGameManagementFlow>
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
            {roundAction.statusLabel !== roundAction.title ? (
              <StatusBadge
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

        {roundAction.stepNumber ? (
          <NativeDisclosure
            summary={t('gameBoard.managementRoundStepProgress', {
              current: roundAction.stepNumber,
              total: flow.steps.length,
            })}
          >
            <Stack
              component="ol"
              spacing={1}
              aria-label={t('gameBoard.flowTitle')}
              sx={{ m: 0, pl: 3 }}
            >
              {flow.steps.map((step) => (
                <Box
                  component="li"
                  key={step.id}
                  aria-current={step.state === 'current' ? 'step' : undefined}
                >
                  <Stack
                    direction="row"
                    gap={1}
                    alignItems="baseline"
                    justifyContent="space-between"
                    flexWrap="wrap"
                  >
                    <Typography
                      variant="body2"
                      fontWeight={step.state === 'current' ? 700 : undefined}
                    >
                      {t(step.titleKey)}
                    </Typography>
                    <StatusBadge
                      size="small"
                      appearance="plain"
                      color={
                        step.state === 'current'
                          ? 'primary'
                          : step.state === 'complete'
                            ? 'success'
                            : 'default'
                      }
                      label={t(`gameBoard.flowStepState.${step.state}`)}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </NativeDisclosure>
        ) : null}

        {roundAction.actionLabel && roundAction.onAction ? (
          <AppButton
            tone={roundAction.actionTone}
            size="medium"
            fullWidth
            disabled={isChangingRoundStage}
            loading={isChangingRoundStage}
            onClick={roundAction.onAction}
          >
            {roundAction.actionLabel}
          </AppButton>
        ) : null}
      </Stack>
    </ManagementControlSurface>
  )
}
