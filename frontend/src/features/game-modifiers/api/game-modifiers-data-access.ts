import type { GameModifierDefinition } from '../../../shared/api/contracts/index.ts'
import { gameModifiersApi } from './game-modifiers-api.ts'

export async function fetchGameModifierCatalog(): Promise<GameModifierDefinition[]> {
  return gameModifiersApi.getCatalog()
}
