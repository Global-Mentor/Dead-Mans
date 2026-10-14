import { describe, expect, it } from 'vitest'
import type { GameQuestionCatalogItem } from '../../../shared/api/contracts/index.ts'
import { filterCatalogQuestions, type QuestionCatalogFilters } from './question-catalog.ts'

const filters: QuestionCatalogFilters = {
  search: '',
  categoryId: null,
  status: 'all',
  sort: 'category',
}
function question(
  id: string,
  overrides: Partial<GameQuestionCatalogItem> = {},
): GameQuestionCatalogItem {
  return {
    questionId: id,
    questionCode: 'code-' + id,
    categoryId: 'geo',
    categoryName: 'Geography',
    text: 'Capital ' + id,
    reward: 5,
    priority: 0,
    isEnabled: true,
    twitchCompatible: true,
    askedTotalCount: 0,
    submissionTotalCount: 0,
    correctSubmissionTotalCount: 0,
    correctPercentage: 0,
    options: [
      { optionId: 'a', text: 'Warsaw', isCorrect: true, sortOrder: 0 },
      { optionId: 'b', text: 'Paris', isCorrect: false, sortOrder: 1 },
    ],
    ...overrides,
  }
}
describe('question catalog', () => {
  it('intersects category, availability and answer search', () => {
    const items = [
      question('a'),
      question('b', { isEnabled: false }),
      question('c', { categoryId: 'science' }),
      question('d', { twitchCompatible: false }),
    ]
    expect(
      filterCatalogQuestions(
        items,
        {
          ...filters,
          search: '  WARSAW ',
          categoryId: 'geo',
          status: 'enabled',
        },
        'en',
      ).map((item) => item.questionId),
    ).toEqual(['a', 'd'])
    expect(
      filterCatalogQuestions(items, { ...filters, search: 'code-b' }, 'en').map(
        (item) => item.questionId,
      ),
    ).toEqual(['b'])
  })
  it('sorts by the chosen value with deterministic ties without modifying source data', () => {
    const items = [
      question('b', { text: 'Same', reward: 0, priority: 1, askedTotalCount: 3 }),
      question('a', { text: 'Same', reward: 10, priority: 5, askedTotalCount: 0 }),
    ]
    expect(
      filterCatalogQuestions(items, { ...filters, sort: 'rewardAsc' }, 'en')[0]?.questionId,
    ).toBe('b')
    expect(
      filterCatalogQuestions(items, { ...filters, sort: 'priorityDesc' }, 'en')[0]?.questionId,
    ).toBe('a')
    expect(
      filterCatalogQuestions(items, { ...filters, sort: 'leastAsked' }, 'en')[0]?.questionId,
    ).toBe('a')
    expect(
      filterCatalogQuestions(items, { ...filters, sort: 'rewardDesc' }, 'en')[0]?.questionId,
    ).toBe('a')
    expect(
      filterCatalogQuestions(items, { ...filters, sort: 'priorityAsc' }, 'en')[0]?.questionId,
    ).toBe('b')
    expect(filterCatalogQuestions(items, filters, 'en')[0]?.questionId).toBe('a')
    expect(items.map((item) => item.questionId)).toEqual(['b', 'a'])
  })
})
