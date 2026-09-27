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
  const railClearance = parseFloat(theme.spacing(2))
  const smallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const wideScreen = useMediaQuery(theme.breakpoints.up('lg'))
  const container = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState<number | null>(null)
  const [boardFieldStart, setBoardFieldStart] = useState<number | null>(null)
  const [boardFieldWidth, setBoardFieldWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    const element = container.current
    if (!element) return
    const boardField = element.querySelector<HTMLElement>('[data-board-field]')
    const measure = () => {
      const styles = getComputedStyle(element)
      const width =
        element.clientWidth -
        parseFloat(styles.paddingLeft || '0') -
        parseFloat(styles.paddingRight || '0')
      if (width > 0) setAvailableWidth(width)
      if (boardField) {
        const fieldRect = boardField.getBoundingClientRect()
        setBoardFieldWidth(Math.round(fieldRect.width))
        setBoardFieldStart(Math.round(fieldRect.left - element.getBoundingClientRect().left))
      }
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (boardField) observer.observe(boardField)
    return () => observer.disconnect()
  }, [availableWidth, smallScreen, columns, rowLabelColumnWidth])
  const minimumMatrixWidth =
    2 * rowLabelColumnWidth +
    columns * boardGridMetrics.minimumCardWidth.desktop +
    (columns + 1) * parseFloat(theme.spacing(boardGridMetrics.gap))
  const sideBySide =
    wideScreen &&
    availableWidth !== null &&
    availableWidth >= minimumMatrixWidth + 2 * (boardGridMetrics.statusRailWidth + railClearance)
  const categoryLayout =
    smallScreen || (availableWidth !== null && availableWidth < minimumMatrixWidth)
  const cardColumnsWidth =
    boardFieldWidth === null
      ? '100%'
      : categoryLayout
        ? boardFieldWidth
        : Math.max(
            0,
            boardFieldWidth -
              2 * (rowLabelColumnWidth + parseFloat(theme.spacing(boardGridMetrics.gap))),
          )
  const railWidth =
    boardFieldStart === null
      ? boardGridMetrics.statusRailWidth
      : Math.min(
          boardGridMetrics.statusRailMaxWidth,
          Math.max(boardGridMetrics.statusRailWidth, boardFieldStart - 2 * railClearance),
        )
  const railLeft =
    boardFieldStart === null
      ? railClearance
      : Math.max(railClearance, (boardFieldStart + railClearance - railWidth) / 2)
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
          width: sideBySide ? railWidth : cardColumnsWidth,
          maxWidth: '100%',
          justifySelf: sideBySide ? 'start' : 'center',
          position: sideBySide ? 'absolute' : undefined,
          top: sideBySide ? 0 : undefined,
          left: sideBySide ? railLeft : undefined,
        }}
      >
        {context(!sideBySide)}
      </Box>
      <Box
        data-testid="game-board-management"
        sx={{
          gridArea: 'management',
          minWidth: 0,
          width: cardColumnsWidth,
          maxWidth: '100%',
          justifySelf: 'center',
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
            ? `calc(100% - ${2 * (boardGridMetrics.statusRailWidth + railClearance)}px)`
            : undefined,
          justifySelf: 'center',
        }}
      >
        {children(categoryLayout)}
      </Box>
    </Box>
  )
}
