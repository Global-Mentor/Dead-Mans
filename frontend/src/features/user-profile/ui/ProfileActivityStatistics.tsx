import { useStatisticsFormat } from '../use-statistics-format.ts'
import {
  StatisticsMetrics,
  StatisticsSection,
  type Statistics,
} from './ProfileStatisticsShared.tsx'

export function ProfileActivityStatistics({ activity: a }: { activity: Statistics['activity'] }) {
  const { t, date } = useStatisticsFormat()
  return (
    <StatisticsSection
      title={t('userProfile.stats.activity')}
      description={t('userProfile.stats.activityHelp')}
    >
      <StatisticsMetrics
        columns={3}
        items={[
          [t('userProfile.stats.firstActivity'), date(a.firstActivityAtUtc)],
          [t('userProfile.stats.lastActivity'), date(a.lastActivityAtUtc)],
          [t('userProfile.stats.activeDays'), a.activeDayCount],
        ]}
      />
    </StatisticsSection>
  )
}
