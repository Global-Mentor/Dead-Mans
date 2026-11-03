import { Box, Typography } from '@mui/material'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import type { CurrentGameQuizState } from '../../shared/api/contracts/index.ts'
import { RoundBriefingPanel, summarizeQuizFormats } from '../../shared/game-ui/index.ts'
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
  const formats = summarizeQuizFormats(
    { questionSessions: quiz?.questionSessions ?? [], playerStats: own ? [own] : [] },
    current,
  )
  const number = (value: number) => value.toLocaleString(i18n.resolvedLanguage)
  const metrics = [
    {
      label: t('gameQuiz.leaderboardAvailableTitle'),
      value: number(own?.availablePoints ?? 0),
      help: t('gameQuiz.leaderboardAvailableDescription'),
    },
    {
      label: t('gameQuiz.leaderboardEarnedTitle'),
      value: number(own?.points ?? 0),
      help: t('gameQuiz.leaderboardEarnedDescription'),
    },
  ]
  const groups = [
    { title: t('common.quizStatistics.balance'), metrics },
    ...(['text', 'screenshot'] as const).map((format) => ({
      title: t(`common.quizStandings.${format === 'text' ? 'text' : 'screenshots'}`),
      metrics: [
        {
          label: t('common.quizStatistics.correctIncorrect'),
          value: t('common.quizStatistics.correctIncorrectValue', {
            correct: number(formats[format].correct),
            incorrect: number(formats[format].incorrect),
          }),
        },
        {
          label: t('common.quizStatistics.asked'),
          value: number(formats[format].asked),
          help: t('common.quizStatistics.askedHelp'),
        },
      ],
    })),
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
          rowGap: 0.5,
          py: 0.75,
        }}
      >
        {groups.map((group, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <SectionDivider orientation="vertical" flexItem sx={{ gridRow: 'span 5' }} />
            ) : null}
            <Box
              component="section"
              aria-label={group.title}
              sx={{
                minWidth: 0,
                display: 'grid',
                gridTemplateRows: 'subgrid',
                gridRow: 'span 5',
              }}
            >
              <Typography component="h3" variant="body2" fontWeight={700} textAlign="center">
                {group.title}
              </Typography>
              <SectionDivider />
              {group.metrics.map((metric, metricIndex) => (
                <Fragment key={metric.label}>
                  {metricIndex > 0 ? <SectionDivider /> : null}
                  <Metric
                    appearance="summary"
                    density="compact"
                    emphasis="label"
                    label={metric.label}
                    value={metric.value}
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
