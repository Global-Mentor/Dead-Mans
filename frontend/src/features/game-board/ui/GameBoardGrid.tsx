import { Box } from '@mui/material'
import { useMemo } from 'react'
import type { GameBoardCell, GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'
import { GameBoardMatrix } from './GameBoardMatrix.tsx'
import { GameBoardCard } from './GameBoardCard.tsx'
import type { GameBoardCellPlayResult } from '../model/game-board-cell-results.ts'
import { boardGridMetrics } from '../theme/board-grid-metrics.ts'

interface GameBoardGridProps {
  categoryLayout?: boolean
  snapshot: GameBoardSnapshot
  playResultsByCellId?: ReadonlyMap<string, GameBoardCellPlayResult>
  activeCellId?: string | null
  canOpenCells: boolean
  onCellRequestOpen: (cell: GameBoardCell) => void
  onCellPreviewMedia: (cell: GameBoardCell) => void
}

export function GameBoardGrid({
  categoryLayout = false,
  snapshot,
  playResultsByCellId,
  activeCellId = null,
  canOpenCells,
  onCellRequestOpen,
  onCellPreviewMedia,
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
        leadColumnWidth={boardGridMetrics.leadColumnWidth}
        leadCell={<Box />}
        renderColumnLabel={(col) => (
          <Box
            role="columnheader"
            title={col}
            sx={{
              textAlign: 'center',
              fontWeight: 850,
              color: 'text.primary',
              letterSpacing: '0.015em',
              px: 0.5,
              py: 0.25,
              height: '2.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'normal',
              overflowWrap: 'anywhere',
              containerType: 'inline-size',
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: 'clamp(0.6rem, 10.8cqw, 0.855rem)',
                lineHeight: 1,
                overflowWrap: 'anywhere',
              }}
            >
              {col}
            </Box>
          </Box>
        )}
        renderRowLabel={(rowLabel) => {
          const isShortLabel = rowLabel.trim().length <= 6
          return (
            <Box
              data-board-row-label
              title={rowLabel}
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
                  fontSize: isShortLabel ? '0.684rem' : 'clamp(0.54rem, 19.8cqw, 0.684rem)',
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
            />
          )
        }}
      />
    </Box>
  )
}
