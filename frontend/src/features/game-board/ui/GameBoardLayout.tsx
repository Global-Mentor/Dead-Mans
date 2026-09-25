import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { uiTokens } from '../../../shared/theme/tokens.ts'
import { boardGridMetrics } from '../theme/board-grid-metrics.ts'

interface GameBoardLayoutProps {
  columns: number
  context: ReactNode
  teams: (inline: boolean) => ReactNode
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
  const { t } = useTranslation()
  const smallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const edgeTabs = useMediaQuery(theme.breakpoints.up('lg'))
  const container = useRef<HTMLDivElement>(null)
  const board = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState<number | null>(null)
  const [centerOffset, setCenterOffset] = useState(0)
  const [teamRail, setTeamRail] = useState<{ left: number; top: number; height: number } | null>(
    null,
  )
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
      const layoutRect = element.getBoundingClientRect()
      const gap = parseFloat(theme.spacing(0.9))
      const nextCenterOffset = categoryLayout
        ? 0
        : Math.min(labelGutter / 2, Math.max(0, (boardRect.width - fieldRect.width) / 2))
      if (centerOffset !== nextCenterOffset) setCenterOffset(nextCenterOffset)
      const fieldLeft = fieldRect.left + centerOffset - nextCenterOffset
      const edgeClearance = edgeTabs ? uiTokens.control.height.standard : 0
      const leftBoundary = edgeClearance + gap
      const fits = !smallScreen && fieldLeft - leftBoundary >= boardGridMetrics.teamRailWidth + gap
      const nextRail = fits
        ? {
            left: leftBoundary - layoutRect.left,
            top: fieldRect.top - layoutRect.top,
            height: fieldRect.height,
          }
        : null
      setTeamRail((current) =>
        current?.left === nextRail?.left &&
        current?.top === nextRail?.top &&
        current?.height === nextRail?.height
          ? current
          : nextRail,
      )
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
  }, [categoryLayout, centerOffset, edgeTabs, labelGutter, smallScreen, theme])
  const inlineTeams = teamRail !== null

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
        data-testid="game-board-teams"
        role={inlineTeams ? 'region' : undefined}
        aria-label={inlineTeams ? t('gameBoard.teamQueueTitle') : undefined}
        tabIndex={inlineTeams ? 0 : undefined}
        sx={{
          gridArea: inlineTeams ? undefined : 'teams',
          minWidth: 0,
          display: inlineTeams ? 'block' : { lg: 'contents' },
          position: inlineTeams ? 'absolute' : undefined,
          zIndex: inlineTeams ? 1 : undefined,
          left: teamRail?.left,
          top: teamRail?.top,
          width: inlineTeams ? boardGridMetrics.teamRailWidth : undefined,
          maxHeight: teamRail?.height,
          overflowY: inlineTeams ? 'auto' : undefined,
          overflowX: inlineTeams ? 'hidden' : undefined,
        }}
      >
        {teams(inlineTeams)}
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
      <Box
        ref={board}
        sx={{ gridArea: 'board', minWidth: 0, transform: `translateX(-${centerOffset}px)` }}
      >
        {children(categoryLayout)}
      </Box>
    </Box>
  )
}
