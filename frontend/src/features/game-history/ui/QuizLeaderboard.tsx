import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
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
}: {
  entries: readonly QuizPlayer[]
  defaultExpanded?: boolean
}) {
  const { t } = useTranslation()
  const leaderboard = sortQuizLeaderboardEntries(entries)

  return (
    <SectionCard surface="inset" sx={{ p: 0 }} data-testid="quiz-leaderboard">
      <DisclosureSection
        title={t('gameHistory.quizLeaderboardTitle')}
        description={t('gameHistory.quizLeaderboardDescription')}
        countLabel={t('gameHistory.summary.playerCountShort', { count: leaderboard.length })}
        defaultExpanded={defaultExpanded}
      >
        {leaderboard.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('gameHistory.quizLeaderboardEmpty')}
          </Typography>
        ) : (
          <RankingList
            label={t('gameHistory.quizLeaderboardTitle')}
            rankLabel={t('gameHistory.table.rank')}
            nameLabel={t('common.entities.player')}
            valueLabel={t('gameHistory.quizLeaderboardEarned')}
            rowTestId="quiz-leaderboard-row"
            entries={leaderboard.map((entry) => ({
              id: entry.userId,
              name: entry.displayName,
              value: t('gameHistory.pointsValue', { points: entry.points }),
              detail: t('gameHistory.quizLeaderboardAnswerStats', {
                attempts: entry.attempts,
                correct: entry.correctAnswers,
              }),
            }))}
          />
        )}
      </DisclosureSection>
    </SectionCard>
  )
}
