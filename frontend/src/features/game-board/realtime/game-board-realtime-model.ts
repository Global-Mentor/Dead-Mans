import type {
  GameBoardSnapshot,
  GameCellOpenedEvent,
  GameModifierActivatedEvent,
  GameModifierActivationCancelledEvent,
} from '../../../shared/api/contracts/index.ts'

export type CellOpenedEvent = GameCellOpenedEvent
export type ModifierActivatedEvent = GameModifierActivatedEvent
export type ModifierActivationCancelledEvent = GameModifierActivationCancelledEvent

export function selectNewerGameBoardSnapshot(
  current: GameBoardSnapshot | null | undefined,
  incoming: GameBoardSnapshot,
): GameBoardSnapshot {
  if (!current || current.gameId !== incoming.gameId) {
    return incoming
  }

  return incoming.version > current.version ? incoming : current
}

export function applyCellOpenedEvent(
  current: GameBoardSnapshot | null | undefined,
  event: CellOpenedEvent,
): GameBoardSnapshot | null {
  if (!current) {
    return null
  }

  if (current.gameId !== event.gameId || event.version <= current.version) {
    return current
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
    return current
  }

  return {
    ...current,
    version: event.version,
    cells,
  }
}

export function applyModifierActivatedEvent(
  current: GameBoardSnapshot | null | undefined,
  event: ModifierActivatedEvent,
): GameBoardSnapshot | null {
  if (!current) {
    return null
  }

  if (current.gameId !== event.gameId || event.version <= current.version) {
    return current
  }

  let activationExists = false
  const activeModifiers = current.activeModifiers.map((activation) => {
    if (activation.activationId !== event.activation.activationId) {
      return activation
    }

    activationExists = true
    return event.activation
  })

  return {
    ...current,
    version: event.version,
    activeModifiers: activationExists ? activeModifiers : [...activeModifiers, event.activation],
  }
}

export function applyModifierActivationCancelledEvent(
  current: GameBoardSnapshot | null | undefined,
  event: ModifierActivationCancelledEvent,
): GameBoardSnapshot | null {
  if (!current) {
    return null
  }

  if (current.gameId !== event.gameId || event.version <= current.version) {
    return current
  }

  const activeModifiers = current.activeModifiers.filter(
    (activation) => activation.activationId !== event.activationId,
  )

  if (activeModifiers.length === current.activeModifiers.length) {
    return current
  }

  return {
    ...current,
    version: event.version,
    activeModifiers,
  }
}
