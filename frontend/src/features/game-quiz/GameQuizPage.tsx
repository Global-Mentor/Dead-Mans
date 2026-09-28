import { Box, Stack, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { useViewportPanelHeight } from '../../shared/lib/use-viewport-panel-height.ts'
import {
  PageShell,
  PageStatePanel,
  RankingList,
  SectionCard,
  TabOption,
  TabStrip,
} from '../../shared/ui/index.ts'
import { currentGameBoardQueryOptions } from '../game-board/index.ts'
import { activeGameRoundQueryOptions } from '../game-rounds/api/game-rounds-queries.ts'
import {
  gameHistoryGameDetailsQueryOptions,
  gameHistoryQueryKeys,
} from '../game-history/api/game-history-queries.ts'
import { CurrentQuizCard } from './CurrentQuizCard.tsx'
import { useSubmitQuizAnswer } from './use-submit-quiz-answer.ts'
import { QuizQuestionSessionHistoryItem } from './QuizQuestionSessionHistoryItem.tsx'
import { TwitchBotPanel } from './TwitchBotPanel.tsx'
import {
  askNextGameQuizQuestion,
  askSpecificGameQuizQuestion,
  cancelTwitchQuizPublication,
  prepareTwitchQuizQuestion,
  retryTwitchQuizPublication,
  skipTwitchQuizOutcome,
} from './api/game-quiz-api.ts'
import {
  availableGameQuizQuestionsQueryOptions,
  currentGameQuizQueryOptions,
  gameQuizQueryKeys,
  twitchBotStatusQueryOptions,
} from './api/game-quiz-queries.ts'
import { ManualAwardHistoryItem } from './quiz-history-items.tsx'
import { getQuizHistoryItems } from './quiz-history-model.ts'

export function GameQuizPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const gridRef = useViewportPanelHeight('--quiz-panel-height', 320)
  const [actionError, setActionError] = useState<{ gameId: string; error: Error } | null>(null)
  const [activityTab, setActivityTab] = useState<'leaderboard' | 'history'>('leaderboard')
  const [leaderboardMode, setLeaderboardMode] = useState<'available' | 'earned'>('available')

  const snapshotQuery = useQuery(currentGameBoardQueryOptions)
  const roundQuery = useQuery(activeGameRoundQueryOptions)
  const gameId = snapshotQuery.data?.gameId ?? ''
  const modifierOrderingActive =
    roundQuery.data?.gameId === gameId && roundQuery.data.status === 'awaiting_modifiers'
  const gameDetailsQuery = useQuery({
    ...gameHistoryGameDetailsQueryOptions(gameId),
    enabled: gameId !== '',
  })
  const currentQuizQuery = useQuery({
    ...currentGameQuizQueryOptions(gameId),
    enabled: gameId !== '',
  })
  const canManageQuiz =
    user?.roles.some((role) => role === 'moderator' || role === 'admin' || role === 'superadmin') ??
    false
  const canAdminTwitch =
    user?.roles.some((role) => role === 'admin' || role === 'superadmin') ?? false
  const twitchStatusQuery = useQuery({
    ...twitchBotStatusQueryOptions,
    enabled: canManageQuiz,
    refetchInterval: (query) => {
      const status = query.state.data
      if (
        status?.enabled &&
        (!status.botConnected || !status.broadcasterConnected || !status.eventSubConnected)
      )
        return 5000
      const publication = query.state.data?.publication
      return publication?.status === 'publishing' || publication?.status === 'cancel_pending'
        ? 1000
        : status?.enabled
          ? 15000
          : false
    },
  })
  const availableQuestionsQuery = useQuery({
    ...availableGameQuizQuestionsQueryOptions(gameId),
    enabled: canManageQuiz && gameId !== '',
  })
  const invalidateQuiz = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: gameQuizQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: gameHistoryQueryKeys.all }),
    ])
  }
  const submitMutation = useSubmitQuizAnswer(gameId)
  const askNextMutation = useMutation({
    mutationFn: async () => {
      if (twitchStatusQuery.data?.enabled) await prepareTwitchQuizQuestion()
      else await askNextGameQuizQuestion()
    },
    onSuccess: invalidateQuiz,
    onMutate: () => setActionError(null),
    onError: (error) => setActionError({ gameId, error }),
  })
  const askSpecificMutation = useMutation({
    mutationFn: async (questionId: string) => {
      if (twitchStatusQuery.data?.enabled) await prepareTwitchQuizQuestion(questionId)
      else await askSpecificGameQuizQuestion(questionId)
    },
    onSuccess: invalidateQuiz,
    onMutate: () => setActionError(null),
    onError: (error) => setActionError({ gameId, error }),
  })
  const publicationMutation = useMutation({
    onMutate: () => setActionError(null),
    onError: (error) => setActionError({ gameId, error }),
    mutationFn: async (action: 'retry' | 'cancel' | 'skip') => {
      const publicationId = twitchStatusQuery.data?.publication?.publicationId
      if (!publicationId) throw new Error('No Twitch publication is selected.')
      if (action === 'retry') return retryTwitchQuizPublication(publicationId)
      if (action === 'cancel') return cancelTwitchQuizPublication(publicationId)
      return skipTwitchQuizOutcome(publicationId)
    },
    onSuccess: async () => {
      await twitchStatusQuery.refetch()
      await invalidateQuiz()
    },
  })

  const isLoading =
    snapshotQuery.isLoading ||
    (snapshotQuery.data != null && (gameDetailsQuery.isLoading || currentQuizQuery.isLoading))
  const isError = snapshotQuery.isError || gameDetailsQuery.isError || currentQuizQuery.isError
  const snapshot = snapshotQuery.data ?? null
  const leaderboard = gameDetailsQuery.data?.quiz.playerStats ?? []
  const displayedLeaderboard = [...leaderboard].sort((left, right) => {
    const pointsDifference =
      leaderboardMode === 'available'
        ? right.availablePoints - left.availablePoints
        : right.points - left.points
    return (
      pointsDifference ||
      right.correctAnswers - left.correctAnswers ||
      right.attempts - left.attempts ||
      left.displayName.localeCompare(right.displayName)
    )
  })
  const historyItems = getQuizHistoryItems(
    gameDetailsQuery.data?.quiz.questionSessions ?? [],
    gameDetailsQuery.data?.quiz.manualAwards ?? [],
  )
  const isEmpty = !isLoading && !isError && snapshot == null
  const twitchPanel = twitchStatusQuery.data ? (
    <TwitchBotPanel
      status={twitchStatusQuery.data}
      canAdmin={canAdminTwitch}
      busy={publicationMutation.isPending}
      onRetry={() => publicationMutation.mutate('retry')}
      onCancel={() => publicationMutation.mutate('cancel')}
      onSkipOutcome={() => publicationMutation.mutate('skip')}
    />
  ) : null

  if (isLoading || isError || isEmpty) {
    return (
      <Stack spacing={2}>
        {twitchPanel}
        <PageStatePanel
          title={t('gameQuiz.title')}
          message={t(
            isLoading ? 'gameQuiz.loading' : isError ? 'gameQuiz.errorLoading' : 'gameQuiz.noGame',
          )}
          showSpinner={isLoading}
          tone={isError ? 'error' : 'default'}
        />
      </Stack>
    )
  }

  return (
    <PageShell
      sx={{
        maxWidth: 1800,
        width: '100%',
        mx: 'auto',
        p: { xs: 0, md: 0 },
      }}
    >
      {twitchPanel}

      <Box
        ref={gridRef}
        sx={{
          mt: twitchPanel ? 1 : 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 1.5,
          alignItems: 'start',
          '@media (min-width: 1000px)': {
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(380px, 1fr)',
          },
        }}
      >
        <CurrentQuizCard
          state={currentQuizQuery.data ?? null}
          canManage={canManageQuiz}
          questions={availableQuestionsQuery.data ?? []}
          questionsLoading={availableQuestionsQuery.isPending}
          questionsError={availableQuestionsQuery.isError}
          onRetryQuestions={() => void availableQuestionsQuery.refetch()}
          isSubmitting={submitMutation.isPending}
          isStarting={
            askNextMutation.isPending ||
            askSpecificMutation.isPending ||
            roundQuery.isPending ||
            roundQuery.isFetching ||
            roundQuery.isError ||
            (roundQuery.data != null && roundQuery.data.gameId !== gameId) ||
            twitchStatusQuery.data?.publication?.status === 'publishing'
          }
          modifierOrderingActive={modifierOrderingActive}
          error={
            actionError?.gameId === gameId
              ? actionError.error
              : submitMutation.variables?.questionSessionId ===
                  currentQuizQuery.data?.questionSessionId
                ? submitMutation.error
                : null
          }
          onSubmit={(questionSessionId, optionId) => {
            setActionError(null)
            submitMutation.mutate({ questionSessionId, optionId })
          }}
          onAskNext={() => askNextMutation.mutate()}
          onAskSpecific={(questionId) => askSpecificMutation.mutate(questionId)}
          onDeadline={() => void currentQuizQuery.refetch()}
        />

        <SectionCard
          sx={{
            minWidth: 0,
            p: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            '@media (min-width: 1000px) and (min-height: 600px)': {
              height: 'var(--quiz-panel-height)',
            },
          }}
        >
          <TabStrip
            value={activityTab}
            onChange={(_event, value: 'leaderboard' | 'history') => setActivityTab(value)}
            variant="fullWidth"
            aria-label={t('gameQuiz.title')}
            appearance="underline"
            sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}
          >
            <TabOption
              id="quiz-leaderboard-tab"
              aria-controls="quiz-activity-panel"
              value="leaderboard"
              label={t('gameQuiz.leaderboardTitle')}
              appearance="underline"
            />
            <TabOption
              id="quiz-history-tab"
              aria-controls="quiz-activity-panel"
              value="history"
              label={t('gameQuiz.historyTitle')}
              appearance="underline"
            />
          </TabStrip>

          <Box
            id="quiz-activity-panel"
            role="tabpanel"
            aria-labelledby={
              activityTab === 'leaderboard' ? 'quiz-leaderboard-tab' : 'quiz-history-tab'
            }
            sx={{
              minHeight: 0,
              '@media (min-width: 1000px) and (min-height: 600px)': {
                flex: 1,
                overflowY: 'auto',
                overscrollBehaviorY: 'contain',
              },
            }}
          >
            {activityTab === 'leaderboard' ? (
              <TabStrip
                value={leaderboardMode}
                onChange={(_event, value: 'available' | 'earned') => setLeaderboardMode(value)}
                variant="fullWidth"
                aria-label={t('gameQuiz.leaderboardTitle')}
                appearance="underline"
                sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}
              >
                <TabOption
                  value="available"
                  label={t('gameQuiz.leaderboardAvailableTitle')}
                  appearance="underline"
                />
                <TabOption
                  value="earned"
                  label={t('gameQuiz.leaderboardEarnedTitle')}
                  appearance="underline"
                />
              </TabStrip>
            ) : null}

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', px: 1.5, py: 1 }}
            >
              {t(
                activityTab === 'leaderboard'
                  ? leaderboardMode === 'available'
                    ? 'gameQuiz.leaderboardAvailableDescription'
                    : 'gameQuiz.leaderboardEarnedDescription'
                  : 'gameQuiz.historyDescription',
              )}
            </Typography>

            {activityTab === 'leaderboard' ? (
              leaderboard.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, pb: 2 }}>
                  {t('gameQuiz.noLeaderboardEntries')}
                </Typography>
              ) : (
                <RankingList
                  label={t('gameQuiz.leaderboardTitle')}
                  rankLabel={t('gameQuiz.rankLabel')}
                  nameLabel={t('common.entities.player')}
                  valueLabel={t(
                    leaderboardMode === 'available'
                      ? 'gameQuiz.leaderboardAvailableTitle'
                      : 'gameQuiz.leaderboardEarnedTitle',
                  )}
                  entries={displayedLeaderboard.map((entry) => ({
                    id: entry.userId,
                    name: entry.displayName,
                    highlighted: entry.userId === user?.id,
                    value: t(
                      leaderboardMode === 'available'
                        ? 'gameQuiz.availablePointsValue'
                        : 'gameQuiz.earnedPointsValue',
                      {
                        points:
                          leaderboardMode === 'available' ? entry.availablePoints : entry.points,
                      },
                    ),
                    detail: t('gameQuiz.answerStats', {
                      attempts: entry.attempts,
                      correct: entry.correctAnswers,
                    }),
                  }))}
                />
              )
            ) : historyItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, pb: 2 }}>
                {t('gameQuiz.noHistory')}
              </Typography>
            ) : (
              <Stack spacing={0.75} sx={{ px: 0.75, pb: 0.75 }}>
                {historyItems.map((item) => (
                  <Box key={item.id}>
                    {item.kind === 'questionSession' ? (
                      <QuizQuestionSessionHistoryItem
                        questionSession={item.questionSession}
                        currentUserId={user?.id ?? null}
                      />
                    ) : (
                      <ManualAwardHistoryItem award={item.award} currentUserId={user?.id ?? null} />
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </SectionCard>
      </Box>
    </PageShell>
  )
}
