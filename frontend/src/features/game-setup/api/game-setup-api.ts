import { httpClient } from '../../../shared/api/client/httpClient.ts'
import type {
  CreateGameSetupRequest,
  GameSetupSnapshot,
  UpdateGameSetupRequest,
} from '../../../shared/api/contracts/index.ts'

export const gameSetupApi = {
  getDraftSnapshot: () => httpClient.get<GameSetupSnapshot>('/game/setup'),
  createDraft: (request: CreateGameSetupRequest) =>
    httpClient.post<GameSetupSnapshot>('/game/setup', request),
  saveDraft: (request: UpdateGameSetupRequest) =>
    httpClient.put<GameSetupSnapshot>('/game/setup', request),
  deleteDraft: () => httpClient.delete<void>('/game/setup'),
}
