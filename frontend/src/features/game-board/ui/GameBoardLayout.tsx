import { Box, type Theme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { boardGridMetrics } from '../theme/board-grid-metrics.ts'
import { huntWornFrame } from '../../../shared/theme/hunt-materials.ts'
import { uiTokens } from '../../../shared/theme/tokens.ts'

interface GameBoardLayoutProps {
  context: ReactNode
  teams: ReactNode
  management: ReactNode
  children: ReactNode
}

function edgeTabSx(theme: Theme, side: 'left' | 'right') {
  return {
    minHeight: 44,
    border: '1px solid',
    borderColor: 'divider',
    ...huntWornFrame,
    borderImageOutset: 0,
    borderRadius: 0,
    bgcolor: 'background.paper',
    backgroundImage: theme.custom.gradients.panelSurface,
    backgroundSize: `auto, ${uiTokens.texture.panelSize}`,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.025em',
    '&::before': { display: 'none' },
    '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -3 },
    [theme.breakpoints.up('lg')]: {
      position: 'fixed',
      [side]: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: theme.zIndex.drawer - 1,
      width: 44,
      minWidth: 44,
      height: 144,
      minHeight: 144,
      px: 1,
      py: 2,
      writingMode: 'vertical-rl',
      whiteSpace: 'nowrap',
      boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.24)}`,
    },
  }
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
        sx={(theme) => ({
          gridArea: 'teams',
          display: { lg: 'contents' },
          '& > button': edgeTabSx(theme, 'left'),
        })}
      >
        {teams}
      </Box>
      <Box
        data-testid="game-board-management"
        sx={(theme) => ({
          gridArea: 'management',
          display: { lg: 'contents' },
          '& > button': edgeTabSx(theme, 'right'),
        })}
      >
        {management}
      </Box>
      <Box sx={{ gridArea: 'board', minWidth: 0 }}>{children}</Box>
    </Box>
  )
}
