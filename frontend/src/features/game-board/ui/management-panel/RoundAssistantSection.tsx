import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton, StatusBadge, StepDisclosure } from '../../../../shared/ui/index.ts'
import type { buildGameManagementFlow } from '../../model/game-management-flow.ts'
import type { RoundActionModel } from '../../model/game-management-panel.ts'
import {
  ManagementControlSurface,
  ManagementSectionTitle,
  ManagementStateNotice,
} from './ManagementPanelSurfaces.tsx'

export function RoundAssistantSection({
  roundAction,
  flow,
  isChangingRoundStage,
  errorMessage,
}: {
  roundAction: RoundActionModel
  flow: ReturnType<typeof buildGameManagementFlow>
  isChangingRoundStage: boolean
  errorMessage: string | null
}) {
  const { t } = useTranslation()

  return (
    <ManagementControlSurface kind="round">
      <Stack spacing={1}>
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
            title={t('gameBoard.managementRoundTitle')}
            help={t('gameBoard.managementHelp.round')}
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

        <StepDisclosure
          data-testid="management-round-phase"
          summary={roundAction.title}
          label={t('gameBoard.managementRoundTitle')}
          currentBadge={t('gameBoard.flowStepState.current')}
          items={flow.steps.map((step) => ({
            id: step.id,
            label: t(step.titleKey),
            state: step.state,
          }))}
        />

        {errorMessage ? (
          <ManagementStateNotice tone="error">{errorMessage}</ManagementStateNotice>
        ) : null}

        {roundAction.actionLabel && roundAction.onAction ? (
          <AppButton
            tone={roundAction.actionTone}
            size="small"
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
