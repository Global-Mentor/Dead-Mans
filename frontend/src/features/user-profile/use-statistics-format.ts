import { useTranslation } from 'react-i18next'

export function useStatisticsFormat() {
  const { t, i18n } = useTranslation()
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })
  const percentage = new Intl.NumberFormat(i18n.language, {
    style: 'percent',
    maximumFractionDigits: 1,
  })
  return {
    t,
    number: (value: number) => number.format(value),
    percent: (part: number, total: number) => percentage.format(total > 0 ? part / total : 0),
    average: (total: number, count: number) => number.format(count > 0 ? total / count : 0),
    date: (value: string | null) =>
      value
        ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeZone: 'UTC' }).format(
            new Date(value),
          )
        : t('userProfile.stats.noData'),
    month: (value: string) =>
      new Intl.DateTimeFormat(i18n.language, {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${value}-01T00:00:00Z`)),
  }
}
