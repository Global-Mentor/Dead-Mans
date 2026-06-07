import { gameQuestionsApi } from './game-questions-api.ts'

export function fetchGameQuestionCatalog(filters?: {
  vectorCode?: string
  category?: string
  search?: string
  includeDisabled?: boolean
}) {
  return gameQuestionsApi.getCatalog(filters)
}

export function setGameQuestionEnabled(questionId: string, isEnabled: boolean) {
  return gameQuestionsApi.setQuestionEnabled(questionId, { isEnabled })
}

export function setGameQuestionCategoryEnabled(
  category: string,
  isEnabled: boolean,
  vectorCode?: string,
) {
  return gameQuestionsApi.setCategoryEnabled(category, { isEnabled }, vectorCode)
}
