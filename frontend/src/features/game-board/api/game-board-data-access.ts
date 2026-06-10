import { fetchNotFoundAsNull } from '../../../shared/api/fetch-not-found-as-null.ts'
import type { GameBoardCellId } from '../../../shared/api/contracts/index.ts'
import {
  apiClient,
  ensureOpenApiSuccess,
  unwrapOpenApiData,
} from '../../../shared/api/client/openApiClient.ts'

export async function fetchCurrentGameBoardSnapshot() {
  return fetchNotFoundAsNull(() => unwrapOpenApiData(apiClient.GET('/game')))
}

export async function openGameBoardCell(cellId: GameBoardCellId): Promise<void> {
  await ensureOpenApiSuccess(
    apiClient.POST('/game/cells/{cellId}/open', {
      params: {
        path: { cellId },
      },
    }),
  )
}
