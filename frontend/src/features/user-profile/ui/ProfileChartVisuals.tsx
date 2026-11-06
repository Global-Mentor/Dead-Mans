import { Box, Stack, Typography, useTheme } from '@mui/material'
import { useStatisticsFormat } from '../use-statistics-format.ts'

export type ChartValue = { label: string; value: number; color: string }

export function ProfileDistributionChart({
  label,
  values,
}: {
  label: string
  values: ChartValue[]
}) {
  const theme = useTheme()
  const { t, number, percent } = useStatisticsFormat()
  const total = values.reduce((sum, item) => sum + item.value, 0)
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '140px minmax(0, 1fr)',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Box sx={{ position: 'relative', width: 140, height: 140 }}>
        <svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label={label}>
          <circle
            cx="70"
            cy="70"
            r="55"
            fill="none"
            stroke={theme.palette.action.hover}
            strokeWidth="14"
          />
          {values.map((item, index) => {
            const share = total > 0 ? (item.value / total) * 100 : 0
            const start =
              total > 0
                ? (values.slice(0, index).reduce((sum, entry) => sum + entry.value, 0) / total) *
                  100
                : 0
            return share > 0 ? (
              <circle
                key={item.label}
                cx="70"
                cy="70"
                r="55"
                fill="none"
                stroke={item.color}
                strokeWidth="14"
                pathLength="100"
                strokeDasharray={`${share} ${100 - share}`}
                strokeDashoffset={-start}
                transform="rotate(-90 70 70)"
              />
            ) : null
          })}
        </svg>
        <Stack
          sx={{ position: 'absolute', inset: 20, justifyContent: 'center', textAlign: 'center' }}
        >
          <Typography variant="subtitle1" sx={{ overflowWrap: 'anywhere' }}>
            {number(total)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('userProfile.charts.total')}
          </Typography>
        </Stack>
      </Box>
      <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0, minWidth: 0 }}>
        {values.map((item) => (
          <Stack component="li" key={item.label} spacing={0.25}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box aria-hidden sx={{ width: 8, height: 8, flexShrink: 0, bgcolor: item.color }} />
              <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                {item.label}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              {number(item.value)} · {percent(item.value, total)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

export function ProfileChartBars({ values }: { values: ChartValue[] }) {
  const { number } = useStatisticsFormat()
  const maximum = Math.max(1, ...values.map((item) => item.value))
  return (
    <Stack spacing={1.5} component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {values.map((item) => (
        <Stack component="li" key={item.label} spacing={0.5}>
          <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="baseline">
            <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              {item.label}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                minWidth: 0,
                textAlign: 'end',
                overflowWrap: 'anywhere',
              }}
            >
              {number(item.value)}
            </Typography>
          </Stack>
          <Box aria-hidden sx={{ height: 8, bgcolor: 'action.hover' }}>
            <Box
              sx={{
                height: '100%',
                width: `${(item.value / maximum) * 100}%`,
                bgcolor: item.color,
              }}
            />
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}

export function ProfileAccuracyBar({
  label,
  correct,
  total,
}: {
  label: string
  correct: number
  total: number
}) {
  const { t, number, percent } = useStatisticsFormat()
  return (
    <Stack spacing={0.5}>
      <Stack
        direction="row"
        spacing={1}
        justifyContent="space-between"
        alignItems="baseline"
        flexWrap="wrap"
      >
        <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          {t('userProfile.charts.correctOfTotal', {
            correct: number(correct),
            total: number(total),
            percent: percent(correct, total),
          })}
        </Typography>
      </Stack>
      <Box aria-hidden sx={{ height: 8, bgcolor: 'action.hover' }}>
        <Box
          sx={{
            height: '100%',
            width: `${total > 0 ? (correct / total) * 100 : 0}%`,
            bgcolor: 'success.main',
          }}
        />
      </Box>
    </Stack>
  )
}
