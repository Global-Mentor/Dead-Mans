import { fetchNotFoundAsNull } from '../../../shared/api/fetch-not-found-as-null.ts'
import type { GameBoardCellId, GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'
import { gameBoardApi } from './game-board-api.ts'


export async function fetchCurrentGameBoardSnapshot(): Promise<GameBoardSnapshot | null> {
  return fetchNotFoundAsNull(() => gameBoardApi.getCurrentSnapshot())
}

export async function openGameBoardCell(cellId: GameBoardCellId): Promise<void> {
  await gameBoardApi.openCell(cellId)
}
