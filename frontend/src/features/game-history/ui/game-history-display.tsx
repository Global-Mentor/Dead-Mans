import { Box, Chip, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { getRankColor } from '../model/game-history-formatters.ts'

export function MiniMetricChip({ label }: { label: string }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={label}
      sx={{
        '& .MuiChip-label': {
          px: 1,
          fontSize: '0.73rem',
          fontWeight: 600,
        },
      }}
    />
  )
}

export function RankBadge({ rank, compact = false }: { rank: number; compact?: boolean }) {
  return (
    <Box
      sx={(theme) => ({
        width: compact ? 30 : 38,
        height: compact ? 30 : 38,
        borderRadius: 1.4,
        display: 'grid',
        placeItems: 'center',
        fontSize: compact ? '0.82rem' : '0.95rem',
        fontWeight: 900,
        color: theme.palette.common.white,
        backgroundColor: getRankColor(theme, rank),
        flexShrink: 0,
        boxShadow: compact ? 'none' : `0 10px 18px ${alpha(theme.palette.common.black, 0.16)}`,
      })}
    >
      {rank}
    </Box>
  )
}

export function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={(theme) => ({
        minWidth: 0,
        borderRadius: 1.5,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.3),
        px: 0.9,
        py: 0.75,
      })}
    >
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 850 }} noWrap>
        {value}
      </Typography>
    </Box>
  )
}

export function ColumnLabel({
  children,
  align = 'left',
}: {
  children: ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 800,
        textAlign: align,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Typography>
  )
}

export function TableValue({
  children,
  strong = false,
  hideOnMobile = false,
}: {
  children: ReactNode
  strong?: boolean
  hideOnMobile?: boolean
}) {
  return (
    <Typography
      variant="body2"
      sx={{
        display: hideOnMobile ? 'none' : 'block',
        ...(hideOnMobile
          ? {
              '@container standings (min-width: 620px)': {
                display: 'block',
              },
            }
          : {}),
        fontWeight: strong ? 900 : 750,
        color: strong ? 'primary.light' : 'text.secondary',
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
      }}
    >
      {children}
    </Typography>
  )
}
