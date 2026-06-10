import { apiClient, unwrapOpenApiData } from '../../../shared/api/client/openApiClient.ts'

export function fetchGameModifierCatalog() {
  return unwrapOpenApiData(apiClient.GET('/game/modifiers/catalog'))
}
