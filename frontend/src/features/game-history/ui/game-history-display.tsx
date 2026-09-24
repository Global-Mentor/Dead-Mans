import { Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function ColumnLabel({
  children,
  align = 'left',
}: {
  children: ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <Typography
      role="columnheader"
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
      role="cell"
      variant="body2"
      sx={{
        overflowWrap: 'anywhere',
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
