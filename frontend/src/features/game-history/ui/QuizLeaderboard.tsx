import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import { RoundBriefingPanel } from '../../../shared/game-ui/index.ts'
import { DisclosureSection, RankingList, SectionCard } from '../../../shared/ui/index.ts'
type QuizPlayer = components['schemas']['GameHistoryQuizPlayerSummaryDto']

function sortQuizLeaderboardEntries(entries: readonly QuizPlayer[]) {
  return [...entries].sort(
    (left, right) =>
      right.points - left.points ||
      right.correctAnswers - left.correctAnswers ||
      right.attempts - left.attempts ||
      left.displayName.localeCompare(right.displayName),
  )
}

export function QuizLeaderboard({
  entries,
  defaultExpanded = false,
  presentation = 'disclosure',
}: {
  entries: readonly QuizPlayer[]
  defaultExpanded?: boolean
  presentation?: 'disclosure' | 'panel'
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const leaderboard = sortQuizLeaderboardEntries(entries)

  const content = (
    <>
      {leaderboard.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('gameHistory.quizLeaderboardEmpty')}
        </Typography>
      ) : (
        <RankingList
          density={presentation === 'panel' ? 'compact' : 'default'}
          alignment={presentation === 'panel' ? 'center' : 'default'}
          highlightAppearance="selected"
          {...(presentation === 'panel' ? { detailLabel: t('gameHistory.answersColumn') } : {})}
          label={t('gameHistory.quizLeaderboardTitle')}
          rankLabel={t('gameHistory.table.rank')}
          nameLabel={t('common.entities.player')}
          valueLabel={t('gameHistory.quizLeaderboardEarned')}
          rowTestId="quiz-leaderboard-row"
          entries={leaderboard.map((entry) => ({
            id: entry.userId,
            highlighted: presentation === 'panel' && entry.userId === user?.id,
            name: entry.displayName,
            value: t('gameHistory.pointsValue', { points: entry.points }),
            detail: t(
              presentation === 'panel'
                ? 'gameHistory.answerRatio'
                : 'gameHistory.quizLeaderboardAnswerStats',
              {
                attempts: entry.attempts,
                correct: entry.correctAnswers,
              },
            ),
          }))}
        />
      )}
    </>
  )

  if (presentation === 'panel') {
    return (
      <RoundBriefingPanel
        data-testid="quiz-leaderboard"
        sx={{ flex: 1, minHeight: 0 }}
        header={
          <Typography component="h2" variant="h6" textAlign="center">
            {t('gameHistory.quizLeaderboardTitle')}
          </Typography>
        }
      >
        <Box sx={{ minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain' }}>
          {content}
        </Box>
      </RoundBriefingPanel>
    )
  }
  return (
    <SectionCard surface="inset" sx={{ p: 0 }} data-testid="quiz-leaderboard">
      <DisclosureSection
        title={t('gameHistory.quizLeaderboardTitle')}
        description={t('gameHistory.quizLeaderboardDescription')}
        countLabel={t('gameHistory.summary.playerCountShort', { count: leaderboard.length })}
        defaultExpanded={defaultExpanded}
      >
        {content}
      </DisclosureSection>
    </SectionCard>
  )
}
