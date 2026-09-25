import { Box, Stack } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { gameBoardRoute } from '../../routes/app-routes.ts'
import { hasPanelCapability } from '../../shared/auth/panel-capabilities.ts'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { GameAdminToolsPanel } from '../admin-tools/GameAdminToolsHost.tsx'
import {
  AppButton,
  AppLinkButton,
  InlineNotice,
  PageShell,
  PageStatePanel,
} from '../../shared/ui/index.ts'
import { activeGameRoundQueryOptions } from '../game-rounds/api/game-rounds-queries.ts'
import { gameModifierStateQueryOptions } from '../game-modifiers/api/game-modifier-queries.ts'
import { ModifierRuntimePanel } from '../game-modifiers/ui/ModifierRuntimePanel.tsx'
import { currentGameBoardQueryOptions } from './api/game-board-queries.ts'
import { RoundOverview } from './ui/RoundOverview.tsx'
import { RoundModifierDrawer } from './ui/RoundModifierDrawer.tsx'
import { GameQuizDrawer } from './ui/GameQuizDrawer.tsx'

export function GameRoundPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const snapshotQuery = useQuery(currentGameBoardQueryOptions)
  const roundQuery = useQuery(activeGameRoundQueryOptions)
  const snapshot = snapshotQuery.data ?? null
  const round = roundQuery.data?.gameId === snapshot?.gameId ? (roundQuery.data ?? null) : null
  const modifiersQuery = useQuery({ ...gameModifierStateQueryOptions, enabled: round !== null })
  const modifiers =
    modifiersQuery.data?.gameId === snapshot?.gameId ? (modifiersQuery.data ?? null) : null
  const isError = snapshotQuery.isError || roundQuery.isError
  const retry = () =>
    void Promise.all([snapshotQuery.refetch(), roundQuery.refetch(), modifiersQuery.refetch()])
  const boardLink = (
    <AppLinkButton to={gameBoardRoute.fullPath} tone="secondary" size="small">
      {t('gameBoard.currentRoundScreen.viewBoard')}
    </AppLinkButton>
  )

  if (snapshotQuery.isLoading || roundQuery.isLoading) {
    return (
      <PageStatePanel
        title={t('navigation.items.gameRound.label')}
        message={t('gameBoard.loading')}
        showSpinner
        actions={boardLink}
      />
    )
  }
  if (isError && (!snapshot || !round)) {
    return (
      <PageStatePanel
        title={t('navigation.items.gameRound.label')}
        message={t('gameBoard.errorLoading')}
        tone="error"
        actions={
          <>
            {boardLink}
            <AppButton onClick={retry}>{t('common.actions.retry')}</AppButton>
          </>
        }
      />
    )
  }
  if (!snapshot || !round) {
    return (
      <>
        <PageStatePanel
          title={t('navigation.items.gameRound.label')}
          message={t('gameBoard.currentRoundScreen.empty')}
          actions={boardLink}
        />
        {snapshot?.status === 'active' ? (
          <GameQuizDrawer gameId={snapshot.gameId} showBoardLink side="left" showForManagers />
        ) : null}
      </>
    )
  }

  const ordering = round.status === 'awaiting_modifiers'
  const canManageRound = hasPanelCapability('startGame', user?.roles)
  return (
    <PageShell
      data-testid="current-round-screen"
      sx={{
        width: '100%',
        maxWidth: 1200,
        mx: 'auto',
        px: 0,
        pb: { xs: canManageRound ? 9 : 0, md: 0 },
      }}
    >
      <Stack spacing={1.5} sx={{ width: '100%', minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>{boardLink}</Box>
        {isError ? (
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
        <RoundOverview
          snapshot={snapshot}
          round={round}
          cell={snapshot.cells.find((item) => item.id === round.cellId) ?? null}
          modifiers={modifiers}
          modifiersLoading={modifiersQuery.isLoading}
          modifiersError={modifiersQuery.isError}
          onRetryModifiers={() => void modifiersQuery.refetch()}
        />
        <ModifierRuntimePanel
          key={`${round.roundId}:${round.roundVersion}:${round.serverNowUtc}`}
          round={round}
          isOffline={isError}
        />
        {ordering ? (
          <RoundModifierDrawer
            key={round.roundId}
            roundId={round.roundId}
            state={modifiers ?? null}
            isLoading={modifiersQuery.isLoading}
            isError={isError || modifiersQuery.isError}
            isRefreshing={
              snapshotQuery.isFetching || roundQuery.isFetching || modifiersQuery.isFetching
            }
            onRetry={retry}
          />
        ) : null}
      </Stack>
      {canManageRound ? <GameAdminToolsPanel initialToolId="game" triggerPlacement="edge" /> : null}
      <GameQuizDrawer
        gameId={snapshot.gameId}
        suspended={ordering}
        showBoardLink
        side="left"
        showForManagers
      />
    </PageShell>
  )
}
