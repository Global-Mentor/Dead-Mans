import type { GameRegistrationSnapshot, RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { fetchNotFoundAsNull } from '../../../shared/api/fetch-not-found-as-null.ts'
import { gameRegistrationApi } from './game-registration-api.ts'

export async function fetchGameRegistrationSnapshot(): Promise<GameRegistrationSnapshot | null> {
  return fetchNotFoundAsNull(() => gameRegistrationApi.getSnapshot())
}

export async function fetchGameRegistrationAdminTeams(): Promise<RegistrationTeam[] | null> {
  return fetchNotFoundAsNull(() => gameRegistrationApi.listTeams())
}
