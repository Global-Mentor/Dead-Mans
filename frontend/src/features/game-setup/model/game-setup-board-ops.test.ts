import { describe, expect, it } from 'vitest'
import type { GameSetupDraftState } from './game-setup-draft.ts'
import {
  insertGameSetupRowAt,
  removeGameSetupColumn,
} from './game-setup-board-ops.ts'

function createDraft(): GameSetupDraftState {
  return {
    title: 'Draft',
    rowLabels: ['100', '200'],
    colLabels: ['A', 'B'],
    enabledModifierCodes: [],
    cells: [
      { id: 'a', row: 0, col: 0, title: 'A', cost: 100 },
      { id: 'b', row: 0, col: 1, title: 'B', cost: 100 },
      { id: 'c', row: 1, col: 0, title: 'C', cost: 200 },
      { id: 'd', row: 1, col: 1, title: 'D', cost: 200 },
    ],
  }
}

describe('game setup board operations', () => {
  it('preserves existing cells when inserting a row', () => {
    const next = insertGameSetupRowAt(createDraft(), 1)

    expect(next.rowLabels).toEqual(['100', '125', '200'])
    expect(next.cells.find((cell) => cell.id === 'c')).toMatchObject({ row: 2, col: 0 })
    expect(next.cells).toHaveLength(6)
  })

  it('removes cells from a deleted column and shifts later columns', () => {
    const next = removeGameSetupColumn(createDraft(), 0)

    expect(next.colLabels).toEqual(['B'])
    expect(next.cells.map((cell) => cell.id)).toEqual(['b', 'd'])
    expect(next.cells.every((cell) => cell.col === 0)).toBe(true)
  })
})
