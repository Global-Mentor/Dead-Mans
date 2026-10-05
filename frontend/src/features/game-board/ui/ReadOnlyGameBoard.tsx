import { useMemo, useState, type ReactNode } from 'react'
import type { components } from '../../../shared/api/contracts/generated'
import type { GameBoardCell, GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'
import { buildGameBoardCellPlayResultMap } from '../model/game-board-cell-results.ts'
import { getBoardRowLabelColumnWidth } from '../theme/board-grid-metrics.ts'
import { GameBoardLayout } from './GameBoardLayout.tsx'
import { GameBoardGrid } from './GameBoardGrid.tsx'
import { GameBoardCardPreviewDialog } from './GameBoardCardPreviewDialog.tsx'

export function ReadOnlyGameBoard({
  snapshot,
  rounds,
  context,
}: {
  context: ReactNode
  snapshot: GameBoardSnapshot
  rounds: readonly components['schemas']['GameHistoryRoundItemDto'][]
}) {
  const [previewCell, setPreviewCell] = useState<GameBoardCell | null>(null)
  const rowLabelColumnWidth = getBoardRowLabelColumnWidth(snapshot.rowLabels)
  const results = useMemo(
    () => buildGameBoardCellPlayResultMap(rounds, new Set(snapshot.cells.map((cell) => cell.id))),
    [rounds, snapshot.cells],
  )
  return (
    <>
      <GameBoardLayout
        fullBleed={false}
        columns={snapshot.colLabels.length}
        rowLabelColumnWidth={rowLabelColumnWidth}
        context={() => context}
      >
        {(categoryLayout) => (
          <GameBoardGrid
            snapshot={snapshot}
            categoryLayout={categoryLayout}
            rowLabelColumnWidth={rowLabelColumnWidth}
            playResultsByCellId={results}
            canOpenCells={false}
            onCellRequestOpen={setPreviewCell}
            onCellPreviewMedia={setPreviewCell}
          />
        )}
      </GameBoardLayout>
      <GameBoardCardPreviewDialog
        cell={previewCell}
        onClose={() => setPreviewCell(null)}
        playResult={{
          round: previewCell ? (results.get(previewCell.id) ?? null) : null,
          isLoading: false,
          isError: false,
        }}
      />
    </>
  )
}
