import { Box, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import { RoundBriefingDivider } from '../../shared/game-ui/index.ts'
import { RankingList, SectionCard, TabOption, TabStrip } from '../../shared/ui/index.ts'

export function QuizLeaderboardPanel({
  quiz,
  currentUserId,
}: {
  quiz: components['schemas']['GameHistoryQuizSectionDto'] | null
  currentUserId: string | null
}) {
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState<'available' | 'earned'>('earned')
  const leaderboard = quiz?.playerStats ?? []
  const sorted = [...leaderboard].sort(
    (left, right) =>
      (mode === 'available'
        ? right.availablePoints - left.availablePoints
        : right.points - left.points) ||
      right.correctAnswers - left.correctAnswers ||
      right.attempts - left.attempts ||
      left.displayName.localeCompare(right.displayName, i18n.resolvedLanguage),
  )
  return (
    <SectionCard
      component="section"
      aria-label={t('gameQuiz.leaderboardTitle')}
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
      <Typography component="h2" variant="h6" textAlign="center" sx={{ px: 1.5, py: 1.5 }}>
        {t('gameQuiz.leaderboardTitle')}
      </Typography>
      <RoundBriefingDivider sx={{ mb: 0.75 }} />
      <TabStrip
        value={mode}
        onChange={(_, value: 'available' | 'earned') => setMode(value)}
        variant="fullWidth"
        aria-label={t('gameQuiz.rankBy')}
        appearance="framed"
        sx={{ flexShrink: 0, mx: 0.75, mb: 0.75 }}
      >
        <TabOption
          id="quiz-earned-tab"
          aria-controls="quiz-ranking-panel"
          value="earned"
          label={t('gameQuiz.leaderboardEarnedTitle')}
          title={t('gameQuiz.leaderboardEarnedDescription')}
          appearance="framed"
        />
        <TabOption
          id="quiz-available-tab"
          aria-controls="quiz-ranking-panel"
          value="available"
          label={t('gameQuiz.leaderboardAvailableTitle')}
          title={t('gameQuiz.leaderboardAvailableDescription')}
          appearance="framed"
        />
      </TabStrip>
      <Box
        id="quiz-ranking-panel"
        role="tabpanel"
        tabIndex={0}
        aria-labelledby={mode === 'available' ? 'quiz-available-tab' : 'quiz-earned-tab'}
        sx={{
          minHeight: 0,
          '@media (min-width: 1000px) and (min-height: 600px)': {
            flex: '1 1 auto',
            overflowY: 'auto',
            overscrollBehaviorY: 'contain',
          },
        }}
      >
        {leaderboard.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, pb: 2 }}>
            {t('gameQuiz.noLeaderboardEntries')}
          </Typography>
        ) : (
          <RankingList
            alignment="center"
            density="compact"
            highlightAppearance="selected"
            detailLabel={t('gameQuiz.correctAnswersLabel')}
            label={t('gameQuiz.leaderboardTitle')}
            rankLabel={t('gameQuiz.rankLabel')}
            nameLabel={t('common.entities.player')}
            valueLabel={t(
              mode === 'available'
                ? 'gameQuiz.leaderboardAvailableTitle'
                : 'gameQuiz.leaderboardEarnedTitle',
            )}
            entries={sorted.map((entry) => ({
              id: entry.userId,
              name: entry.displayName,
              highlighted: entry.userId === currentUserId,
              value: t(
                mode === 'available'
                  ? 'gameQuiz.availablePointsValue'
                  : 'gameQuiz.earnedPointsValue',
                { points: mode === 'available' ? entry.availablePoints : entry.points },
              ),
              detail: t('gameQuiz.answerRatio', {
                attempts: entry.attempts,
                correct: entry.correctAnswers,
              }),
            }))}
          />
        )}
      </Box>
    </SectionCard>
  )
}
