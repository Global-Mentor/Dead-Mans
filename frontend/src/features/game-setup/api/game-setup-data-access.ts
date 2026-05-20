import { ApiError } from '../../../shared/api/errors/ApiError.ts'
import type {
  CreateGameSetupRequest,
  GameSetupSnapshot,
  UpdateGameSetupRequest,
} from '../../../shared/api/contracts/index.ts'
import { gameSetupApi } from './game-setup-api.ts'

/**
 * Loads the current draft setup snapshot. `404` means no draft game exists yet.
 */
export async function fetchDraftGameSetupSnapshot(): Promise<GameSetupSnapshot | null> {
  try {
    return await gameSetupApi.getDraftSnapshot()
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    throw error
  }
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
