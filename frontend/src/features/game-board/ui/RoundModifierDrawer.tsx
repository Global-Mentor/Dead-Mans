import { Stack, Typography } from '@mui/material'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameModifierState } from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  AsyncSection,
  PanelTrigger,
  SectionCard,
  SidePanel,
} from '../../../shared/ui/index.ts'
import { RoundModifierPanel } from './RoundModifierPanel.tsx'

/** Mounted for one ordering phase; reopening ordering starts a fresh drawer session. */
export function RoundModifierDrawer({
  roundId,
  state,
  isLoading,
  isError,
  isRefreshing,
  onRetry,
}: {
  roundId: string
  state: GameModifierState | null
  isLoading: boolean
  isError: boolean
  isRefreshing: boolean
  onRetry: () => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [open, setOpen] = useState(true)
  return (
    <>
      <PanelTrigger
        placement="responsiveEdge"
        size="medium"
        tabSize="extended"
        side="left"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(true)}
      >
        {t('gameBoard.currentRoundScreen.openModifiers')}
      </PanelTrigger>
      <SidePanel
        id={id}
        open={open}
        onClose={() => setOpen(false)}
        title={t('gameBoard.currentRoundScreen.drawerTitle')}
        label={t('common.entities.modifiers')}
        closeLabel={t('gameBoard.currentRoundScreen.closeModifiers')}
        side="left"
        width={560}
        contentDensity="compact"
        bodyTestId="round-modifier-scroll-body"
        header={
          <SectionCard
            surface="inset"
            sx={{ mt: 1.5, px: 1, py: 0.25 }}
            data-testid="round-modifier-balance"
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              gap={1}
              sx={{ minWidth: 0 }}
            >
              <Typography
                component="p"
                variant="body1"
                color="primary.light"
                fontWeight={700}
                sx={{ fontSize: 18 }}
              >
                {t('gameBoard.currentRoundScreen.drawerPointsLabel')}
              </Typography>
              <Typography component="p" variant="caption" color="text.secondary" fontWeight={400}>
                {state
                  ? t('gameModifiers.myPointsValue', { points: state.availableQuizPoints })
                  : '-'}
              </Typography>
            </Stack>
          </SectionCard>
        }
      >
        <AsyncSection
          isLoading={isLoading}
          isError={isError}
          hasData={state !== null}
          isEmpty={state === null}
          loadingMessage={t('gameModifiers.loading')}
          errorMessage={t('gameModifiers.errorLoading')}
          emptyMessage={t('gameModifiers.noGame')}
          retryAction={
            <AppButton tone="secondary" size="small" onClick={onRetry}>
              {t('common.actions.retry')}
            </AppButton>
          }
        >
          {state ? (
            <RoundModifierPanel
              state={state}
              roundId={roundId}
              disabled={isError || isRefreshing}
            />
          ) : null}
        </AsyncSection>
      </SidePanel>
    </>
  )
}
