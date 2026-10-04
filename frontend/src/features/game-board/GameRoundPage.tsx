import { Stack } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AppButton, InlineNotice, PageShell, PageStatePanel } from '../../shared/ui/index.ts'
import { activeGameRoundQueryOptions } from '../game-rounds/api/game-rounds-queries.ts'
import { gameModifierStateQueryOptions } from '../game-modifiers/api/game-modifier-queries.ts'
import {
  currentGameBoardQueryOptions,
  currentGameTeamQueueForGameQueryOptions,
} from './api/game-board-queries.ts'
import { RoundOverview } from './ui/RoundOverview.tsx'
import { RoundModifierDrawer } from './ui/RoundModifierDrawer.tsx'
import { GameQuizDrawer } from './ui/GameQuizDrawer.tsx'

export function GameRoundPage() {
  const { t } = useTranslation()
  const snapshotQuery = useQuery(currentGameBoardQueryOptions)
  const roundQuery = useQuery(activeGameRoundQueryOptions)
  const snapshot = snapshotQuery.data ?? null
  const round = roundQuery.data?.gameId === snapshot?.gameId ? (roundQuery.data ?? null) : null
  const teamQueueQuery = useQuery({
    ...currentGameTeamQueueForGameQueryOptions(snapshot?.gameId ?? ''),
    enabled: snapshot?.activeTeamId != null && round === null,
  })
  const teamQueue = teamQueueQuery.data
  const selectedTeam =
    teamQueue && snapshot && teamQueue.gameId === snapshot.gameId
      ? (teamQueue.teams.find((team) => team.teamId === snapshot.activeTeamId) ?? null)
      : null
  const modifiersQuery = useQuery({ ...gameModifierStateQueryOptions, enabled: round !== null })
  const modifiers =
    modifiersQuery.data?.gameId === snapshot?.gameId ? (modifiersQuery.data ?? null) : null
  const isError = snapshotQuery.isError || roundQuery.isError
  const retry = () =>
    void Promise.all([snapshotQuery.refetch(), roundQuery.refetch(), modifiersQuery.refetch()])
  if (snapshotQuery.isLoading) {
    return (
      <PageStatePanel
        title={t('navigation.items.gameRound.label')}
        message={t('gameBoard.loading')}
        showSpinner
      />
    )
  }
  if (snapshotQuery.isError && !snapshot) {
    return (
      <PageStatePanel
        title={t('navigation.items.gameRound.label')}
        message={t('gameBoard.errorLoading')}
        tone="error"
        actions={<AppButton onClick={retry}>{t('common.actions.retry')}</AppButton>}
      />
    )
  }
  if (!snapshot) {
    return (
      <PageStatePanel
        title={t('navigation.items.gameRound.label')}
        message={t('gameBoard.empty')}
      />
    )
  }

  const ordering = round?.status === 'awaiting_modifiers'
  return (
    <PageShell
      data-testid="current-round-screen"
      sx={{
        width: '100%',
        minWidth: 0,
        maxWidth: { xs: '100%', md: 'calc((100dvh - 128px) * 1.55)' },
        mx: 'auto',
        px: { xs: 0, md: 0 },
        pb: { xs: 0, md: 0 },
      }}
    >
      <Stack spacing={1.5} sx={{ width: '100%', minWidth: 0 }}>
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
          cell={round ? (snapshot.cells.find((item) => item.id === round.cellId) ?? null) : null}
          selectedTeam={selectedTeam}
          teamLoading={teamQueueQuery.isLoading && snapshot.activeTeamId != null && !round}
          teamError={teamQueueQuery.isError}
          onRetryTeam={() => void teamQueueQuery.refetch()}
          roundLoading={roundQuery.isLoading && round === null}
          roundError={roundQuery.isError && round === null}
          modifiers={modifiers}
          modifiersLoading={modifiersQuery.isLoading}
          modifiersError={modifiersQuery.isError}
          isOffline={isError}
          onRetryModifiers={() => void modifiersQuery.refetch()}
          phaseActions={
            <>
              {ordering && round ? (
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
              <GameQuizDrawer
                gameId={snapshot.gameId}
                suspended={ordering}
                side="left"
                showForManagers
              />
            </>
          }
        />
      </Stack>
    </PageShell>
  )
}
