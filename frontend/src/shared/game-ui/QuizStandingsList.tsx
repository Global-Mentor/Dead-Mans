import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { RankingList } from '../ui/index.ts'
import type { QuizStanding } from './quiz-standings.ts'

export function QuizStandingsList({
  entries,
  compact = true,
  currentUserId,
  rankOffset = 0,
}: {
  entries: readonly QuizStanding[]
  compact?: boolean
  currentUserId?: string
  rankOffset?: number
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
      {...(compact ? { detailLabel: t('common.quizStandings.answers') } : {})}
      label={t('common.quizStandings.title')}
      rankLabel={t('common.teamStandings.rank')}
      nameLabel={t('common.entities.player')}
      valueLabel={t('common.quizStandings.earned')}
      rowTestId="quiz-leaderboard-row"
      entries={entries.map((entry, index) => ({
        id: entry.userId ?? String(index + rankOffset),
        rank: index + rankOffset + 1,
        highlighted: Boolean(compact && currentUserId && entry.userId === currentUserId),
        name: entry.displayName,
        value: t('common.quizStandings.points', { points: entry.points }),
        detail: t(
          compact ? 'common.quizStandings.answerRatio' : 'common.quizStandings.answerStats',
          {
            attempts: entry.attempts,
            correct: entry.correctAnswers,
          },
        ),
      }))}
    />
  )
}
