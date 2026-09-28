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
  rowTestId,
}: {
  entries: readonly RankingEntry[]
  label: string
  rankLabel: string
  nameLabel: string
  valueLabel: string
  rowTestId?: string
}) {
  const columns = '32px minmax(0, 1fr) minmax(60px, 0.5fr)'
  return (
    <Box role="table" aria-label={label} sx={{ minWidth: 0 }}>
      <Box
        role="row"
        sx={{ display: 'grid', gridTemplateColumns: columns, gap: 1, px: 1.25, py: 1 }}
      >
        {[rankLabel, nameLabel, valueLabel].map((text, index) => (
          <Typography
            key={index}
            role="columnheader"
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: index === 2 ? 'right' : 'left', overflowWrap: 'anywhere' }}
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
              py: 1,
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
              <RankBadge rank={index + 1} compact />
            </Box>
            <Box role="cell" sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={750}>
                {entry.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {entry.detail}
              </Typography>
            </Box>
            <Typography
              role="cell"
              variant="body2"
              color="primary.light"
              sx={{ fontWeight: 900, minWidth: 0, textAlign: 'right' }}
            >
              {entry.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
