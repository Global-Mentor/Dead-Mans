import { httpClient } from '../../../shared/api/client/httpClient.ts'
import type { CreateGameSetupRequest, GameSetupSnapshot } from '../../../shared/api/contracts/index.ts'

export const gameSetupApi = {
  getDraftSnapshot: () => httpClient.get<GameSetupSnapshot>('/game/setup'),
  createDraft: (request: CreateGameSetupRequest) =>
    httpClient.post<GameSetupSnapshot>('/game/setup', request),
}
