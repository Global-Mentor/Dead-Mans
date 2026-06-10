const GAME_SETUP_DEFAULT_ROW_COSTS = [100, 125, 150, 175, 200] as const

export function defaultGameSetupRowCost(rowIndex: number): number {
  if (rowIndex < GAME_SETUP_DEFAULT_ROW_COSTS.length) {
    return GAME_SETUP_DEFAULT_ROW_COSTS[rowIndex]
  }

  const lastCost = GAME_SETUP_DEFAULT_ROW_COSTS[GAME_SETUP_DEFAULT_ROW_COSTS.length - 1]
  const extraRows = rowIndex - GAME_SETUP_DEFAULT_ROW_COSTS.length + 1
  return lastCost + extraRows * 25
}

export function defaultGameSetupRowLabel(rowIndex: number): string {
  return `${defaultGameSetupRowCost(rowIndex)}`
}

export function defaultGameSetupColumnLabel(columnIndex: number): string {
  return `${columnIndex + 1}`
}
