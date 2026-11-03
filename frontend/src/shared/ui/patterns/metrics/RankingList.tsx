import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { itemCardSx } from '../../primitives/surfaces/item-card-sx.ts'
import { RankBadge } from '../../primitives/metrics/RankBadge.tsx'

interface RankingEntry {
  id: string
  rank?: number
  name: string
  value: ReactNode
  details: readonly ReactNode[]
  highlighted?: boolean
}
/** Presentation only: caller owns ordering and the meaning of the value. */
export function RankingList({
  entries,
  label,
  rankLabel,
  nameLabel,
  valueLabel,
  detailLabels,
  density = 'default',
  rowTestId,
  alignment = 'default',
  highlightAppearance = 'tint',
}: {
  entries: readonly RankingEntry[]
  label: string
  rankLabel: string
  nameLabel: string
  valueLabel: string
  detailLabels: readonly string[]
  density?: 'default' | 'compact'
  alignment?: 'default' | 'center'
  highlightAppearance?: 'tint' | 'selected'
  rowTestId?: string
}) {
  const centered = alignment === 'center'
  const compact = density === 'compact'
  const columns = `48px minmax(120px, 1.8fr) repeat(${detailLabels.length}, minmax(80px, 1fr)) minmax(80px, 1.1fr)`
  const headers = [rankLabel, nameLabel, ...detailLabels, valueLabel]
  return (
    <Box
      role="region"
      aria-label={label}
      tabIndex={0}
      sx={{
        minWidth: 0,
        overflowX: 'auto',
        overscrollBehaviorX: 'contain',
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <Box role="table" aria-label={label} sx={{ minWidth: 284 + detailLabels.length * 88 }}>
        <Box
          role="row"
          sx={{
            display: 'grid',
            gridTemplateColumns: columns,
            gap: 1,
            px: 1.25,
          }}
        >
          {headers.map((header, index) => (
            <Typography
              key={index}
              role="columnheader"
              variant="caption"
              color="text.secondary"
              sx={{
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: centered
                  ? 'center'
                  : index === headers.length - 1
                    ? 'flex-end'
                    : 'flex-start',
                whiteSpace: 'nowrap',
              }}
            >
              {header}
            </Typography>
          ))}
        </Box>
        <Box role="rowgroup">
          {entries.map((entry, index) => (
            <Box
              key={entry.id}
              role="row"
              data-testid={rowTestId}
              sx={(theme) => {
                const selectedSurface =
                  entry.highlighted && highlightAppearance === 'selected'
                    ? itemCardSx(theme, 'selected')
                    : null
                return {
                  ...selectedSurface,
                  display: 'grid',
                  gridTemplateColumns: columns,
                  gap: 1,
                  alignItems: 'center',
                  px: 1.25,
                  py: compact ? 0.75 : centered ? 1.5 : 1,
                  minHeight: compact ? 44 : centered ? 68 : undefined,
                  textAlign: centered ? 'center' : undefined,
                  backgroundColor:
                    selectedSurface?.backgroundColor ??
                    alpha(
                      theme.palette.primary.main,
                      entry.highlighted ? 0.17 : index % 2 === 0 ? 0.065 : 0,
                    ),
                  borderBottom: '1px solid',
                  borderColor: selectedSurface?.borderColor ?? 'divider',
                  overflowWrap: 'anywhere',
                }
              }}
            >
              <Box role="cell">
                <RankBadge rank={entry.rank ?? index + 1} compact={compact || !centered} />
              </Box>
              <Box role="cell" sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={750}>
                  {entry.name}
                </Typography>
              </Box>
              {entry.details.map((detail, detailIndex) => (
                <Typography
                  key={detailIndex}
                  role="cell"
                  variant="body2"
                  color="text.secondary"
                  sx={{ minWidth: 0, fontVariantNumeric: 'tabular-nums' }}
                >
                  {detail}
                </Typography>
              ))}
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
    </Box>
  )
}
