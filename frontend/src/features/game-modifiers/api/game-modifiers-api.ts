import { httpClient } from '../../../shared/api/client/httpClient.ts'
import type { GameModifierDefinition } from '../../../shared/api/contracts/index.ts'

export const gameModifiersApi = {
  getCatalog: () => httpClient.get<GameModifierDefinition[]>('/game/modifiers/catalog'),
  activate: (modifierCode: string) =>
    httpClient.post<void>(`/game/modifiers/${encodeURIComponent(modifierCode)}/activate`),
}
