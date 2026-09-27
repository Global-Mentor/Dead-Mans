import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { boardGridMetrics } from '../theme/board-grid-metrics.ts'

interface GameBoardLayoutProps {
  columns: number
  rowLabelColumnWidth: number
  context: (stacked: boolean) => ReactNode
  management: ReactNode
  children: (categoryLayout: boolean) => ReactNode
}

// Edge tabs stay out of the board's flow; on smaller screens they become normal buttons.
export function GameBoardLayout({
  columns,
  rowLabelColumnWidth,
  context,
  management,
  children,
}: GameBoardLayoutProps) {
  const theme = useTheme()
  const smallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const wideScreen = useMediaQuery(theme.breakpoints.up('lg'))
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
    2 * rowLabelColumnWidth +
    columns * boardGridMetrics.minimumCardWidth.desktop +
    (columns + 1) * parseFloat(theme.spacing(boardGridMetrics.gap))
  const sideBySide =
    wideScreen &&
    availableWidth !== null &&
    availableWidth >=
      minimumMatrixWidth + 2 * (boardGridMetrics.statusRailWidth + parseFloat(theme.spacing(0.9)))
  const categoryLayout =
    smallScreen || (availableWidth !== null && availableWidth < minimumMatrixWidth)
  return (
    <Box
      ref={container}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridTemplateAreas: sideBySide
          ? '"board"'
          : { xs: '"management" "context" "board"', lg: '"context" "board"' },
        gap: 0.9,
        alignItems: 'start',
        minWidth: 0,
        position: 'relative',
        width: { lg: '100vw' },
        ml: { lg: 'calc(50% - 50vw)' },
        // Reserve equal space at both edges so the cards stay centered on the viewport.
        px: { lg: 2 },
      }}
    >
      <Box
        data-testid="game-board-context"
        sx={{
          gridArea: sideBySide ? undefined : 'context',
          minWidth: 0,
          width: categoryLayout ? '100%' : boardGridMetrics.statusRailWidth,
          maxWidth: sideBySide || categoryLayout ? undefined : boardGridMetrics.statusRailWidth,
          justifySelf: sideBySide ? 'start' : 'center',
          position: sideBySide ? 'absolute' : undefined,
          top: sideBySide ? 0 : undefined,
          left: sideBySide ? 0 : undefined,
        }}
      >
        {context(!sideBySide)}
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
        sx={{
          gridArea: 'board',
          minWidth: 0,
          width: '100%',
          maxWidth: sideBySide
            ? `calc(100% - ${2 * (boardGridMetrics.statusRailWidth + parseFloat(theme.spacing(0.9)))}px)`
            : undefined,
          justifySelf: 'center',
        }}
      >
        {children(categoryLayout)}
      </Box>
    </Box>
  )
}
