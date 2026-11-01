import { Box } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { useViewportPanelHeight } from '../../shared/lib/use-viewport-panel-height.ts'
import { AppButton, InlineNotice, PageShell, PageStatePanel } from '../../shared/ui/index.ts'
import { currentGameBoardQueryOptions } from '../game-board/index.ts'
import { gameHistoryGameDetailsQueryOptions } from '../game-history/index.ts'
import { QuizStatsPanel } from './QuizStatsPanel.tsx'
import { QuizHistoryPanel } from './QuizHistoryPanel.tsx'
import { QuizLeaderboardPanel } from './QuizLeaderboardPanel.tsx'
import { useSubmitQuizAnswer } from './use-submit-quiz-answer.ts'
import { currentGameQuizQueryOptions } from './api/game-quiz-queries.ts'

export function GameQuizPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const gridRef = useViewportPanelHeight('--quiz-panel-height', 320)
  const canAdmin = user?.roles.some((role) => role === 'admin' || role === 'superadmin') ?? false
  const snapshotQuery = useQuery(currentGameBoardQueryOptions)
  const gameId = snapshotQuery.data?.gameId ?? ''
  const detailsQuery = useQuery({
    ...gameHistoryGameDetailsQueryOptions(gameId),
    enabled: gameId !== '',
  })
  const currentQuery = useQuery({ ...currentGameQuizQueryOptions(gameId), enabled: gameId !== '' })
  const submit = useSubmitQuizAnswer(gameId)
  const isLoading =
    snapshotQuery.isLoading ||
    (snapshotQuery.data != null && (detailsQuery.isLoading || currentQuery.isLoading))
  const isError = snapshotQuery.isError || detailsQuery.isError || currentQuery.isError
  const hasData =
    snapshotQuery.data != null && detailsQuery.data != null && currentQuery.data !== undefined
  const retry = () =>
    void Promise.all([snapshotQuery.refetch(), currentQuery.refetch(), detailsQuery.refetch()])
  if ((!hasData && (isLoading || isError)) || snapshotQuery.data === null) {
    return (
      <PageShell variant="state">
        <PageStatePanel
          headingLevel="h1"
          title={t('gameQuiz.title')}
          message={t(
            isLoading ? 'gameQuiz.loading' : isError ? 'gameQuiz.errorLoading' : 'gameQuiz.noGame',
          )}
          showSpinner={isLoading}
          tone={isError ? 'error' : 'default'}
          actions={
            isError ? (
              <AppButton tone="secondary" onClick={retry}>
                {t('common.actions.retry')}
              </AppButton>
            ) : undefined
          }
        />
      </PageShell>
    )
  }
  return (
    <PageShell
      sx={{
        maxWidth: 1440,
        width: { xs: '100%', md: canAdmin ? 'calc(100% - 72px)' : '100%' },
        mx: 'auto',
      }}
    >
      <Box sx={{ mb: 2 }}>
        <QuizStatsPanel
          quiz={detailsQuery.data?.quiz ?? null}
          current={currentQuery.data ?? null}
          currentUserId={user?.id ?? null}
        />
      </Box>
      {isError ? (
        <InlineNotice
          severity="warning"
          action={
            <AppButton size="small" onClick={retry}>
              {t('common.actions.retry')}
            </AppButton>
          }
        >
          {t('gameQuiz.refreshError')}
        </InlineNotice>
      ) : null}
      <Box
        ref={gridRef}
        data-testid="quiz-sections-grid"
        sx={{
          mt: isError ? 1.5 : 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 2,
          alignItems: 'start',
          '@media (min-width: 1000px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        <QuizHistoryPanel
          key={`history-${gameId}`}
          quiz={detailsQuery.data?.quiz ?? null}
          current={currentQuery.data ?? null}
          currentUserId={user?.id ?? null}
          isSubmitting={submit.isPending}
          answerDisabled={isError}
          error={
            submit.variables?.questionSessionId === currentQuery.data?.questionSessionId
              ? submit.error
              : null
          }
          onSubmit={(questionSessionId, optionId) => submit.mutate({ questionSessionId, optionId })}
          onDeadline={() => void currentQuery.refetch()}
        />
        <QuizLeaderboardPanel
          key={`leaderboard-${gameId}`}
          quiz={detailsQuery.data?.quiz ?? null}
          currentUserId={user?.id ?? null}
        />
      </Box>
    </PageShell>
  )
}
