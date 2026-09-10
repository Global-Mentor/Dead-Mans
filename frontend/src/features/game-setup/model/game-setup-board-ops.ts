import type { GameSetupCellDraft, GameSetupDraftState } from './game-setup-draft.ts'
import {
  defaultGameSetupColumnLabel,
  defaultGameSetupRowCost,
  defaultGameSetupRowLabel,
} from './game-setup-defaults.ts'
import { GAME_SETUP_MAX_COLS, GAME_SETUP_MAX_ROWS } from './game-setup-limits.ts'

export type BoardLayoutAction = 'add' | 'remove'
export type BoardLayoutAxis = 'row' | 'column'

function defaultCellTitle() {
  return ''
}

function clampIndex(index: number, min: number, max: number) {
  return Math.min(Math.max(index, min), max)
}

export function rebuildGameSetupCells(
  rowLabels: string[],
  colLabels: string[],
  previous?: GameSetupCellDraft[],
) {
  const previousByPosition = new Map<string, GameSetupCellDraft>(
    (previous ?? []).map((cell) => [`${cell.row}:${cell.col}`, cell]),
  )
  const cells: GameSetupCellDraft[] = []

  for (let row = 0; row < rowLabels.length; row += 1) {
    for (let col = 0; col < colLabels.length; col += 1) {
      const key = `${row}:${col}`
      const existing = previousByPosition.get(key)
      cells.push(
        existing ?? {
          row,
          col,
          title: defaultCellTitle(),
          cost: defaultGameSetupRowCost(row),
        },
      )
    }
  }

  return cells
}

export function insertGameSetupRowAt(
  draft: GameSetupDraftState,
  rowIndex: number,
): GameSetupDraftState {
  if (draft.rowLabels.length >= GAME_SETUP_MAX_ROWS) {
    return draft
  }

  const insertIndex = clampIndex(rowIndex, 0, draft.rowLabels.length)
  const nextRowLabels = [...draft.rowLabels]
  nextRowLabels.splice(insertIndex, 0, defaultGameSetupRowLabel(insertIndex))
  const shiftedCells = draft.cells.map((cell) => ({
    ...cell,
    row: cell.row >= insertIndex ? cell.row + 1 : cell.row,
  }))

  return {
    ...draft,
    rowLabels: nextRowLabels,
    cells: rebuildGameSetupCells(nextRowLabels, draft.colLabels, shiftedCells),
  }
}

function removeGameSetupRow(draft: GameSetupDraftState, rowIndex: number): GameSetupDraftState {
  if (draft.rowLabels.length <= 1 || rowIndex < 0 || rowIndex >= draft.rowLabels.length) {
    return draft
  }

  const nextRowLabels = draft.rowLabels.filter((_, index) => index !== rowIndex)
  const shiftedCells = draft.cells
    .filter((cell) => cell.row !== rowIndex)
    .map((cell) => ({
      ...cell,
      row: cell.row > rowIndex ? cell.row - 1 : cell.row,
    }))

  return {
    ...draft,
    rowLabels: nextRowLabels,
    cells: rebuildGameSetupCells(nextRowLabels, draft.colLabels, shiftedCells),
  }
}

function insertGameSetupColumnAt(
  draft: GameSetupDraftState,
  columnIndex: number,
): GameSetupDraftState {
  if (draft.colLabels.length >= GAME_SETUP_MAX_COLS) {
    return draft
  }

  const insertIndex = clampIndex(columnIndex, 0, draft.colLabels.length)
  const nextColLabels = [...draft.colLabels]
  nextColLabels.splice(insertIndex, 0, defaultGameSetupColumnLabel(insertIndex))
  const shiftedCells = draft.cells.map((cell) => ({
    ...cell,
    col: cell.col >= insertIndex ? cell.col + 1 : cell.col,
  }))

  return {
    ...draft,
    colLabels: nextColLabels,
    cells: rebuildGameSetupCells(draft.rowLabels, nextColLabels, shiftedCells),
  }
}

export function removeGameSetupColumn(
  draft: GameSetupDraftState,
  colIndex: number,
): GameSetupDraftState {
  if (draft.colLabels.length <= 1 || colIndex < 0 || colIndex >= draft.colLabels.length) {
    return draft
  }

  const nextColLabels = draft.colLabels.filter((_, index) => index !== colIndex)
  const shiftedCells = draft.cells
    .filter((cell) => cell.col !== colIndex)
    .map((cell) => ({
      ...cell,
      col: cell.col > colIndex ? cell.col - 1 : cell.col,
    }))

  return {
    ...draft,
    colLabels: nextColLabels,
    cells: rebuildGameSetupCells(draft.rowLabels, nextColLabels, shiftedCells),
  }
}

export function applyGameSetupBoardLayoutChange(
  draft: GameSetupDraftState,
  action: BoardLayoutAction,
  axis: BoardLayoutAxis,
  index: number,
): GameSetupDraftState {
  if (axis === 'row') {
    return action === 'add' ? insertGameSetupRowAt(draft, index) : removeGameSetupRow(draft, index)
  }

  return action === 'add'
    ? insertGameSetupColumnAt(draft, index)
    : removeGameSetupColumn(draft, index)
}

export function getBoardLayoutPositionIndexes(
  draft: GameSetupDraftState,
  action: BoardLayoutAction,
  axis: BoardLayoutAxis,
): number[] {
  const count = axis === 'row' ? draft.rowLabels.length : draft.colLabels.length

  if (action === 'add') {
    return Array.from({ length: count + 1 }, (_, index) => index)
  }

  return Array.from({ length: count }, (_, index) => index)
}

export function getBoardLayoutTargetLabel(
  draft: GameSetupDraftState,
  axis: BoardLayoutAxis,
  index: number,
): string {
  return axis === 'row' ? (draft.rowLabels[index] ?? '') : (draft.colLabels[index] ?? '')
}

export function canApplyBoardLayoutChange(
  draft: GameSetupDraftState,
  action: BoardLayoutAction,
  axis: BoardLayoutAxis,
): boolean {
  const count = axis === 'row' ? draft.rowLabels.length : draft.colLabels.length
  const max = axis === 'row' ? GAME_SETUP_MAX_ROWS : GAME_SETUP_MAX_COLS
  const min = 1

  if (action === 'add') {
    return count < max
  }

  return count > min
}
