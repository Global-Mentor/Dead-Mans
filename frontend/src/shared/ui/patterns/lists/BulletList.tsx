import { Box } from '@mui/material'
import type { ReactNode } from 'react'

export function BulletList({ children }: { children: ReactNode }) {
  return (
    <Box
      component="ul"
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        display: 'grid',
        gap: 0.75,
        '& > li': {
          display: 'flex',
          gap: 1.25,
          alignItems: 'flex-start',
          minWidth: 0,
          maxWidth: '100%',
          overflowWrap: 'anywhere',
        },
        '& > li::before': {
          content: '""',
          width: 5,
          height: 5,
          mt: '0.6em',
          flexShrink: 0,
          transform: 'rotate(45deg)',
          bgcolor: 'primary.main',
        },
      }}
    >
      {children}
    </Box>
  )
}
