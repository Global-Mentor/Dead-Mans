import { Box, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { gameRoundRoute } from '../../routes/app-routes.ts'
import type { GameBoardCell } from '../../shared/api/contracts/index.ts'
import {
  AppButton,
  AppToast,
  ConfirmDialog,
  InlineNotice,
  PageShell,
  PageStatePanel,
} from '../../shared/ui/index.ts'
import { getBoardRowLabelColumnWidth } from './theme/board-grid-metrics.ts'
import { GameBoardCardPreviewDialog } from './ui/GameBoardCardPreviewDialog.tsx'
import { GameBoardGrid } from './ui/GameBoardGrid.tsx'
import { GameBoardLayout } from './ui/GameBoardLayout.tsx'
import { GameBoardProgressPanel } from './ui/GameBoardProgressPanel.tsx'
import { GameQuizDrawer } from './ui/GameQuizDrawer.tsx'
import { useCardPlayResult } from './use-card-play-result.ts'
import { useGameBoardCellResults } from './use-game-board-cell-results.ts'
import { useGameBoardPage } from './use-game-board-page.ts'
import { useOpenGameBoardCell } from './use-open-game-board-cell.ts'

export function GameBoardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [previewCell, setPreviewCell] = useState<GameBoardCell | null>(null)
  const {
    data,
    activeRound,
    hasActiveRoundData,
    teamQueue,
    isTeamQueueLoading,
    isTeamQueueError,
    hasTeamQueueData,
    isTeamQueueRefreshing,
    retryTeamQueue,
    retry,
    isRefreshing,
    isRefreshError,
    isError,
    isLoading,
  } = useGameBoardPage()
  const {
    pendingCell,
    confirmationOpen,
    confirmationError,
    toastMessage,
    canOpenCells,
    isSubmitting,
    requestOpenCell,
    confirmOpenCell,
    dismissPendingCell,
    clearDismissedCell,
    dismissToast,
  } = useOpenGameBoardCell({
    gameId: data?.gameId ?? null,
    activeTeamId: data?.activeTeamId ?? null,
    gameStatus: data?.status ?? null,
    hasActiveRound: activeRound !== null,
    onOpenSuccess: () => navigate(gameRoundRoute.fullPath),
  })
  const previewPlayResult = useCardPlayResult(data?.gameId ?? null, previewCell)
  const boardCellResults = useGameBoardCellResults(data?.gameId ?? null, data?.cells ?? [])
  if (isLoading)
    return <PageStatePanel title={t('gameBoard.title')} message={t('gameBoard.loading')} />
  if (isError || data === undefined)
    return (
      <PageStatePanel
        title={t('gameBoard.title')}
        message={t('gameBoard.errorLoading')}
        tone="error"
        actions={
          <AppButton onClick={retry} loading={isRefreshing}>
            {t('common.actions.retry')}
          </AppButton>
        }
      />
    )
  if (data === null)
    return <PageStatePanel title={t('gameBoard.title')} message={t('gameBoard.empty')} />

  const snapshot = data
  const rowLabelColumnWidth = getBoardRowLabelColumnWidth(snapshot.rowLabels)
  const title = snapshot.title || t('gameBoard.title')

  return (
    <PageShell
      variant="centered"
      sx={{
        width: '100%',
        minWidth: 0,
        px: 0,
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}
    >
      {isRefreshError ? (
        <InlineNotice
          severity="warning"
          action={
            <AppButton size="small" onClick={retry}>
              {t('common.actions.retry')}
            </AppButton>
          }
        >
          {t('gameBoard.errorLoading')}
        </InlineNotice>
      ) : null}
      <Typography
        id="game-board-title"
        component="h1"
        sx={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          p: 0,
          m: '-1px',
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </Typography>
      <Box
        component="section"
        aria-labelledby="game-board-title"
        data-testid="game-board-surface"
        sx={{
          width: '100%',
          maxWidth: 1440,
          minWidth: 0,
          p: 0,
        }}
      >
        <GameBoardLayout
          columns={snapshot.colLabels.length}
          rowLabelColumnWidth={rowLabelColumnWidth}
          context={(stacked) => (
            <GameBoardProgressPanel
              key={snapshot.gameId}
              snapshot={snapshot}
              activeRound={activeRound}
              compact={stacked}
              queue={{
                teams: teamQueue,
                isLoading: isTeamQueueLoading,
                isError: isTeamQueueError,
                hasData: hasTeamQueueData,
                isRefreshing: isTeamQueueRefreshing,
                onRetry: retryTeamQueue,
              }}
            />
          )}
        >
          {(categoryLayout) => (
            <GameBoardGrid
              categoryLayout={categoryLayout}
              rowLabelColumnWidth={rowLabelColumnWidth}
              key={snapshot.gameId}
              snapshot={snapshot}
              playResultsByCellId={boardCellResults.playResultsByCellId}
              activeCellId={activeRound?.cellId ?? null}
              canOpenCells={canOpenCells && hasActiveRoundData}
              onCellRequestOpen={requestOpenCell}
              onCellPreviewMedia={setPreviewCell}
              onCellOpenCurrentRound={() => navigate(gameRoundRoute.fullPath)}
            />
          )}
        </GameBoardLayout>
      </Box>
      <GameQuizDrawer
        gameId={snapshot.gameId}
        suspended={activeRound?.status === 'awaiting_modifiers'}
      />
      <ConfirmDialog
        open={confirmationOpen}
        onClose={dismissPendingCell}
        onExited={clearDismissedCell}
        onConfirm={confirmOpenCell}
        isBusy={isSubmitting}
        title={t('gameBoard.openConfirmTitle')}
        description={t('gameBoard.openConfirmDescription', {
          cost: pendingCell?.cost ?? 0,
          title: pendingCell?.title || t('gameBoard.cellLabel'),
        })}
        errorMessage={confirmationError}
        cancelLabel={t('common.actions.cancel')}
        confirmLabel={t(isSubmitting ? 'gameBoard.openPending' : 'common.actions.open')}
      />
      <GameBoardCardPreviewDialog
        cell={previewCell}
        playResult={previewPlayResult}
        onClose={() => setPreviewCell(null)}
      />
      <AppToast
        message={toastMessage}
        onClose={dismissToast}
        severity="info"
        autoHideDuration={3000}
      />
    </PageShell>
  )
}
