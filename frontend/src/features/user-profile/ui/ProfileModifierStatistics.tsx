import { useStatisticsFormat } from '../use-statistics-format.ts'
import { Stack, Typography } from '@mui/material'
import { Metric, NativeDisclosure, SectionDivider } from '../../../shared/ui/index.ts'
import {
  StatisticsMetrics,
  StatisticsSection,
  type Statistics,
} from './ProfileStatisticsShared.tsx'

const outcomeKeys = {
  pending: 'userProfile.stats.outcomePending',
  completed: 'userProfile.stats.outcomeCompleted',
  failed: 'userProfile.stats.outcomeFailed',
  cancelled: 'userProfile.stats.outcomeCancelled',
  violated: 'userProfile.stats.outcomeViolated',
  not_triggered: 'userProfile.stats.outcomeNotTriggered',
  succeeded: 'userProfile.stats.outcomeSucceeded',
  not_succeeded: 'userProfile.stats.outcomeNotSucceeded',
  calculated: 'userProfile.stats.outcomeCalculated',
} as const

export function ProfileModifierStatistics({
  modifiers: m,
}: {
  modifiers: Statistics['modifiers']
}) {
  const { t, number, percent } = useStatisticsFormat()
  return (
    <StatisticsSection
      title={t('userProfile.stats.modifiers')}
      description={t('userProfile.stats.modifiersHelp')}
    >
      <StatisticsMetrics
        items={[
          [t('userProfile.stats.ordered'), m.orderedCount],
          [t('userProfile.stats.appliedModifiers'), m.appliedCount],
          [t('userProfile.stats.cancelled'), m.cancelledCount],
          [t('userProfile.stats.pending'), m.pendingCount],
          [t('userProfile.stats.paid'), m.paidCount],
          [t('userProfile.stats.free'), m.freeCount],
          [t('userProfile.stats.uniqueModifiers'), m.uniqueCount],
          [t('userProfile.stats.appliedRate'), percent(m.appliedCount, m.orderedCount)],
          [t('userProfile.stats.modifiedGames'), m.gameCount],
          [t('userProfile.stats.modifiedRounds'), m.roundCount],
        ]}
      />
      <Metric
        appearance="row"
        density="compact"
        label={t('userProfile.stats.mostUsed')}
        value={
          m.mostUsed
            ? t('userProfile.stats.namedCount', {
                name: m.mostUsed.name,
                value: number(m.mostUsed.count),
              })
            : t('userProfile.stats.noData')
        }
      />
      <NativeDisclosure
        indicator="chevron"
        density="compact"
        summary={t('userProfile.stats.modifierDetails')}
      >
        <Stack spacing={1}>
          <Typography component="h3" variant="subtitle2">
            {t('userProfile.stats.modifierCategories')}
          </Typography>
          {m.categories.length === 0 ? (
            <Typography variant="body2">{t('userProfile.stats.noData')}</Typography>
          ) : (
            m.categories.map((category) => (
              <Metric
                key={category.name}
                appearance="row"
                label={category.name}
                value={number(category.count)}
              />
            ))
          )}
          <SectionDivider />
          <Typography component="h3" variant="subtitle2">
            {t('userProfile.stats.modifierOutcomes')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('userProfile.stats.outcomesHelp')}
          </Typography>
          {m.outcomes.length === 0 ? (
            <Typography variant="body2">{t('userProfile.stats.noData')}</Typography>
          ) : (
            m.outcomes.map((outcome) => (
              <Metric
                key={outcome.outcome}
                appearance="row"
                label={t(
                  Object.entries(outcomeKeys).find(([key]) => key === outcome.outcome)?.[1] ??
                    'userProfile.stats.outcomeOther',
                )}
                value={number(outcome.count)}
              />
            ))
          )}
        </Stack>
      </NativeDisclosure>
    </StatisticsSection>
  )
}
