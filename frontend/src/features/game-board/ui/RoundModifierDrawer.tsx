import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameModifierState } from '../../../shared/api/contracts/index.ts'
import { AppButton, AsyncSection, PanelTrigger, SidePanel } from '../../../shared/ui/index.ts'
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
        title={t('common.entities.modifiers')}
        closeLabel={t('gameBoard.currentRoundScreen.closeModifiers')}
        side="left"
        width="wide"
        contentDensity="compact"
        bodyTestId="round-modifier-scroll-body"
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
            <AppButton size="small" onClick={onRetry}>
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
