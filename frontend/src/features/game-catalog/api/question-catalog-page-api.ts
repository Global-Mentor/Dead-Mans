import { createApiClient, unwrapOpenApiData } from '../../../shared/api/client/openApiClient.ts'
import type { operations, paths } from '../../../shared/api/contracts/generated'

export type CatalogPageFilters = NonNullable<
  operations['getGameQuestionCatalogPage']['parameters']['query']
>
const client = createApiClient<Pick<paths, '/game/questions/catalog/page'>>()

export function fetchQuestionCatalogPage(filters: CatalogPageFilters, signal?: AbortSignal) {
  return unwrapOpenApiData(
    client.GET('/game/questions/catalog/page', {
      params: { query: filters },
      ...(signal ? { signal } : {}),
    }),
  )
}
