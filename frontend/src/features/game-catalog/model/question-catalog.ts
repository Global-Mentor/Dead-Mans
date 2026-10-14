import type { GameQuestionCatalogItem } from '../../../shared/api/contracts/index.ts'

export type QuestionCatalogStatus = 'all' | 'enabled' | 'disabled'
export type QuestionCatalogSort =
  'category' | 'rewardAsc' | 'rewardDesc' | 'priorityAsc' | 'priorityDesc' | 'leastAsked'
export interface QuestionCatalogFilters {
  search: string
  categoryId: string | null
  status: QuestionCatalogStatus
  sort: QuestionCatalogSort
}

export function filterCatalogQuestions(
  questions: readonly GameQuestionCatalogItem[],
  filters: QuestionCatalogFilters,
  locale: string,
) {
  const query = filters.search.trim().toLocaleLowerCase(locale)
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' })
  return questions
    .filter(
      (question) =>
        (!filters.categoryId || question.categoryId === filters.categoryId) &&
        (filters.status === 'all' || question.isEnabled === (filters.status === 'enabled')) &&
        (!query ||
          [
            question.text,
            question.categoryName,
            question.questionCode,
            ...question.options.map((option) => option.text),
          ].some((value) => value?.toLocaleLowerCase(locale).includes(query))),
    )
    .sort(
      (a, b) =>
        (filters.sort === 'rewardAsc'
          ? a.reward - b.reward
          : filters.sort === 'rewardDesc'
            ? b.reward - a.reward
            : filters.sort === 'priorityAsc'
              ? (a.priority ?? 0) - (b.priority ?? 0)
              : filters.sort === 'priorityDesc'
                ? (b.priority ?? 0) - (a.priority ?? 0)
                : filters.sort === 'leastAsked'
                  ? a.askedTotalCount - b.askedTotalCount
                  : 0) ||
        collator.compare(a.categoryName, b.categoryName) ||
        collator.compare(a.text, b.text) ||
        a.questionId.localeCompare(b.questionId),
    )
}
