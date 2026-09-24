import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useState, type ReactNode } from 'react'
import { NativeDisclosure } from './NativeDisclosure.tsx'

/** Catalogue tools remain reachable before a long result list on phones. */
export function CatalogWorkspace({
  toolsLabel,
  tools,
  children,
}: {
  toolsLabel: string
  tools: ReactNode
  children: ReactNode
}) {
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('lg'))
  const [toolsOpen, setToolsOpen] = useState(false)
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        alignItems: 'start',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(320px, 360px)' },
      }}
    >
      <Box sx={{ minWidth: 0, gridColumn: { lg: 2 }, gridRow: { lg: 1 } }}>
        <NativeDisclosure
          summary={toolsLabel}
          pinned={!compact}
          open={toolsOpen}
          onExpandedChange={setToolsOpen}
          data-testid="catalog-tools"
        >
          {tools}
        </NativeDisclosure>
      </Box>
      <Box sx={{ minWidth: 0, gridColumn: { lg: 1 }, gridRow: { lg: 1 } }}>{children}</Box>
    </Box>
  )
}
