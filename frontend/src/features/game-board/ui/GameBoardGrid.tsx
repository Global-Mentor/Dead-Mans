import { Box } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMemo } from 'react'
import type { GameBoardCell, GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'
import { huntPaperTexture } from '../../../shared/theme/hunt-materials.ts'
import { GameBoardMatrix } from './GameBoardMatrix.tsx'
import { GameBoardCard } from './GameBoardCard.tsx'
import type { GameBoardCellPlayResult } from '../model/game-board-cell-results.ts'
import { boardClosedCellFillAlpha } from '../theme/board-cell-sx.ts'
import { boardGridMetrics, getBoardRowLabelColumnWidth } from '../theme/board-grid-metrics.ts'

interface GameBoardGridProps {
  categoryLayout?: boolean
  rowLabelColumnWidth?: number
  snapshot: GameBoardSnapshot
  playResultsByCellId?: ReadonlyMap<string, GameBoardCellPlayResult>
  activeCellId?: string | null
  canOpenCells: boolean
  onCellRequestOpen: (cell: GameBoardCell) => void
  onCellPreviewMedia: (cell: GameBoardCell) => void
  onCellOpenCurrentRound?: ((cell: GameBoardCell) => void) | undefined
}

export function GameBoardGrid({
  categoryLayout = false,
  rowLabelColumnWidth,
  snapshot,
  playResultsByCellId,
  activeCellId = null,
  canOpenCells,
  onCellRequestOpen,
  onCellPreviewMedia,
  onCellOpenCurrentRound,
}: GameBoardGridProps) {
  const cellMap = useMemo(() => {
    return new Map(snapshot.cells.map((cell) => [`${cell.row}:${cell.col}`, cell] as const))
  }, [snapshot.cells])

  return (
    <Box sx={{ minWidth: 0 }}>
      <GameBoardMatrix
        categoryLayout={categoryLayout}
        activeColumnIndex={snapshot.cells.find((cell) => cell.id === activeCellId)?.col}
        colLabels={snapshot.colLabels}
        rowLabels={snapshot.rowLabels}
        gap={boardGridMetrics.gap}
        leadColumnWidth={rowLabelColumnWidth ?? getBoardRowLabelColumnWidth(snapshot.rowLabels)}
        leadCell={<Box />}
        renderColumnLabel={(col, colIndex) => (
          <Box
            role="columnheader"
            sx={(theme) => {
              const gridGap = Number.parseFloat(theme.spacing(boardGridMetrics.gap))
              const dividerCenterFromBottom = (boardGridMetrics.columnDividerHeight - gridGap) / 2
              return {
                position: 'relative',
                minWidth: 0,
                display: 'grid',
                gridTemplateRows: `auto ${boardGridMetrics.columnDividerHeight}px`,
                ...(colIndex === 0 && {
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    bottom: dividerCenterFromBottom - 0.5,
                    width: `calc(${snapshot.colLabels.length * 100}% + ${theme.spacing(boardGridMetrics.gap * (snapshot.colLabels.length - 1))})`,
                    height: '1px',
                    backgroundImage: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.light, 0.48)} 10%, ${alpha(theme.palette.primary.light, 0.48)} calc(50% - 10px), transparent calc(50% - 10px), transparent calc(50% + 10px), ${alpha(theme.palette.primary.light, 0.48)} calc(50% + 10px), ${alpha(theme.palette.primary.light, 0.48)} 90%, transparent)`,
                    pointerEvents: 'none',
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: `calc(${snapshot.colLabels.length * 50}% + ${theme.spacing((boardGridMetrics.gap * (snapshot.colLabels.length - 1)) / 2)})`,
                    bottom: dividerCenterFromBottom - 4,
                    width: 8,
                    height: 8,
                    transform: 'translateX(-50%) rotate(45deg)',
                    border: `1px solid ${alpha(theme.palette.primary.light, 0.72)}`,
                    backgroundColor: theme.palette.background.default,
                    pointerEvents: 'none',
                  },
                }),
              }
            }}
          >
            <Box
              sx={(theme) => ({
                textAlign: 'center',
                fontWeight: 750,
                color: 'text.primary',
                letterSpacing: 0,
                px: 0.25,
                py: 0.5,
                minHeight: boardGridMetrics.columnHeaderHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
                containerType: 'inline-size',
                background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.18)}, ${alpha(theme.palette.primary.main, boardClosedCellFillAlpha)})`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.42)}`,
                boxShadow: `inset 0 2px 0 ${alpha(theme.palette.primary.light, 0.24)}`,
              })}
            >
              <Box
                component="span"
                sx={(theme) => ({
                  fontSize: 'clamp(0.875rem, 15cqw, 0.95rem)',
                  lineHeight: 1.18,
                  overflowWrap: 'anywhere',
                  color: theme.palette.primary.light,
                  backgroundImage: `linear-gradient(160deg, ${theme.palette.primary.light}, ${theme.palette.primary.main} 65%, ${theme.palette.primary.light}), ${huntPaperTexture}`,
                  backgroundSize: 'auto, 180px auto',
                  backgroundPosition: 'center',
                  backgroundBlendMode: 'screen',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  '@media (forced-colors: active)': {
                    backgroundImage: 'none',
                    color: 'CanvasText',
                    WebkitTextFillColor: 'CanvasText',
                  },
                })}
              >
                {col}
              </Box>
            </Box>
          </Box>
        )}
        renderRowLabel={(rowLabel) => {
          const isShortLabel = rowLabel.trim().length <= 6
          return (
            <Box
              data-board-row-label
              sx={{
                textAlign: 'center',
                fontWeight: 750,
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.35,
                overflowWrap: 'anywhere',
                containerType: 'inline-size',
              }}
            >
              <Box
                component="span"
                sx={{
                  fontSize: isShortLabel ? '0.9rem' : 'clamp(0.7rem, 25cqw, 0.9rem)',
                  lineHeight: 1.05,
                  overflowWrap: 'anywhere',
                }}
              >
                {rowLabel}
              </Box>
            </Box>
          )
        }}
        renderCell={(rowIndex, colIndex) => {
          const cell = cellMap.get(`${rowIndex}:${colIndex}`)
          return (
            <GameBoardCard
              cell={cell}
              category={snapshot.colLabels[colIndex] ?? ''}
              rowLabel={snapshot.rowLabels[rowIndex] ?? ''}
              activeCellId={activeCellId}
              playResult={cell ? playResultsByCellId?.get(cell.id) : undefined}
              canOpenCells={canOpenCells}
              onCellRequestOpen={onCellRequestOpen}
              onCellPreviewMedia={onCellPreviewMedia}
              onCellOpenCurrentRound={onCellOpenCurrentRound}
            />
          )
        }}
      />
    </Box>
  )
}
