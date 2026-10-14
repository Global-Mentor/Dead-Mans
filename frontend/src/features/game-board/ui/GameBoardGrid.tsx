import { BoardColumnLabel, BoardRowLabel } from '../../../shared/game-ui/BoardLabels.tsx'
import { Box } from '@mui/material'
import { useMemo } from 'react'
import type { GameBoardCell, GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'
import { GameBoardMatrix } from './GameBoardMatrix.tsx'
import { GameBoardCard } from './GameBoardCard.tsx'
import type { GameBoardCellPlayResult } from '../model/game-board-cell-results.ts'
import {
  boardGridMetrics,
  getBoardRowLabelColumnWidth,
} from '../../../shared/game-ui/board-grid-metrics.ts'

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
        renderColumnLabel={(label, columnIndex) => (
          <BoardColumnLabel
            label={label}
            columnIndex={columnIndex}
            columnCount={snapshot.colLabels.length}
          />
        )}
        renderRowLabel={(rowLabel) => <BoardRowLabel rowLabel={rowLabel} />}
        renderCell={(rowIndex, colIndex) => {
          const cell = cellMap.get(`${rowIndex}:${colIndex}`)
          return (
            <GameBoardCard
              cell={cell}
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
