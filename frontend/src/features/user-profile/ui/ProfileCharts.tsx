import { Box, Stack, Typography, useTheme } from '@mui/material'
import { useStatisticsFormat } from '../use-statistics-format.ts'
import { StatisticsSection, type Statistics } from './ProfileStatisticsShared.tsx'
import { ProfileActivityChart } from './ProfileActivityChart.tsx'
import {
  ProfileAccuracyBar,
  ProfileChartBars,
  ProfileDistributionChart,
} from './ProfileChartVisuals.tsx'

export function ProfileCharts({ statistics: s }: { statistics: Statistics }) {
  const { t } = useStatisticsFormat()
  const { palette } = useTheme()
  const quiz = s.quiz
  const modifiers = s.modifiers
  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <ProfileActivityChart months={s.activity.months} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
          alignItems: 'stretch',
          gap: 2,
        }}
      >
        <StatisticsSection
          title={t('userProfile.charts.answerDistribution')}
          description={t('userProfile.stats.answersHelp')}
        >
          <ProfileDistributionChart
            label={t('userProfile.charts.answerDistribution')}
            values={[
              {
                label: t('userProfile.correctAnswers'),
                value: quiz.correctAnswerCount,
                color: palette.success.main,
              },
              {
                label: t('userProfile.stats.incorrectAnswers'),
                value: quiz.incorrectAnswerCount,
                color: palette.error.main,
              },
            ]}
          />
          <ProfileAccuracyBar
            label={t('userProfile.stats.text')}
            correct={quiz.text.correctAnswerCount}
            total={quiz.text.answerCount}
          />
          <ProfileAccuracyBar
            label={t('userProfile.stats.screenshot')}
            correct={quiz.screenshot.correctAnswerCount}
            total={quiz.screenshot.answerCount}
          />
        </StatisticsSection>
        <StatisticsSection
          title={t('userProfile.charts.modifierDistribution')}
          description={t('userProfile.stats.modifiersHelp')}
        >
          <ProfileDistributionChart
            label={t('userProfile.charts.modifierDistribution')}
            values={[
              {
                label: t('userProfile.stats.appliedModifiers'),
                value: modifiers.appliedCount,
                color: palette.success.main,
              },
              {
                label: t('userProfile.stats.cancelled'),
                value: modifiers.cancelledCount,
                color: palette.error.main,
              },
              {
                label: t('userProfile.stats.pending'),
                value: modifiers.pendingCount,
                color: palette.warning.main,
              },
            ]}
          />
          <ProfileChartBars
            values={[
              {
                label: t('userProfile.stats.paid'),
                value: modifiers.paidCount,
                color: palette.primary.main,
              },
              {
                label: t('userProfile.stats.free'),
                value: modifiers.freeCount,
                color: palette.info.main,
              },
            ]}
          />
        </StatisticsSection>
        <StatisticsSection
          title={t('userProfile.charts.pointsFlow')}
          description={t('userProfile.stats.pointsHelp')}
        >
          <ProfileChartBars
            values={[
              {
                label: t('userProfile.quizPoints'),
                value: s.awardedQuizPoints,
                color: palette.success.main,
              },
              {
                label: t('userProfile.stats.manualAwarded'),
                value: s.points.manualAwarded,
                color: palette.success.main,
              },
              {
                label: t('userProfile.stats.spent'),
                value: s.points.spent,
                color: palette.warning.main,
              },
              {
                label: t('userProfile.stats.refunded'),
                value: s.points.refunded,
                color: palette.info.main,
              },
              {
                label: t('userProfile.stats.manualDeducted'),
                value: s.points.manualDeducted,
                color: palette.error.main,
              },
            ]}
          />
        </StatisticsSection>
        <StatisticsSection
          title={t('userProfile.charts.categoryAccuracy')}
          description={t('userProfile.charts.categoryHelp')}
        >
          {quiz.categories.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('userProfile.stats.noData')}
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {quiz.categories.map((category) => (
                <ProfileAccuracyBar
                  key={category.name}
                  label={category.name}
                  correct={category.correctAnswerCount}
                  total={category.answerCount}
                />
              ))}
            </Stack>
          )}
        </StatisticsSection>
      </Box>
    </Stack>
  )
}
