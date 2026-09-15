import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameBoardCell } from '../../shared/api/contracts/index.ts'
import {
  gameApplicationRoute,
  gameHistoryRoute,
  gameModifiersRoute,
} from '../../routes/app-routes.ts'
import {
  AppLinkButton,
  AppToast,
  ConfirmDialog,
  PageShell,
  PageStatePanel,
  SectionCard,
} from '../../shared/ui/index.ts'
import { formatTeamNameWithFallback } from '../game-registration/model/team-name.ts'
import { GameAdminToolsPanel } from '../admin-tools/GameAdminToolsHost.tsx'
import { GameBoardCardPreviewDialog } from './ui/GameBoardCardPreviewDialog.tsx'
import { GameBoardGrid } from './ui/GameBoardGrid.tsx'
import { TeamQueuePanel } from './ui/TeamQueuePanel.tsx'
import { buildGameManagementFlow } from './model/game-management-flow.ts'
import { useCardPlayResult } from './use-card-play-result.ts'
import { useGameBoardCellResults } from './use-game-board-cell-results.ts'
import { useGameBoardPage } from './use-game-board-page.ts'
import { useOpenGameBoardCell } from './use-open-game-board-cell.ts'

export function GameBoardPage() {
  const { t } = useTranslation()
  const [previewCell, setPreviewCell] = useState<GameBoardCell | null>(null)
  const { data, activeRound, teamQueue, isTeamQueueError, isTeamQueueLoading, isError, isLoading } =
    useGameBoardPage()
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
      />
    )
  if (data === null)
    return <PageStatePanel title={t('gameBoard.title')} message={t('gameBoard.empty')} />

  const snapshot = data
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
        gap: 1.5,
        justifyContent: 'flex-start',
      }}
    >
      {snapshot.status !== 'active' ? (
        <Box sx={{ width: '100%', maxWidth: 1440 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {t(
                  snapshot.status === 'ready'
                    ? 'gameBoard.registrationNoticeTitle'
                    : 'gameBoard.finishedTitle',
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(
                  snapshot.status === 'ready'
                    ? 'gameBoard.registrationNoticeDescription'
                    : 'gameBoard.finishedDescription',
                )}
              </Typography>
            </Box>
            <AppLinkButton
              to={
                snapshot.status === 'ready'
                  ? gameApplicationRoute.fullPath
                  : `${gameHistoryRoute.fullPath}?gameId=${encodeURIComponent(snapshot.gameId)}`
              }
              tone={snapshot.status === 'ready' ? 'primary' : 'success'}
              sx={{ flexShrink: 0, minHeight: 44 }}
            >
              {t(
                snapshot.status === 'ready'
                  ? 'gameBoard.registrationNoticeAction'
                  : 'gameBoard.openResultsAction',
              )}
            </AppLinkButton>
          </Stack>
        </Box>
      ) : null}

      <SectionCard
        component="section"
        aria-labelledby="game-board-title"
        sx={{
          width: '100%',
          maxWidth: 1440,
          minWidth: 0,
          p: 0,
          border: 0,
          boxShadow: 'none',
          background: 'none',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 0.5, sm: 2 }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Typography
            id="game-board-title"
            component="h1"
            variant="h5"
            sx={{
              fontSize: { xs: 25, sm: 30 },
              lineHeight: 1.2,
              minWidth: 0,
              overflowWrap: 'anywhere',
            }}
          >
            {snapshot.title || t('gameBoard.title')}
          </Typography>
          <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            <TeamQueuePanel
              teams={teamQueue}
              isLoading={isTeamQueueLoading}
              isError={isTeamQueueError}
              activeTeamId={currentActiveTeamId}
            />
            <GameAdminToolsPanel initialToolId="game" inlineTrigger />
          </Stack>
        </Stack>

        {snapshot.status === 'active' ? (
          <Stack
            direction="row"
            gap={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ minHeight: 44, mb: 1 }}
          >
            {activeTeam ? (
              <>
                <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                  {formatTeamNameWithFallback(
                    activeTeam.teamName,
                    t('common.teamWithSlot', { slot: activeTeam.teamSlotIndex }),
                  )}
                </Typography>
                <Box component="span" aria-hidden sx={{ color: 'text.disabled' }}>
                  ·
                </Box>
              </>
            ) : null}
            {flow.currentStepId === 'activate_modifiers' ? (
              <AppLinkButton
                to={gameModifiersRoute.fullPath}
                tone="ghost"
                size="small"
                aria-label={t('gameBoard.flowOpenModifiersAction')}
                sx={{
                  minHeight: 44,
                  px: 0.5,
                  textTransform: 'none',
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px',
                }}
              >
                {phaseLabel}
              </AppLinkButton>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {phaseLabel}
              </Typography>
            )}
          </Stack>
        ) : (
          <Box sx={{ height: 12 }} />
        )}

        <GameBoardGrid
          key={snapshot.gameId}
          snapshot={snapshot}
          playResultsByCellId={boardCellResults.playResultsByCellId}
          activeCellId={activeRound?.cellId ?? null}
          canOpenCells={canOpenCells}
          onCellRequestOpen={requestOpenCell}
          onCellPreviewMedia={setPreviewCell}
        />
      </SectionCard>

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
