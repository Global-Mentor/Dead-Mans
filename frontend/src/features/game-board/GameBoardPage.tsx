import { Chip, Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { gameApplicationRoute } from '../../routes/app-routes.ts'
import {
  AppLinkButton,
  AppToast,
  ConfirmDialog,
  PageShell,
  PageStatePanel,
  SectionCard,
  SectionHeader,
} from '../../shared/ui/index.ts'
import { GameBoardGrid } from './ui/GameBoardGrid.tsx'
import { useGameBoardPage } from './use-game-board-page.ts'
import { useOpenGameBoardCell } from './use-open-game-board-cell.ts'
import { GameBoardAdminPlannedSection } from './ui/GameBoardAdminPlannedSection.tsx'
import { GameBoardModifiersSection } from './ui/GameBoardModifiersSection.tsx'
import { usePanelCapabilities } from '../../shared/auth/use-panel-capabilities.ts'

export function GameBoardPage() {
  const { t } = useTranslation()
  const { data, isError, isLoading } = useGameBoardPage()
  const { canGameSetup, canModifierActivation } = usePanelCapabilities()
  const {
    pendingCell,
    toastMessage,
    canOpenCells,
    isSubmitting,
    requestOpenCell,
    confirmOpenCell,
    dismissPendingCell,
    dismissToast,
  } = useOpenGameBoardCell()

  if (isLoading) {
    return (
      <PageStatePanel
        title={t('gameBoard.title')}
        message={t('gameBoard.loading')}
        showSpinner
      />
    )
  }

  if (isError) {
    return (
      <PageStatePanel
        title={t('gameBoard.title')}
        message={t('gameBoard.errorLoading')}
        tone="error"
      />
    )
  }

  if (data === null) {
    return <PageStatePanel title={t('gameBoard.title')} message={t('gameBoard.empty')} />
  }

  if (!data) {
    return (
      <PageStatePanel
        title={t('gameBoard.title')}
        message={t('gameBoard.errorLoading')}
        tone="error"
      />
    )
  }

  const snapshot = data

  return (
    <PageShell variant="centered">
      <SectionCard
        sx={{
          width: '100%',
          maxWidth: 960,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SectionHeader
          title={snapshot.title || t('gameBoard.title')}
          description={snapshot.description}
          actions={
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip
                size="small"
                color={
                  snapshot.status === 'active'
                    ? 'success'
                    : snapshot.status === 'ready'
                      ? 'info'
                      : 'default'
                }
                label={t(
                  snapshot.status === 'active'
                    ? 'gameBoard.statusActive'
                    : snapshot.status === 'ready'
                      ? 'gameBoard.statusReady'
                      : 'gameBoard.statusFinished',
                )}
              />
              <AppLinkButton to={gameApplicationRoute.fullPath} size="small" tone="secondary">
                {t('gameBoard.applicationButton')}
              </AppLinkButton>
            </Stack>
          }
        />
        <GameBoardGrid
          snapshot={snapshot}
          canOpenCells={canOpenCells}
          onCellRequestOpen={requestOpenCell}
        />
        <GameBoardModifiersSection
          snapshot={snapshot}
          canActivateModifiers={canModifierActivation}
        />
        {canGameSetup ? <GameBoardAdminPlannedSection /> : null}
      </SectionCard>

      <ConfirmDialog
        open={pendingCell !== null}
        onClose={dismissPendingCell}
        onConfirm={confirmOpenCell}
        isBusy={isSubmitting}
        title={t('gameBoard.openConfirmTitle')}
        description={t('gameBoard.openConfirmDescription', {
          cost: pendingCell?.cost ?? 0,
          row: pendingCell?.row ?? '-',
          col: pendingCell?.col ?? '-',
        })}
        cancelLabel={t('gameBoard.openCancel')}
        confirmLabel={t('gameBoard.openConfirm')}
      />

      <AppToast message={toastMessage} onClose={dismissToast} severity="info" autoHideDuration={3000} />
    </PageShell>
  )
}
