import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { boardGridMetrics } from '../theme/board-grid-metrics.ts'

interface GameBoardLayoutProps {
  columns: number
  context: ReactNode
  management: ReactNode
  children: (categoryLayout: boolean) => ReactNode
}

// Edge tabs stay out of the board's flow; on smaller screens they become normal buttons.
export function GameBoardLayout({ columns, context, management, children }: GameBoardLayoutProps) {
  const theme = useTheme()
  const smallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const container = useRef<HTMLDivElement>(null)
  const board = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState<number | null>(null)
  const [centerOffset, setCenterOffset] = useState(0)
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
  const labelGutter =
    boardGridMetrics.leadColumnWidth + parseFloat(theme.spacing(boardGridMetrics.gap))

  useLayoutEffect(() => {
    const element = container.current
    const boardElement = board.current
    const field = boardElement?.querySelector('[data-board-field]')
    if (!element || !boardElement || !field) return
    const measure = () => {
      const fieldRect = field.getBoundingClientRect()
      const boardRect = boardElement.getBoundingClientRect()
      const nextCenterOffset = categoryLayout
        ? 0
        : Math.min(labelGutter / 2, Math.max(0, (boardRect.width - fieldRect.width) / 2))
      if (centerOffset !== nextCenterOffset) setCenterOffset(nextCenterOffset)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(field)
    observer.observe(boardElement)
    observer.observe(element)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [categoryLayout, centerOffset, labelGutter])

  return (
    <Box
      ref={container}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridTemplateAreas: {
          xs: '"management" "context" "board"',
          lg: '"context" "board"',
        },
        gap: 0.9,
        alignItems: 'start',
        minWidth: 0,
        position: 'relative',
        // Keep full-width boards clear of the 44px edge tabs too.
        px: { lg: 2 },
      }}
    >
      <Box
        data-testid="game-board-context"
        sx={{
          gridArea: 'context',
          minWidth: 0,
          width: categoryLayout ? '100%' : `calc(100% - ${labelGutter}px)`,
          maxWidth: boardGridMetrics.statusMaxWidth,
          justifySelf: 'center',
          // The row-price gutter belongs to the matrix, not to the visual card field.
          transform: categoryLayout ? undefined : `translateX(${labelGutter / 2 - centerOffset}px)`,
        }}
      >
        {context}
      </Box>
      <Box
        data-testid="game-board-management"
        sx={{
          gridArea: 'management',
          minWidth: 0,
          display: { xs: 'flex', lg: 'contents' },
          justifyContent: 'flex-end',
        }}
      >
        {management}
      </Box>
      <Box
        ref={board}
        sx={{ gridArea: 'board', minWidth: 0, transform: `translateX(-${centerOffset}px)` }}
      >
        {children(categoryLayout)}
      </Box>
    </Box>
  )
}
