import { httpClient } from '../../../shared/api/client/httpClient.ts'
import type { GameBoardCellId, GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'

export const gameBoardApi = {
  getCurrentSnapshot: () => httpClient.get<GameBoardSnapshot>('/game'),
  openCell: (cellId: GameBoardCellId) => httpClient.post<void>(`/game/cells/${cellId}/open`),
}
