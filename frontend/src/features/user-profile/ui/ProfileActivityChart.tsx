import { Box, Stack, Typography, useMediaQuery, useTheme } from '@mui/material'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormSelect, NativeDisclosure } from '../../../shared/ui/index.ts'
import { useStatisticsFormat } from '../use-statistics-format.ts'
import {
  StatisticsMetrics,
  StatisticsSection,
  type Statistics,
} from './ProfileStatisticsShared.tsx'

type Month = Statistics['activity']['months'][number]
type Series = 'answerCount' | 'roundCount' | 'modifierCount' | 'gameCount'

export function ProfileActivityChart({ months }: { months: Month[] }) {
  const { t, number, month } = useStatisticsFormat()
  const { i18n } = useTranslation()
  const axisMonth = new Intl.DateTimeFormat(i18n.language, { month: 'short', timeZone: 'UTC' })
  const theme = useTheme()
  const compact = useMediaQuery('(max-width: 599px)')
  const gradientId = useId()
  const [series, setSeries] = useState<Series>('answerCount')
  const options: { value: Series; label: string }[] = [
    { value: 'answerCount', label: t('userProfile.charts.answers') },
    { value: 'roundCount', label: t('userProfile.charts.rounds') },
    { value: 'modifierCount', label: t('userProfile.charts.orders') },
    { value: 'gameCount', label: t('userProfile.charts.games') },
  ]
  const label = options.find((option) => option.value === series)?.label ?? ''
  const values = months.map((entry) => entry[series])
  const maximum = Math.max(0, ...values)
  const total = values.reduce((sum, value) => sum + value, 0)
  const width = compact ? 360 : 840
  const baseline = 168
  const points = values.map((value, index) => ({
    x: 12 + (index / Math.max(1, values.length - 1)) * (width - 24),
    y: baseline - (value / Math.max(1, maximum)) * 148,
  }))
  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ')
  const first = points[0]
  const last = points.at(-1)
  return (
    <StatisticsSection
      title={t('userProfile.charts.monthly')}
      description={t('userProfile.charts.monthlyHelp')}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <FormSelect<Series>
          label={t('userProfile.charts.metric')}
          density="compact"
          value={series}
          onChange={setSeries}
          options={options}
          sx={{ width: { xs: '100%', sm: 260 } }}
        />
        <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          {t(
            series === 'gameCount'
              ? 'userProfile.charts.gamesSeriesSummary'
              : 'userProfile.charts.seriesSummary',
            { total: number(total), peak: number(maximum) },
          )}
        </Typography>
      </Stack>
      <Box component="figure" sx={{ m: 0, minWidth: 0 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `${maximum >= 1_000_000 ? 84 : 44}px minmax(0, 1fr)`,
          }}
        >
          <Box aria-hidden sx={{ position: 'relative', height: 180, minWidth: 0 }}>
            {(maximum > 0
              ? [
                  { value: maximum, y: 20 },
                  { value: maximum / 2, y: 94 },
                  { value: 0, y: baseline },
                ]
              : [{ value: 0, y: baseline }]
            ).map((tick) => (
              <Typography
                key={tick.y}
                variant="caption"
                color="text.secondary"
                sx={{
                  position: 'absolute',
                  top: tick.y,
                  right: 8,
                  left: 0,
                  transform: 'translateY(-50%)',
                  textAlign: 'end',
                  overflowWrap: 'anywhere',
                }}
              >
                {number(tick.value)}
              </Typography>
            ))}
          </Box>
          <svg
            viewBox={`0 0 ${width} 180`}
            width="100%"
            height="180"
            preserveAspectRatio="none"
            role="img"
            aria-label={`${t('userProfile.charts.monthly')} · ${label}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity="0.3" />
                <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[20, 94, baseline].map((y) => (
              <line
                key={y}
                x1="12"
                x2={width - 12}
                y1={y}
                y2={y}
                stroke={theme.palette.divider}
                strokeDasharray={y === baseline ? undefined : '4 5'}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {first && last ? (
              <path
                d={`${line} L${last.x},${baseline} L${first.x},${baseline} Z`}
                fill={`url(#${gradientId})`}
              />
            ) : null}
            <path
              d={line}
              fill="none"
              stroke={theme.palette.primary.main}
              strokeWidth="2.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {points.map((point, index) => (
              <circle
                key={months[index]?.month}
                cx={point.x}
                cy={point.y}
                r="3.5"
                fill={theme.palette.background.paper}
                stroke={theme.palette.primary.main}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <Box />
          <Box aria-hidden sx={{ position: 'relative', height: 24, minWidth: 0 }}>
            {months.map((entry, index) => {
              const point = points[index]
              const isLast = index === months.length - 1
              const show = compact
                ? index === 0 || index === Math.floor((months.length - 1) / 2) || isLast
                : (index % 2 === 0 && index < months.length - 2) || isLast
              if (!point || !show) return null
              return (
                <Typography
                  key={entry.month}
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    position: 'absolute',
                    left: `${(point.x / width) * 100}%`,
                    transform:
                      index === 0 ? undefined : isLast ? 'translateX(-100%)' : 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {axisMonth.format(new Date(`${entry.month}-01T00:00:00Z`))}
                </Typography>
              )
            })}
          </Box>
        </Box>
        <Typography
          component="figcaption"
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, mb: 1 }}
        >
          {t('userProfile.charts.monthValues', { series: label })}
        </Typography>
        <Box
          component="ol"
          aria-label={t('userProfile.charts.monthValues', { series: label })}
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(4, minmax(0, 1fr))',
              sm: 'repeat(6, minmax(0, 1fr))',
              lg: 'repeat(12, minmax(0, 1fr))',
            },
            gap: 1,
            m: 0,
            p: 0,
            listStyle: 'none',
          }}
        >
          {months.map((entry) => (
            <Stack
              component="li"
              key={entry.month}
              spacing={0.25}
              textAlign="center"
              sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
            >
              <Typography variant="body2">{number(entry[series])}</Typography>
              <Typography variant="caption" color="text.secondary">
                {month(entry.month)}
              </Typography>
            </Stack>
          ))}
        </Box>
        {maximum === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
            {t('userProfile.charts.noActivity')}
          </Typography>
        ) : null}
      </Box>
      <NativeDisclosure
        indicator="chevron"
        density="compact"
        summary={t('userProfile.stats.monthlyBreakdown')}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          {months.map((entry) => (
            <Stack key={entry.month} spacing={1}>
              <Typography component="h3" variant="subtitle2">
                {month(entry.month)}
              </Typography>
              <StatisticsMetrics
                items={[
                  [t('userProfile.stats.activeGames'), entry.gameCount],
                  [t('userProfile.completedRounds'), entry.roundCount],
                  [t('userProfile.totalAnswers'), entry.answerCount],
                  [t('userProfile.stats.ordered'), entry.modifierCount],
                ]}
              />
            </Stack>
          ))}
        </Box>
      </NativeDisclosure>
    </StatisticsSection>
  )
}
