import type { GameBoardCellMedia, GameSetupSnapshot } from '../../../shared/api/contracts/index.ts'

export function patchGameSetupSnapshotCellMedia(
  snapshot: GameSetupSnapshot,
  cellId: string,
  media: GameBoardCellMedia | null,
): GameSetupSnapshot {
  return {
    ...snapshot,
    cells: snapshot.cells.map((cell) =>
      cell.id === cellId ? { ...cell, media: media ? [media] : [] } : cell,
    ),
  }
}
