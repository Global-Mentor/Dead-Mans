import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { RankingList } from '../ui/index.ts'
import type { QuizStanding } from './quiz-standings.ts'

export function QuizStandingsList({
  entries,
  compact = true,
  currentUserId,
  rankOffset = 0,
  valueMode = 'earned',
}: {
  entries: readonly QuizStanding[]
  compact?: boolean
  currentUserId?: string
  rankOffset?: number
  valueMode?: 'earned' | 'available'
}) {
  const { t } = useTranslation()
  if (!entries.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('common.quizStandings.empty')}
      </Typography>
    )
  }
  return (
    <RankingList
      density={compact ? 'compact' : 'default'}
      alignment={compact ? 'center' : 'default'}
      highlightAppearance="selected"
      detailLabels={[t('common.quizStandings.text'), t('common.quizStandings.screenshots')]}
      label={t('common.quizStandings.title')}
      rankLabel={t('common.teamStandings.rank')}
      nameLabel={t('common.entities.player')}
      valueLabel={t(`common.quizStandings.${valueMode}`)}
      rowTestId="quiz-leaderboard-row"
      entries={entries.map((entry, index) => ({
        id: entry.userId ?? String(index + rankOffset),
        rank: index + rankOffset + 1,
        highlighted: Boolean(compact && currentUserId && entry.userId === currentUserId),
        name: entry.displayName,
        value: t('common.quizStandings.points', {
          points: valueMode === 'available' ? (entry.availablePoints ?? 0) : entry.points,
        }),
        details: [entry.textStatistics, entry.screenshotStatistics].map((statistics) =>
          t('common.quizStandings.answerRatio', {
            correct: statistics?.correctAnswers ?? 0,
            attempts: statistics?.attempts ?? 0,
          }),
        ),
      }))}
    />
  )
}
