import { Box, Chip, Divider, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { PageShell, PageStatePanel, SectionCard, SectionHeader } from '../../shared/ui/index.ts'
import { currentGameBoardQueryOptions } from '../game-board/index.ts'
import { gameHistoryGameDetailsQueryOptions } from '../game-history/api/game-history-queries.ts'
import { QuizQuestionSessionHistoryItem } from './QuizQuestionSessionHistoryItem.tsx'
import {
  askNextGameQuizQuestion,
  askSpecificGameQuizQuestion,
  submitGameQuizAnswer,
} from './api/game-quiz-api.ts'
import {
  availableGameQuizQuestionsQueryOptions,
  currentGameQuizQueryOptions,
  gameQuizQueryKeys,
} from './api/game-quiz-queries.ts'
import { gameHistoryQueryKeys } from '../game-history/api/game-history-queries.ts'
import { CurrentQuizCard } from './CurrentQuizCard.tsx'

type QuizQuestionSession = components['schemas']['GameHistoryQuizQuestionSessionItemDto']
type ManualAward = components['schemas']['GameHistoryQuizManualAwardItemDto']

type QuizHistoryItem =
  | {
      id: string
      kind: 'questionSession'
      sortAtUtc: string
      questionSession: QuizQuestionSession
    }
  | {
      id: string
      kind: 'manualAward'
      sortAtUtc: string
      award: ManualAward
    }

export function GameQuizPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const snapshotQuery = useQuery(currentGameBoardQueryOptions)
  const gameId = snapshotQuery.data?.gameId ?? ''
  const gameDetailsQuery = useQuery({
    ...gameHistoryGameDetailsQueryOptions(gameId),
    enabled: gameId !== '',
  })
  const currentQuizQuery = useQuery({
    ...currentGameQuizQueryOptions,
    enabled: gameId !== '',
    refetchOnWindowFocus: 'always',
    refetchInterval: (query) => {
      const state = query.state.data
      return state?.status === 'open' && Date.now() >= Date.parse(state.closesAtUtc) ? 1000 : false
    },
  })
  const canManageQuiz =
    user?.roles.some((role) => role === 'moderator' || role === 'admin' || role === 'superadmin') ??
    false
  const availableQuestionsQuery = useQuery({
    ...availableGameQuizQuestionsQueryOptions,
    enabled: canManageQuiz && gameId !== '',
  })
  const invalidateQuiz = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: gameQuizQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: gameHistoryQueryKeys.all }),
    ])
  }
  const submitMutation = useMutation({
    mutationFn: ({
      questionSessionId,
      optionId,
    }: {
      questionSessionId: string
      optionId: string
    }) => submitGameQuizAnswer(questionSessionId, optionId),
    onSuccess: invalidateQuiz,
    onError: invalidateQuiz,
  })
  const askNextMutation = useMutation({
    mutationFn: askNextGameQuizQuestion,
    onSuccess: invalidateQuiz,
  })
  const askSpecificMutation = useMutation({
    mutationFn: askSpecificGameQuizQuestion,
    onSuccess: invalidateQuiz,
  })

  const isLoading =
    snapshotQuery.isLoading ||
    (snapshotQuery.data != null && (gameDetailsQuery.isLoading || currentQuizQuery.isLoading))
  const isError = snapshotQuery.isError || gameDetailsQuery.isError || currentQuizQuery.isError
  const snapshot = snapshotQuery.data ?? null
  const leaderboard = gameDetailsQuery.data?.quiz.playerStats ?? []
  const historyItems = getHistoryItems(
    gameDetailsQuery.data?.quiz.questionSessions ?? [],
    gameDetailsQuery.data?.quiz.manualAwards ?? [],
  )
  const isEmpty = !isLoading && !isError && snapshot == null

  if (isLoading || isError || isEmpty) {
    return (
      <PageStatePanel
        title={t('gameQuiz.title')}
        message={t(
          isLoading ? 'gameQuiz.loading' : isError ? 'gameQuiz.errorLoading' : 'gameQuiz.noGame',
        )}
        showSpinner={isLoading}
        tone={isError ? 'error' : 'default'}
      />
    )
  }

  return (
    <PageShell
      sx={{
        maxWidth: 'none',
        width: '100%',
        mx: 0,
        px: { xs: 0, sm: 0 },
      }}
    >
      <SectionHeader headingLevel="h1" title={t('gameQuiz.title')} />

      <CurrentQuizCard
        state={currentQuizQuery.data ?? null}
        canManage={canManageQuiz}
        questions={availableQuestionsQuery.data ?? []}
        isSubmitting={submitMutation.isPending}
        isStarting={askNextMutation.isPending || askSpecificMutation.isPending}
        error={submitMutation.error ?? askNextMutation.error ?? askSpecificMutation.error}
        onSubmit={(questionSessionId, optionId) =>
          submitMutation.mutate({ questionSessionId, optionId })
        }
        onAskNext={() => askNextMutation.mutate()}
        onAskSpecific={(questionId) => askSpecificMutation.mutate(questionId)}
        onDeadline={() => void currentQuizQuery.refetch()}
      />

      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={2}
        alignItems="stretch"
        sx={{ mt: 1 }}
      >
        <SectionCard
          sx={{
            width: { xs: '100%', lg: 420, xl: 460 },
            minWidth: { lg: 420, xl: 460 },
            flexShrink: 0,
            p: 0,
          }}
        >
          <Stack spacing={0}>
            <Box sx={{ px: 2, pt: 2, pb: 1.25 }}>
              <Typography variant="overline" color="text.secondary">
                {t('gameQuiz.leaderboardTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('gameQuiz.leaderboardDescription')}
              </Typography>
            </Box>

            {leaderboard.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
                {t('gameQuiz.noLeaderboardEntries')}
              </Typography>
            ) : (
              leaderboard.map((entry, index) => (
                <Box key={entry.userId}>
                  {index > 0 ? <Divider /> : null}
                  <Stack
                    direction="row"
                    spacing={1.25}
                    alignItems="center"
                    sx={(theme) => ({
                      px: 2,
                      py: 1.25,
                      backgroundColor:
                        entry.userId === user?.id
                          ? alpha(theme.palette.primary.main, 0.08)
                          : 'transparent',
                    })}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ minWidth: 26, fontWeight: 700 }}
                    >
                      {index + 1}
                    </Typography>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight={entry.userId === user?.id ? 700 : 500}
                        noWrap
                      >
                        {entry.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {t('gameQuiz.answerStats', {
                          attempts: entry.attempts,
                          correct: entry.correctAnswers,
                        })}
                      </Typography>
                      {entry.lastActivityAtUtc ? (
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {t('gameQuiz.lastActivityAt', {
                            time: new Date(entry.lastActivityAtUtc).toLocaleTimeString(
                              i18n.resolvedLanguage,
                            ),
                          })}
                        </Typography>
                      ) : null}
                    </Box>

                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {t('gameQuiz.totalPoints', { points: entry.points })}
                    </Typography>
                  </Stack>
                </Box>
              ))
            )}
          </Stack>
        </SectionCard>

        <SectionCard sx={{ flex: 1, minWidth: 0, p: 0 }}>
          <Stack spacing={0}>
            <Box sx={{ px: 2, pt: 2, pb: 1.25 }}>
              <Typography variant="overline" color="text.secondary">
                {t('gameQuiz.historyTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('gameQuiz.historyDescription')}
              </Typography>
            </Box>

            {historyItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
                {t('gameQuiz.noHistory')}
              </Typography>
            ) : (
              <Stack spacing={0}>
                {historyItems.map((item, index) => (
                  <Box key={item.id}>
                    {index > 0 ? <Divider /> : null}
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
          </Stack>
        </SectionCard>
      </Stack>
    </PageShell>
  )
}

function ManualAwardHistoryItem({
  award,
  currentUserId,
}: {
  award: ManualAward
  currentUserId: string | null
}) {
  const { t, i18n } = useTranslation()
  const isMyAward = award.awardedToUserId === currentUserId
  const isDeduction = award.operationType === 'deduct' || award.awardedPoints < 0

  return (
    <Box
      sx={(theme) => ({
        px: 2,
        py: 1.5,
        backgroundColor: isMyAward ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
      })}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t(isDeduction ? 'gameQuiz.manualDeductionLabel' : 'gameQuiz.manualAwardLabel')}
          </Typography>
          <Chip
            label={t('gameQuiz.pointsAdjusted', {
              value: `${award.awardedPoints > 0 ? '+' : ''}${award.awardedPoints}`,
            })}
            color={isDeduction ? 'error' : 'success'}
            size="small"
            sx={{ height: 20, fontSize: '0.68rem' }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {formatHistoryTime(award.awardedAtUtc, i18n.resolvedLanguage)}
          </Typography>
        </Stack>

        <Typography variant="body2">
          {t(
            isDeduction ? 'gameQuiz.manualDeductionDescription' : 'gameQuiz.manualAwardDescription',
            {
              player: award.awardedToDisplayName,
              moderator: award.awardedByDisplayName,
            },
          )}
        </Typography>
        {award.reason ? (
          <Typography variant="caption" color="text.secondary">
            {t('gameQuiz.manualAdjustmentReason', { reason: award.reason })}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  )
}

function getHistoryItems(
  questionSessions: QuizQuestionSession[],
  manualAwards: ManualAward[],
): QuizHistoryItem[] {
  const items: QuizHistoryItem[] = [
    ...questionSessions.map((questionSession) => ({
      id: `question-session-${questionSession.questionSessionId}`,
      kind: 'questionSession' as const,
      sortAtUtc: questionSession.closedAtUtc ?? questionSession.askedAtUtc,
      questionSession,
    })),
    ...manualAwards.map((award) => ({
      id: `award-${award.awardId}`,
      kind: 'manualAward' as const,
      sortAtUtc: award.awardedAtUtc,
      award,
    })),
  ]

  return items.sort((left, right) => {
    const timeComparison = right.sortAtUtc.localeCompare(left.sortAtUtc)
    if (timeComparison !== 0) {
      return timeComparison
    }

    return right.id.localeCompare(left.id)
  })
}

function formatHistoryTime(value: string, locale?: string) {
  return new Date(value).toLocaleString(locale)
}
