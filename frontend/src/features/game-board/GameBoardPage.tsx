import { Box, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  gameApplicationRoute,
  gameHistoryRoute,
  gameModifiersRoute,
} from '../../routes/app-routes.ts'
import type { GameBoardCell } from '../../shared/api/contracts/index.ts'
import {
  AppButton,
  AppToast,
  ConfirmDialog,
  PageShell,
  PageStatePanel,
} from '../../shared/ui/index.ts'
import { GameAdminToolsPanel } from '../admin-tools/GameAdminToolsHost.tsx'
import { formatTeamNameWithFallback } from '../game-registration/model/team-name.ts'
import { buildGameManagementFlow } from './model/game-management-flow.ts'
import { GameBoardCardPreviewDialog } from './ui/GameBoardCardPreviewDialog.tsx'
import { GameBoardGrid } from './ui/GameBoardGrid.tsx'
import { GameBoardLayout } from './ui/GameBoardLayout.tsx'
import { GameBoardStatusBar } from './ui/GameBoardStatusBar.tsx'
import { TeamQueuePanel } from './ui/TeamQueuePanel.tsx'
import { useCardPlayResult } from './use-card-play-result.ts'
import { useGameBoardCellResults } from './use-game-board-cell-results.ts'
import { useGameBoardPage } from './use-game-board-page.ts'
import { useOpenGameBoardCell } from './use-open-game-board-cell.ts'

export function GameBoardPage() {
  const { t } = useTranslation()
  const [previewCell, setPreviewCell] = useState<GameBoardCell | null>(null)
  const {
    data,
    activeRound,
    teamQueue,
    isTeamQueueError,
    isTeamQueueLoading,
    hasTeamQueueData,
    isTeamQueueRefreshing,
    retryTeamQueue,
    retry,
    isRefreshing,
    isError,
    isLoading,
  } = useGameBoardPage()
  const {
    pendingCell,
    toastMessage,
    canOpenCells,
    isSubmitting,
    requestOpenCell,
    confirmOpenCell,
    dismissPendingCell,
    dismissToast,
  } = useOpenGameBoardCell({
    activeTeamId: data?.activeTeamId ?? null,
    gameStatus: data?.status ?? null,
    hasActiveRound: activeRound !== null,
    onCellOpened: setPreviewCell,
  })
  const previewPlayResult = useCardPlayResult(data?.gameId ?? null, previewCell)
  const boardCellResults = useGameBoardCellResults(data?.gameId ?? null, data?.cells ?? [])

  if (isLoading)
    return (
      <PageStatePanel title={t('gameBoard.title')} message={t('gameBoard.loading')} showSpinner />
    )
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
  const title = snapshot.title || t('gameBoard.title')
  const flow = buildGameManagementFlow(snapshot, activeRound)
  const currentActiveTeamId = activeRound?.teamId ?? snapshot.activeTeamId ?? null
  const activeTeam = teamQueue.find((team) => team.teamId === currentActiveTeamId) ?? activeRound
  const highlightedStep =
    flow.steps.find((step) => step.state === 'current') ??
    flow.steps.find((step) => step.state === 'ready')
  const phaseLabel = highlightedStep ? t(highlightedStep.titleKey) : t(flow.summaryKey)

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
          context={
            <GameBoardStatusBar
              title={
                snapshot.status === 'active' && activeTeam
                  ? formatTeamNameWithFallback(
                      activeTeam.teamName,
                      t('common.teamWithSlot', { slot: activeTeam.teamSlotIndex }),
                    )
                  : title
              }
              caption={
                snapshot.status === 'active'
                  ? t(activeTeam ? 'gameBoard.statusTeamCaption' : 'gameBoard.statusGameCaption')
                  : t(
                      snapshot.status === 'ready'
                        ? 'gameBoard.registrationNoticeTitle'
                        : 'gameBoard.finishedTitle',
                    )
              }
              phase={phaseLabel}
              participantNames={
                snapshot.status === 'active'
                  ? activeTeam?.participants?.map((participant) => participant.displayName)
                  : undefined
              }
              phaseCaption={snapshot.status === 'active' ? t('gameBoard.flowTitle') : undefined}
              action={
                snapshot.status !== 'active'
                  ? {
                      to:
                        snapshot.status === 'ready'
                          ? gameApplicationRoute.fullPath
                          : `${gameHistoryRoute.fullPath}?gameId=${encodeURIComponent(snapshot.gameId)}`,
                      label: t(
                        snapshot.status === 'ready'
                          ? 'gameBoard.registrationNoticeAction'
                          : 'gameBoard.openResultsAction',
                      ),
                    }
                  : flow.currentStepId === 'activate_modifiers'
                    ? {
                        to: gameModifiersRoute.fullPath,
                        label: phaseLabel,
                        accessibleLabel: t('gameBoard.flowOpenModifiersAction'),
                        compactLabel: true,
                      }
                    : undefined
              }
            />
          }
          teams={
            <TeamQueuePanel
              teams={teamQueue}
              isLoading={isTeamQueueLoading}
              isError={isTeamQueueError}
              hasData={hasTeamQueueData}
              isRefreshing={isTeamQueueRefreshing}
              onRetry={retryTeamQueue}
              activeTeamId={currentActiveTeamId}
            />
          }
          management={
            <GameAdminToolsPanel initialToolId="game" triggerPlacement="responsiveEdge" />
          }
        >
          <GameBoardGrid
            key={snapshot.gameId}
            snapshot={snapshot}
            playResultsByCellId={boardCellResults.playResultsByCellId}
            activeCellId={activeRound?.cellId ?? null}
            canOpenCells={canOpenCells}
            onCellRequestOpen={requestOpenCell}
            onCellPreviewMedia={setPreviewCell}
          />
        </GameBoardLayout>
      </Box>
      <ConfirmDialog
        open={pendingCell !== null}
        onClose={dismissPendingCell}
        onConfirm={confirmOpenCell}
        isBusy={isSubmitting}
        title={t('gameBoard.openConfirmTitle')}
        description={t('gameBoard.openConfirmDescription', {
          cost: pendingCell?.cost ?? 0,
          title: pendingCell?.title || t('gameBoard.cellLabel'),
        })}
        cancelLabel={t('common.actions.cancel')}
        confirmLabel={t('common.actions.open')}
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
