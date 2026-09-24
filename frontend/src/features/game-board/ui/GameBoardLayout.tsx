import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import { boardGridMetrics } from '../theme/board-grid-metrics.ts'

interface GameBoardLayoutProps {
  context: ReactNode
  teams: ReactNode
  management: ReactNode
  children: ReactNode
}

// Edge tabs stay out of the board's flow; on smaller screens they become normal buttons.
export function GameBoardLayout({ context, teams, management, children }: GameBoardLayoutProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gridTemplateAreas: {
          xs: '"teams management" "context context" "board board"',
          lg: '"context context" "board board"',
        },
        gap: 1,
        alignItems: 'start',
        minWidth: 0,
        // Keep full-width boards clear of the 44px edge tabs too.
        px: { lg: 2 },
      }}
    >
      <Box
        data-testid="game-board-context"
        sx={(theme) => {
          const labelGutter =
            boardGridMetrics.leadColumnWidth +
            Number.parseFloat(theme.spacing(boardGridMetrics.gap))
          return {
            gridArea: 'context',
            minWidth: 0,
            width: { xs: '100%', sm: `calc(100% - ${labelGutter}px)` },
            maxWidth: 600,
            justifySelf: 'center',
            // The row-price gutter belongs to the matrix, not to the visual card field.
            transform: { sm: `translateX(${labelGutter / 2}px)` },
          }
        }}
      >
        {context}
      </Box>
      <Box
        data-testid="game-board-teams"
        sx={{
          gridArea: 'teams',
          display: { lg: 'contents' },
        }}
      >
        {teams}
      </Box>
      <Box
        data-testid="game-board-management"
        sx={{
          gridArea: 'management',
          display: { lg: 'contents' },
        }}
      >
        {management}
      </Box>
      <Box sx={{ gridArea: 'board', minWidth: 0 }}>{children}</Box>
    </Box>
  )
}
