import { httpClient } from '../../../shared/api/client/httpClient.ts'
import type {
  AnswerGameQuestionRequestDto,
  AskedGameQuestionDto,
  GameQuestionCatalogItemDto,
  GameQuestionRoundSummaryDto,
  SetGameQuestionCategoryEnabledRequestDto,
  SetGameQuestionEnabledRequestDto,
} from '../../../shared/api/contracts/index.ts'

export const gameQuestionsApi = {
  getCatalog: (params?: {
    vectorCode?: string
    category?: string
    search?: string
    includeDisabled?: boolean
  }) =>
    httpClient.get<GameQuestionCatalogItemDto[]>('/game/questions/catalog', {
      query: {
        vectorCode: params?.vectorCode,
        category: params?.category,
        search: params?.search,
        includeDisabled: params?.includeDisabled ?? true,
      },
    }),
  setQuestionEnabled: (questionId: string, request: SetGameQuestionEnabledRequestDto) =>
    httpClient.patch<void>(`/game/questions/${questionId}/enabled`, request),
  setCategoryEnabled: (
    category: string,
    request: SetGameQuestionCategoryEnabledRequestDto,
    vectorCode?: string,
  ) =>
    httpClient.patch<void>(
      `/game/questions/categories/${encodeURIComponent(category)}/enabled`,
      request,
      { query: vectorCode ? { vectorCode } : undefined },
    ),
  askNext: () => httpClient.post<AskedGameQuestionDto>('/game/questions/ask-next'),
  answerRound: (roundId: string, request: AnswerGameQuestionRequestDto) =>
    httpClient.post<GameQuestionRoundSummaryDto>(
      `/game/questions/rounds/${roundId}/answer`,
      request,
    ),
}
