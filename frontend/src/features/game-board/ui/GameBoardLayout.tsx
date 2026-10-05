import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { boardGridMetrics } from '../theme/board-grid-metrics.ts'

interface GameBoardLayoutProps {
  fullBleed?: boolean
  columns: number
  rowLabelColumnWidth: number
  context: (stacked: boolean) => ReactNode
  children: (categoryLayout: boolean) => ReactNode
}

export function GameBoardLayout({
  fullBleed = true,
  columns,
  rowLabelColumnWidth,
  context,
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
  // Child fitting can change the field without changing props; align the rail before each paint.
  useLayoutEffect(() => {
    const element = container.current
    if (!element) return
    let boardField: HTMLElement | null = null
    let resizeObserver: ResizeObserver | null = null
    const measure = () => {
      const nextBoardField = element.querySelector<HTMLElement>('[data-board-field]')
      if (nextBoardField !== boardField) {
        if (boardField) resizeObserver?.unobserve(boardField)
        boardField = nextBoardField
        if (boardField) resizeObserver?.observe(boardField)
      }
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
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measure)
      resizeObserver.observe(element)
    }
    measure()
    const mutationObserver = new MutationObserver(() => {
      if (!boardField || !element.contains(boardField)) measure()
    })
    mutationObserver.observe(element, { childList: true, subtree: true })
    return () => {
      resizeObserver?.disconnect()
      mutationObserver.disconnect()
    }
  })
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
          : { xs: '"context" "board"', lg: '"context" "board"' },
        gap: 0.9,
        alignItems: 'start',
        minWidth: 0,
        position: 'relative',
        width: fullBleed ? { lg: '100vw' } : '100%',
        ml: fullBleed ? { lg: 'calc(50% - 50vw)' } : 0,
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
