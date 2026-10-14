import { BoardCardFace } from '../../../shared/game-ui/BoardCardFace.tsx'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameBoardCell } from '../../../shared/api/contracts/index.ts'
import { resolveBackendMediaUrl } from '../../../shared/api/media-url.ts'
import { SurfaceButton } from '../../../shared/ui/index.ts'
import type { GameBoardCellPlayResult } from '../model/game-board-cell-results.ts'
import { createBoardCellSx } from '../../../shared/game-ui/board-cell-sx.ts'

interface GameBoardCardProps {
  cell: GameBoardCell | undefined
  activeCellId: string | null
  playResult: GameBoardCellPlayResult | undefined
  canOpenCells: boolean
  onCellRequestOpen: (cell: GameBoardCell) => void
  onCellPreviewMedia: (cell: GameBoardCell) => void
  onCellOpenCurrentRound?: ((cell: GameBoardCell) => void) | undefined
}

export function GameBoardCard({
  cell,
  activeCellId,
  playResult,
  canOpenCells,
  onCellRequestOpen,
  onCellPreviewMedia,
  onCellOpenCurrentRound,
}: GameBoardCardProps) {
  const { t } = useTranslation()
  const resultId = useId()
  const isOpen = cell?.state === 'open'
  const isCancelled = cell?.state === 'cancelled'
  const isRevealed = isOpen || isCancelled
  const isClickable = Boolean(cell) && cell?.state === 'closed' && canOpenCells
  const isPlayed = Boolean(playResult)
  const isActiveRound = cell?.id === activeCellId
  const isCurrentRoundCell = isActiveRound && !isPlayed
  const opensCurrentRound = isCurrentRoundCell && isOpen && Boolean(onCellOpenCurrentRound)
  const previewMediaUrl = isRevealed ? resolveBackendMediaUrl(cell?.media[0]?.url) : ''
  const isPreviewable = Boolean(cell) && isRevealed
  const isInteractive = isClickable || isPreviewable

  return (
    <SurfaceButton
      type="button"
      disabled={!isInteractive}
      disableRipple
      data-cell-id={cell?.id}
      aria-describedby={isPlayed ? resultId : undefined}
      aria-label={
        cell
          ? opensCurrentRound
            ? t('gameBoard.currentRoundScreen.open')
            : isPreviewable
              ? t('gameBoard.cellMediaPreviewAction', {
                  title: cell.title || t('boardCard.cellLabel'),
                })
              : t('gameBoard.cellOpenAction', {
                  title: cell.title || t('boardCard.cellLabel'),
                  cost: cell.cost,
                })
          : undefined
      }
      onClick={() => {
        if (cell && opensCurrentRound) {
          onCellOpenCurrentRound?.(cell)
          return
        }

        if (cell?.state === 'closed' && canOpenCells) {
          onCellRequestOpen(cell)
          return
        }

        if (cell && isPreviewable) {
          onCellPreviewMedia(cell)
        }
      }}
      sx={createBoardCellSx({
        isOpen: isRevealed,
        isInteractive,
        isPlayed,
        isActiveRound,
      })}
    >
      <BoardCardFace
        cell={cell}
        previewMediaUrl={previewMediaUrl}
        playResult={playResult}
        isCurrentRoundCell={isCurrentRoundCell}
        resultId={resultId}
      />
    </SurfaceButton>
  )
}
