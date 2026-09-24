import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { boardGridMetrics } from '../theme/board-grid-metrics.ts'

interface GameBoardLayoutProps {
  columns: number
  context: ReactNode
  teams: ReactNode
  management: ReactNode
  children: (categoryLayout: boolean) => ReactNode
}

// Edge tabs stay out of the board's flow; on smaller screens they become normal buttons.
export function GameBoardLayout({
  columns,
  context,
  teams,
  management,
  children,
}: GameBoardLayoutProps) {
  const theme = useTheme()
  const smallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const container = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    const element = container.current
    if (!element) return
    const measure = () => {
      const styles = getComputedStyle(element)
      const width =
        element.clientWidth -
        parseFloat(styles.paddingLeft || '0') -
        parseFloat(styles.paddingRight || '0')
      if (width > 0) setAvailableWidth(width)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const minimumMatrixWidth =
    boardGridMetrics.leadColumnWidth +
    columns *
      (boardGridMetrics.minimumCardWidth.desktop + parseFloat(theme.spacing(boardGridMetrics.gap)))
  const categoryLayout =
    smallScreen || (availableWidth !== null && availableWidth < minimumMatrixWidth)

  return (
    <Box
      ref={container}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gridTemplateAreas: {
          xs: '"teams management" "context context" "board board"',
          lg: '"context context" "board board"',
        },
        gap: 0.9,
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
            width: categoryLayout ? '100%' : `calc(100% - ${labelGutter}px)`,
            maxWidth: boardGridMetrics.statusMaxWidth,
            justifySelf: 'center',
            // The row-price gutter belongs to the matrix, not to the visual card field.
            transform: categoryLayout ? undefined : `translateX(${labelGutter / 2}px)`,
          }
        }}
      >
        {context}
      </Box>
      <Box
        data-testid="game-board-teams"
        sx={{
          gridArea: 'teams',
          minWidth: 0,
          display: { lg: 'contents' },
        }}
      >
        {teams}
      </Box>
      <Box
        data-testid="game-board-management"
        sx={{
          gridArea: 'management',
          minWidth: 0,
          display: { lg: 'contents' },
        }}
      >
        {management}
      </Box>
      <Box sx={{ gridArea: 'board', minWidth: 0 }}>{children(categoryLayout)}</Box>
    </Box>
  )
}
