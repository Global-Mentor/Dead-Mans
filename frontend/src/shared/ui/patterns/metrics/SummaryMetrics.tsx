import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function SummaryMetrics({
  label,
  items,
}: {
  label: string
  items: readonly { label: string; value: ReactNode; emphasis?: boolean }[]
}) {
  return (
    <Box
      component="dl"
      aria-label={label}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
        columnGap: 0,
        rowGap: 1.5,
        m: 0,
        mt: 0.5,
        py: 1.5,
        borderBlock: '1px solid',
        borderColor: 'divider',
      }}
    >
      {items.map((item, index) => (
        <Box
          key={item.label}
          sx={{
            minWidth: 0,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 1,
            px: { xs: 1, sm: 2 },
            borderLeftStyle: 'solid',
            borderLeftWidth: { xs: index % 2 === 1 ? 1 : 0, sm: index % 4 > 0 ? 1 : 0 },
            borderColor: 'divider',
          }}
        >
          <Typography component="dt" variant="body2" color="text.secondary">
            {item.label}
          </Typography>
          <Typography
            component="dd"
            variant="h5"
            sx={{ m: 0, color: item.emphasis ? 'primary.light' : 'text.primary' }}
          >
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
