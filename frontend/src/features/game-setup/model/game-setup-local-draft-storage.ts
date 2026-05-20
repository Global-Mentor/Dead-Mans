import type { GameSetupSnapshot } from '../../../shared/api/contracts/index.ts'
import {
  createDraftFromSnapshot,
  isGameSetupDraftDirty,
  type GameSetupDraftState,
} from './game-setup-draft.ts'

const STORAGE_KEY = 'deadmans.game-setup.local-draft'
const SCHEMA_VERSION = 2

export interface GameSetupLocalDraftRecord {
  v: typeof SCHEMA_VERSION
  gameId: string
  boardVersion: number
  draft: GameSetupDraftState
  updatedAt: string
}

export function isGameSetupDraftStructureValid(draft: GameSetupDraftState): boolean {
  const rowCount = draft.rowLabels.length
  const colCount = draft.colLabels.length
  const expectedCellCount = rowCount * colCount

  if (draft.cells.length !== expectedCellCount) {
    return false
  }

  const seenPositions = new Set<string>()
  return draft.cells.every((cell) => {
    if (cell.row < 0 || cell.row >= rowCount || cell.col < 0 || cell.col >= colCount) {
      return false
    }

    const key = `${cell.row}:${cell.col}`
    if (seenPositions.has(key)) {
      return false
    }

    seenPositions.add(key)
    return true
  })
}

export function resolveInitialGameSetupDraft(snapshot: GameSetupSnapshot): {
  serverDraft: GameSetupDraftState
  draft: GameSetupDraftState
  restoredFromLocal: boolean
} {
  const serverDraft = createDraftFromSnapshot(snapshot)
  const local = readGameSetupLocalDraft()

  if (local && local.gameId === snapshot.gameId && local.boardVersion === snapshot.version) {
    if (isGameSetupDraftStructureValid(local.draft) && isGameSetupDraftDirty(serverDraft, local.draft)) {
      return {
        serverDraft,
        draft: local.draft,
        restoredFromLocal: true,
      }
    }

    clearGameSetupLocalDraft()
  } else if (local) {
    clearGameSetupLocalDraft()
  }

  return {
    serverDraft,
    draft: serverDraft,
    restoredFromLocal: false,
  }
}

export function readGameSetupLocalDraft(): GameSetupLocalDraftRecord | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    return parseGameSetupLocalDraftRecord(raw)
  } catch {
    return null
  }
}

export function writeGameSetupLocalDraft(record: Omit<GameSetupLocalDraftRecord, 'v' | 'updatedAt'>) {
  try {
    const payload: GameSetupLocalDraftRecord = {
      v: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      ...record,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore quota/private-mode failures; server save remains the source of truth.
  }
}

export function clearGameSetupLocalDraft() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage access errors.
  }
}

function parseGameSetupLocalDraftRecord(raw: string): GameSetupLocalDraftRecord | null {
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const record = parsed as Partial<GameSetupLocalDraftRecord>
  if (
    record.v !== SCHEMA_VERSION
    || typeof record.gameId !== 'string'
    || typeof record.boardVersion !== 'number'
    || !record.draft
    || typeof record.draft.title !== 'string'
    || !Array.isArray(record.draft.rowLabels)
    || !Array.isArray(record.draft.colLabels)
    || !Array.isArray(record.draft.cells)
  ) {
    return null
  }

  return record as GameSetupLocalDraftRecord
}
