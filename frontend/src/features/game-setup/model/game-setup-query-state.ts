import type { GameSetupSnapshot } from '../../../shared/api/contracts/index.ts'
import { fetchDraftGameSetupSnapshot } from '../api/game-setup-data-access.ts'
import {
  createDraftFromSnapshot,
  type GameSetupDraftState,
} from './game-setup-draft.ts'

export interface LoadedGameSetupDraftState {
  snapshot: GameSetupSnapshot | null
  savedDraft: GameSetupDraftState | null
  initialDraft: GameSetupDraftState | null
}

export function getSnapshotDraftKey(snapshot: GameSetupSnapshot): string {
  return snapshot.gameId
}

export function createLoadedDraftState(snapshot: GameSetupSnapshot | null): LoadedGameSetupDraftState {
  if (snapshot === null) {
    return {
      snapshot: null,
      savedDraft: null,
      initialDraft: null,
    }
  }

  const serverDraft = createDraftFromSnapshot(snapshot)
  return {
    snapshot,
    savedDraft: serverDraft,
    initialDraft: serverDraft,
  }
}

export async function loadGameSetupDraftQueryState(): Promise<LoadedGameSetupDraftState> {
  return createLoadedDraftState(await fetchDraftGameSetupSnapshot())
}
