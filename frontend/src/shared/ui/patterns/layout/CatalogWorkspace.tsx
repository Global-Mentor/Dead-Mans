import { Box } from '@mui/material'
import type { ReactNode } from 'react'

/** Bounded catalogue: tools stay above independently scrolling results. */
export function CatalogWorkspace({
  toolsLabel,
  tools,
  children,
}: {
  toolsLabel: string
  tools: ReactNode
  children: ReactNode
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        flex: '1 1 0%',
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <Box
        role="group"
        aria-label={toolsLabel}
        sx={{ flexShrink: 0, maxHeight: '45%', overflowY: 'auto', scrollbarWidth: 'thin' }}
      >
        {tools}
      </Box>
      <Box
        sx={{ flex: '1 1 0%', minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </Box>
    </Box>
  )
}
