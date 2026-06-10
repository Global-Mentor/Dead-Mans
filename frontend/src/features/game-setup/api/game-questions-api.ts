import {
  apiClient,
  ensureOpenApiSuccess,
  unwrapOpenApiData,
} from '../../../shared/api/client/openApiClient.ts'
import type { operations } from '../../../shared/api/contracts/generated.ts'

export type GameQuestionCatalogFilters = NonNullable<
  operations['getGameQuestionCatalog']['parameters']['query']
>

export function fetchGameQuestionCatalog(filters: GameQuestionCatalogFilters = {}) {
  return unwrapOpenApiData(
    apiClient.GET('/game/questions/catalog', {
      params: {
        query: {
          ...filters,
          includeDisabled: filters.includeDisabled ?? true,
        },
      },
    }),
  )
}

export function setGameQuestionEnabled(questionId: string, isEnabled: boolean) {
  return ensureOpenApiSuccess(
    apiClient.PATCH('/game/questions/{questionId}/enabled', {
      params: {
        path: { questionId },
      },
      body: { isEnabled },
    }),
  )
}

export function setGameQuestionCategoryEnabled(
  category: string,
  isEnabled: boolean,
  vectorCode?: string,
) {
  return ensureOpenApiSuccess(
    apiClient.PATCH('/game/questions/categories/{category}/enabled', {
      params: {
        path: { category },
        query: { vectorCode },
      },
      body: { isEnabled },
    }),
  )
}
