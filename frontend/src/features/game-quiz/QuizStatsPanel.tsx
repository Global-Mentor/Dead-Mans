import { Box } from '@mui/material'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import type { CurrentGameQuizState } from '../../shared/api/contracts/index.ts'
import { RoundBriefingPanel } from '../../shared/game-ui/index.ts'
import { Metric, SectionDivider } from '../../shared/ui/index.ts'

export function QuizStatsPanel({
  quiz,
  current,
  currentUserId,
}: {
  quiz: components['schemas']['GameHistoryQuizSectionDto'] | null
  current: CurrentGameQuizState | null
  currentUserId: string | null
}) {
  const { t, i18n } = useTranslation()
  const own = quiz?.playerStats.find((entry) => entry.userId === currentUserId)
  const questions = new Set(quiz?.questionSessions.map((question) => question.questionSessionId))
  if (current) questions.add(current.questionSessionId)
  const number = (value: number) => value.toLocaleString(i18n.resolvedLanguage)
  const metrics = [
    {
      label: t('gameQuiz.leaderboardAvailableTitle'),
      value: own?.availablePoints ?? 0,
      help: t('gameQuiz.leaderboardAvailableDescription'),
    },
    {
      label: t('gameQuiz.leaderboardEarnedTitle'),
      value: own?.points ?? 0,
      help: t('gameQuiz.leaderboardEarnedDescription'),
    },
    { label: t('gameQuiz.correctAnswersLabel'), value: own?.correctAnswers ?? 0 },
    {
      label: t('gameQuiz.incorrectAnswersLabel'),
      value: Math.max(0, (own?.attempts ?? 0) - (own?.correctAnswers ?? 0)),
    },
    { label: t('gameQuiz.questionsAskedLabel'), value: questions.size },
  ]
  return (
    <RoundBriefingPanel
      component="section"
      aria-label={t('gameQuiz.personalStatsTitle')}
      sx={{ px: 1.5, py: 0 }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)',
          columnGap: 1,
          py: 0.75,
        }}
      >
        {[metrics.slice(0, 2), metrics.slice(2, 4), metrics.slice(4)].map((group, index) => (
          <Fragment key={index}>
            {index > 0 ? <SectionDivider orientation="vertical" flexItem /> : null}
            <Box
              sx={{
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 0.5,
              }}
            >
              {group.map((metric, metricIndex) => (
                <Fragment key={metric.label}>
                  {metricIndex > 0 ? <SectionDivider /> : null}
                  <Metric
                    appearance="summary"
                    density="compact"
                    emphasis="label"
                    label={metric.label}
                    value={number(metric.value)}
                    {...(metric.help ? { help: metric.help } : {})}
                  />
                </Fragment>
              ))}
            </Box>
          </Fragment>
        ))}
      </Box>
    </RoundBriefingPanel>
  )
}
