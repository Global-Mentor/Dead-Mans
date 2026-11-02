import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { QuizStanding } from './quiz-standings.ts'

export function QuizFormatStatistics({ entry }: { entry: QuizStanding }) {
  const { t } = useTranslation()
  if (!entry.textStatistics || !entry.screenshotStatistics) return null
  return (
    <Stack component="span" gap={0.25}>
      {[
        { key: 'text', stats: entry.textStatistics },
        { key: 'screenshots', stats: entry.screenshotStatistics },
      ].map(({ key, stats }) => (
        <Typography component="span" variant="caption" key={key}>
          {t('common.quizStandings.formatStatistics', {
            format: t(
              key === 'text' ? 'common.quizStandings.text' : 'common.quizStandings.screenshots',
            ),
            correct: stats.correctAnswers,
            attempts: stats.attempts,
            points: stats.points,
          })}
        </Typography>
      ))}
    </Stack>
  )
}
