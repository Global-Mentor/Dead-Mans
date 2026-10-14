import { Box, useTheme } from '@mui/material'
import type { components } from '../api/contracts/generated'
import { ItemCard } from '../ui/index.ts'
import { BoardCardFace } from './BoardCardFace.tsx'
import { BoardColumnLabel, BoardRowLabel } from './BoardLabels.tsx'
import { createBoardCellSx } from './board-cell-sx.ts'
import { boardGridMetrics, getBoardRowLabelColumnWidth } from './board-grid-metrics.ts'
import { resolveBackendMediaUrl } from '../api/media-url.ts'
import { BoardMatrix } from './BoardMatrix.tsx'
import { uiTokens } from '../theme/tokens.ts'
import { useBroadcastContentFit } from './use-broadcast-content-fit.ts'

type BroadcastBoardData = components['schemas']['GameOverlayBoardDto']

export function BroadcastBoard({
  board,
  label,
  onWidthChange,
}: {
  board: BroadcastBoardData
  label: string
  onWidthChange?: (width: number) => void
}) {
  const theme = useTheme()
  const { container, content, scale } = useBroadcastContentFit('center', onWidthChange)
  const cells = new Map(board.cells.map((cell) => [`${cell.row}:${cell.col}`, cell]))
  const gutter = getBoardRowLabelColumnWidth(board.rowLabels)
  const gap = Number.parseFloat(theme.spacing(boardGridMetrics.gap))
  const columns = Math.max(1, board.colLabels.length)
  const rows = Math.max(1, board.rowLabels.length)
  const panelChrome = 2 * Number.parseFloat(theme.spacing(uiTokens.spacing.section)) + 2
  const chrome = gutter * 2 + gap * (columns + 1) + panelChrome
  const verticalChrome = panelChrome + boardGridMetrics.columnDividerHeight + rows * gap
  // Fit card geometry first; scale the whole field only for exceptionally dense boards.
  const width = `max(${columns * boardGridMetrics.minimumCardWidth.desktop + chrome}px, min(100cqw, calc((100cqh - ${boardGridMetrics.columnHeaderHeight} - ${verticalChrome}px) / ${rows} * ${boardGridMetrics.cardAspectRatio} * ${columns} + ${chrome}px)))`

  return (
    <Box
      ref={container}
      sx={{ width: '100%', height: '100%', position: 'relative', containerType: 'size' }}
    >
      <ItemCard
        frame="corner"
        emphasis="available"
        ref={content}
        component="section"
        aria-label={label}
        data-testid="overlay-board"
        sx={{
          width,
          position: 'absolute',
          left: '50%',
          top: '50%',
          transformOrigin: 'center',
          transform: `translate(-50%, -50%) scale(${scale ?? 1})`,
          visibility: scale === null ? 'hidden' : 'visible',
        }}
      >
        <BoardMatrix
          rowLabels={board.rowLabels}
          colLabels={board.colLabels}
          minWidth={0}
          leadColumnWidth={gutter}
          gap={boardGridMetrics.gap}
          trailingSpacer
          renderColumnLabel={(value, columnIndex) => (
            <BoardColumnLabel label={value} columnIndex={columnIndex} columnCount={columns} />
          )}
          renderRowLabel={(value) => <BoardRowLabel rowLabel={value} />}
          renderCell={(row, col) => {
            const cell = cells.get(`${row}:${col}`)
            return (
              <Box
                data-state={cell?.state}
                sx={createBoardCellSx({
                  isOpen: cell?.state !== 'closed',
                  isInteractive: false,
                  isPlayed: Boolean(cell?.result),
                })}
              >
                <BoardCardFace
                  cell={cell}
                  previewMediaUrl={
                    cell?.state !== 'closed' ? resolveBackendMediaUrl(cell?.imageUrl) : ''
                  }
                  playResult={
                    cell?.result
                      ? {
                          teamName: cell.result.teamName,
                          teamSlotIndex: cell.result.teamSlotIndex,
                          scoreDetails: cell.result,
                        }
                      : undefined
                  }
                />
              </Box>
            )
          }}
        />
      </ItemCard>
    </Box>
  )
}
