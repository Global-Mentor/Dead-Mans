import type {
  CreateGameQuestionRequest,
  GameQuestionCatalogItem,
  GameQuestionCategoryItem,
} from '../../../shared/api/contracts/index.ts'
import type { QuestionFormValues } from './question-form-schema.ts'
import { getQuestionDisplayOptions } from './question-answer-normalize.ts'

function createDefaultOptions(): QuestionFormValues['options'] {
  return Array.from({ length: 4 }, (_, index) => ({ text: '', isCorrect: index === 0 }))
}

export function toDefaultValues(
  initial: GameQuestionCatalogItem | undefined,
  categories: readonly GameQuestionCategoryItem[],
  defaultCategoryId?: string,
): QuestionFormValues {
  if (!initial) {
    return {
      categoryId:
        categories.find((category) => category.id === defaultCategoryId)?.id ??
        categories[0]?.id ??
        '',
      text: '',
      options: createDefaultOptions(),
      reward: '0',
      priority: '0',
      isEnabled: true,
    }
  }

  const options = getQuestionDisplayOptions(initial).sort(
    (left, right) => Number(right.isCorrect) - Number(left.isCorrect),
  )

  return {
    categoryId: initial.categoryId,
    text: initial.text,
    options: options.map((option, index) => ({ text: option.text, isCorrect: index === 0 })),
    reward: String(initial.reward),
    priority: String(initial.priority ?? 0),
    isEnabled: initial.isEnabled,
  }
}

export function toRequest(values: QuestionFormValues): CreateGameQuestionRequest {
  return {
    categoryId: values.categoryId,
    text: values.text.trim(),
    options: values.options.map((option, index) => ({
      text: option.text,
      isCorrect: index === 0,
    })),
    reward: Number.parseInt(values.reward, 10),
    isEnabled: values.isEnabled,
    priority: Number.parseInt(values.priority, 10),
  }
}
