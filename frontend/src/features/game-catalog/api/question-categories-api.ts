import { queryOptions } from '@tanstack/react-query'
import {
  createApiClient,
  ensureOpenApiSuccess,
  unwrapOpenApiData,
} from '../../../shared/api/client/openApiClient.ts'
import type {
  CreateGameQuestionCategoryRequest,
  GameQuestionCategoryItem,
} from '../../../shared/api/contracts/index.ts'
import type { paths } from '../../../shared/api/contracts/generated'

const questionCategoriesApiClient =
  createApiClient<
    Pick<paths, '/game/questions/categories' | '/game/questions/categories/{categoryId}'>
  >()

export const questionCategoryQueryKey = ['gameQuestionCategories'] as const

function fetchQuestionCategories(
  format: 'text' | 'screenshot',
): Promise<GameQuestionCategoryItem[]> {
  return unwrapOpenApiData(
    questionCategoriesApiClient.GET('/game/questions/categories', {
      params: { query: { format } },
    }),
  )
}

export function questionCategoryQueryOptions(format: 'text' | 'screenshot') {
  return queryOptions({
    queryKey: [...questionCategoryQueryKey, format],
    queryFn: () => fetchQuestionCategories(format),
  })
}

export function createQuestionCategory(
  request: CreateGameQuestionCategoryRequest,
  format: 'text' | 'screenshot',
): Promise<GameQuestionCategoryItem> {
  return unwrapOpenApiData(
    questionCategoriesApiClient.POST('/game/questions/categories', {
      params: { query: { format } },
      body: request,
    }),
  )
}

export function updateQuestionCategory(
  categoryId: string,
  request: CreateGameQuestionCategoryRequest,
): Promise<GameQuestionCategoryItem> {
  return unwrapOpenApiData(
    questionCategoriesApiClient.PUT('/game/questions/categories/{categoryId}', {
      params: {
        path: { categoryId },
      },
      body: request,
    }),
  )
}

export function deleteQuestionCategory(categoryId: string) {
  return ensureOpenApiSuccess(
    questionCategoriesApiClient.DELETE('/game/questions/categories/{categoryId}', {
      params: {
        path: { categoryId },
      },
    }),
  )
}
