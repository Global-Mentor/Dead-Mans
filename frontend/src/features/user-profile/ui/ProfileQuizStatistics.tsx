import { useStatisticsFormat } from '../use-statistics-format.ts'
import { Stack, Typography } from '@mui/material'
import { NativeDisclosure, SectionDivider } from '../../../shared/ui/index.ts'
import {
  StatisticsMetrics,
  StatisticsSection,
  type Statistics,
} from './ProfileStatisticsShared.tsx'

export function ProfileQuizStatistics({
  quiz: q,
  quizGameCount,
}: {
  quiz: Statistics['quiz']
  quizGameCount: number
}) {
  const { t, percent, average } = useStatisticsFormat()
  return (
    <StatisticsSection
      title={t('userProfile.stats.answerRecords')}
      description={t('userProfile.stats.answersHelp')}
    >
      <StatisticsMetrics
        items={[
          [t('userProfile.totalAnswers'), q.answerCount],
          [t('userProfile.correctAnswers'), q.correctAnswerCount],
          [t('userProfile.stats.incorrectAnswers'), q.incorrectAnswerCount],
          [t('userProfile.stats.correctRate'), percent(q.correctAnswerCount, q.answerCount)],
          [t('userProfile.stats.longestStreak'), q.longestCorrectStreak],
          [t('userProfile.stats.maxCorrect'), q.maxCorrectAnswersPerGame],
          [t('userProfile.stats.maxPoints'), q.maxPointsPerGame],
          [t('userProfile.stats.answersPerQuiz'), average(q.answerCount, quizGameCount)],
        ]}
      />
      <NativeDisclosure
        indicator="chevron"
        density="compact"
        summary={t('userProfile.stats.byFormat')}
      >
        <Stack spacing={1.5}>
          {(['text', 'screenshot'] as const).map((kind) => (
            <Stack key={kind} spacing={1}>
              <Typography component="h3" variant="subtitle2">
                {t(`userProfile.stats.${kind}`)}
              </Typography>
              <StatisticsMetrics
                items={[
                  [t('userProfile.totalAnswers'), q[kind].answerCount],
                  [t('userProfile.correctAnswers'), q[kind].correctAnswerCount],
                  [
                    t('userProfile.stats.correctRate'),
                    percent(q[kind].correctAnswerCount, q[kind].answerCount),
                  ],
                  [t('userProfile.quizPoints'), q[kind].points],
                ]}
              />
            </Stack>
          ))}
        </Stack>
      </NativeDisclosure>
      <NativeDisclosure
        indicator="chevron"
        density="compact"
        summary={t('userProfile.stats.byCategory')}
      >
        <Stack spacing={1.5}>
          {q.categories.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('userProfile.stats.noData')}
            </Typography>
          ) : (
            q.categories.map((category) => (
              <Stack key={category.name} spacing={1}>
                <Typography component="h3" variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
                  {category.name}
                </Typography>
                <StatisticsMetrics
                  items={[
                    [t('userProfile.totalAnswers'), category.answerCount],
                    [t('userProfile.correctAnswers'), category.correctAnswerCount],
                    [
                      t('userProfile.stats.correctRate'),
                      percent(category.correctAnswerCount, category.answerCount),
                    ],
                    [t('userProfile.quizPoints'), category.points],
                  ]}
                />
                <SectionDivider />
              </Stack>
            ))
          )}
        </Stack>
      </NativeDisclosure>
    </StatisticsSection>
  )
}
