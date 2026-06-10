import { fetchNotFoundAsNull } from '../../../shared/api/fetch-not-found-as-null.ts'
import type {
  CreateGameSetupRequest,
  GameSetupSnapshot,
  UpdateGameSetupRequest,
} from '../../../shared/api/contracts/index.ts'
import { gameSetupApi } from './game-setup-api.ts'

export async function fetchDraftGameSetupSnapshot(): Promise<GameSetupSnapshot | null> {
  return fetchNotFoundAsNull(() => gameSetupApi.getDraftSnapshot())
}

export async function createDraftGameSetup(
  request: CreateGameSetupRequest,
): Promise<GameSetupSnapshot> {
  return gameSetupApi.createDraft(request)
}

export async function saveDraftGameSetup(
  request: UpdateGameSetupRequest,
): Promise<GameSetupSnapshot> {
  return gameSetupApi.saveDraft(request)
}

export async function deleteDraftGameSetup(): Promise<void> {
  return gameSetupApi.deleteDraft()
}

export async function uploadDraftGameSetupCellMedia(cellId: string, file: File) {
  return gameSetupApi.uploadCellMedia(cellId, file)
}

export async function deleteDraftGameSetupCellMedia(cellId: string): Promise<void> {
  return gameSetupApi.deleteCellMedia(cellId)
}
