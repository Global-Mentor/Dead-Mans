import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AppButton, PageShell, PageStatePanel } from '../../shared/ui/index.ts'
import { activeGameRoundQueryOptions } from '../game-rounds/api/game-rounds-queries.ts'
import {
  currentGameBoardQueryOptions,
  currentGameTeamQueueForGameQueryOptions,
} from './api/game-board-queries.ts'
import { TeamQueuePanel } from './ui/TeamQueuePanel.tsx'

export function GameTeamQueuePage() {
  const { t } = useTranslation()
  const snapshotQuery = useQuery(currentGameBoardQueryOptions)
  const snapshot = snapshotQuery.data ?? null
  const roundQuery = useQuery({
    ...activeGameRoundQueryOptions,
    enabled: snapshot !== null,
  })
  const queueQuery = useQuery({
    ...currentGameTeamQueueForGameQueryOptions(snapshot?.gameId ?? 'none'),
    enabled: snapshot !== null,
  })
  const queue = queueQuery.data?.gameId === snapshot?.gameId ? queueQuery.data : undefined

  if (snapshotQuery.isLoading) {
    return (
      <PageStatePanel
        title={t('gameBoard.teamQueueTitle')}
        message={t('gameBoard.teamQueueLoading')}
        showSpinner
      />
    )
  }
  if (snapshotQuery.isError && !snapshot) {
    return (
      <PageStatePanel
        title={t('gameBoard.teamQueueTitle')}
        message={t('gameBoard.errorLoading')}
        tone="error"
        actions={
          <AppButton onClick={() => void snapshotQuery.refetch()}>
            {t('common.actions.retry')}
          </AppButton>
        }
      />
    )
  }
  if (!snapshot) {
    return (
      <PageStatePanel
        title={t('gameBoard.teamQueueTitle')}
        message={t('gameBoard.teamQueueNoGame')}
      />
    )
  }

  const activeTeamId =
    roundQuery.data?.gameId === snapshot.gameId ? roundQuery.data.teamId : snapshot.activeTeamId

  return (
    <PageShell sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 0 }}>
      <TeamQueuePanel
        teams={queue?.teams ?? []}
        isLoading={queueQuery.isLoading}
        isError={queueQuery.isError}
        hasData={queue !== undefined}
        isRefreshing={queueQuery.isFetching}
        onRetry={() => void queueQuery.refetch()}
        activeTeamId={activeTeamId ?? null}
      />
    </PageShell>
  )
}
