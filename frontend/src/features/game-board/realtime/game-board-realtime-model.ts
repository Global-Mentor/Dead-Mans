import type {
  GameBoardSnapshot,
  GameCellOpenedEvent,
  GameModifierActivatedEvent,
} from '../../../shared/api/contracts/index.ts'

export type CellOpenedEvent = GameCellOpenedEvent
export type ModifierActivatedEvent = GameModifierActivatedEvent

interface CellOpenedPatchResult {
  nextSnapshot: GameBoardSnapshot | null
  requiresResync: boolean
}

export function applyCellOpenedEvent(
  current: GameBoardSnapshot | null | undefined,
  event: CellOpenedEvent,
): CellOpenedPatchResult {
  if (!current) {
    return { nextSnapshot: null, requiresResync: true }
  }

  if (current.gameId !== event.gameId || event.version <= current.version) {
    return { nextSnapshot: current, requiresResync: false }
  }

  let updated = false
  const cells = current.cells.map((cell) => {
    if (cell.id !== event.cell.id) {
      return cell
    }

    updated = true
    return event.cell
  })

  if (!updated) {
    return { nextSnapshot: current, requiresResync: true }
  }

  return {
    nextSnapshot: {
      ...current,
      version: event.version,
      cells,
    },
    requiresResync: false,
  }
}
