import {
  createApiClient,
  ensureOpenApiSuccess,
  unwrapOpenApiData,
} from '../../../shared/api/client/openApiClient.ts'
import type {
  CreateGameQuestionRequest,
  UpdateGameQuestionRequest,
  TwitchQuizPreview,
} from '../../../shared/api/contracts/index.ts'
import type { operations, paths } from '../../../shared/api/contracts/generated'

const gameQuestionsApiClient =
  createApiClient<
    Pick<
      paths,
      | '/game/questions/catalog'
      | '/game/questions'
      | '/game/questions/{questionId}'
      | '/game/questions/twitch-preview'
    >
  >()

export type GameQuestionCatalogFilters = NonNullable<
  operations['getGameQuestionCatalog']['parameters']['query']
>

export function fetchGameQuestionCatalog(filters: GameQuestionCatalogFilters = {}) {
  return unwrapOpenApiData(
    gameQuestionsApiClient.GET('/game/questions/catalog', {
      params: {
        query: {
          ...filters,
          includeDisabled: filters.includeDisabled ?? true,
        },
      },
    }),
  )
}

export function createGameQuestion(request: CreateGameQuestionRequest) {
  return unwrapOpenApiData(
    gameQuestionsApiClient.POST('/game/questions', {
      body: request,
    }),
  )
}

export function updateGameQuestion(questionId: string, request: UpdateGameQuestionRequest) {
  return unwrapOpenApiData(
    gameQuestionsApiClient.PUT('/game/questions/{questionId}', {
      params: {
        path: { questionId },
      },
      body: request,
    }),
  )
}

export function deleteGameQuestion(questionId: string) {
  return ensureOpenApiSuccess(
    gameQuestionsApiClient.DELETE('/game/questions/{questionId}', {
      params: {
        path: { questionId },
      },
    }),
  )
}

export function previewTwitchQuizMessages(
  text: string,
  options: string[],
  reward: number,
): Promise<TwitchQuizPreview> {
  return unwrapOpenApiData(
    gameQuestionsApiClient.POST('/game/questions/twitch-preview', {
      body: { text, options, reward, durationSeconds: 3600 },
    }),
  )
}
