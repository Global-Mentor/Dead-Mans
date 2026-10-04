import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { RankBadge } from '../../primitives/metrics/RankBadge.tsx'

interface RankingEntry {
  id: string
  name: string
  value: ReactNode
  detail: ReactNode
  highlighted?: boolean
}
/** Presentation only: caller owns ordering and the meaning of the value. */
export function RankingList({
  entries,
  label,
  rankLabel,
  nameLabel,
  valueLabel,
  detailLabel,
  density = 'default',
  rowTestId,
  alignment = 'default',
}: {
  entries: readonly RankingEntry[]
  label: string
  rankLabel: string
  nameLabel: string
  valueLabel: string
  detailLabel?: string
  density?: 'default' | 'compact'
  alignment?: 'default' | 'center'
  rowTestId?: string
}) {
  const centered = alignment === 'center'
  const compact = density === 'compact'
  const columns = detailLabel
    ? 'minmax(40px, 0.5fr) minmax(0, 1.8fr) minmax(64px, 1fr) minmax(72px, 1.2fr)'
    : centered
      ? 'minmax(56px, 0.6fr) minmax(0, 2fr) minmax(72px, 1fr)'
      : '32px minmax(0, 1fr) minmax(60px, 0.5fr)'
  const headers = detailLabel
    ? [rankLabel, nameLabel, detailLabel, valueLabel]
    : [rankLabel, nameLabel, valueLabel]
  return (
    <Box role="table" aria-label={label} sx={{ minWidth: 0 }}>
      <Box
        role="row"
        sx={{ display: 'grid', gridTemplateColumns: columns, gap: 1, px: 1.25, py: 1 }}
      >
        {headers.map((text, index) => (
          <Typography
            key={index}
            role="columnheader"
            variant="caption"
            color="text.secondary"
            sx={{
              textAlign: centered ? 'center' : index === headers.length - 1 ? 'right' : 'left',
              overflowWrap: 'anywhere',
            }}
          >
            {text}
          </Typography>
        ))}
      </Box>
      <Box role="rowgroup">
        {entries.map((entry, index) => (
          <Box
            key={entry.id}
            role="row"
            data-testid={rowTestId}
            sx={(theme) => ({
              display: 'grid',
              gridTemplateColumns: columns,
              gap: 1,
              alignItems: 'center',
              px: 1.25,
              py: compact ? 0.75 : centered ? 1.5 : 1,
              minHeight: compact ? 44 : centered ? 68 : undefined,
              textAlign: centered ? 'center' : undefined,
              backgroundColor: alpha(
                theme.palette.primary.main,
                entry.highlighted ? 0.17 : index % 2 === 0 ? 0.065 : 0,
              ),
              borderBottom: '1px solid',
              borderColor: 'divider',
              overflowWrap: 'anywhere',
            })}
          >
            <Box role="cell">
              <RankBadge rank={index + 1} compact={compact || !centered} />
            </Box>
            <Box role="cell" sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={750}>
                {entry.name}
              </Typography>
              {!detailLabel ? (
                <Typography variant="caption" color="text.secondary" display="block">
                  {entry.detail}
                </Typography>
              ) : null}
            </Box>
            {detailLabel ? (
              <Typography
                role="cell"
                variant="body2"
                color="text.secondary"
                sx={{ minWidth: 0, fontVariantNumeric: 'tabular-nums' }}
              >
                {entry.detail}
              </Typography>
            ) : null}
            <Typography
              role="cell"
              variant="body2"
              color="primary.light"
              sx={{
                fontWeight: 900,
                minWidth: 0,
                textAlign: centered ? 'center' : 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {entry.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
