import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { GameQuestionCatalogItem } from '../../shared/api/contracts/index.ts'
import { useCatalogQuestionSelection } from './use-catalog-question-selection.ts'

const question = (id: string): GameQuestionCatalogItem => ({
  questionId: id,
  questionCode: id,
  categoryId: 'category',
  categoryName: 'Category',
  text: id,
  options: [],
  reward: 1,
  isEnabled: true,
  askedTotalCount: 0,
  submissionTotalCount: 0,
  correctSubmissionTotalCount: 0,
  correctPercentage: 0,
})

it('keeps a saved question outside the current page and resets selection for a new view', () => {
  const firstPage = Array.from({ length: 40 }, (_, index) => question(`existing-${index}`))
  const saved = question('new-question-on-another-page')
  const { result, rerender } = renderHook(
    ({ items, viewKey }) => useCatalogQuestionSelection(items, viewKey),
    { initialProps: { items: firstPage, viewKey: 'page-1' } },
  )
  act(() => result.current.select(saved))
  rerender({ items: [...firstPage], viewKey: 'page-1' })
  expect(result.current.selected).toEqual(saved)
  rerender({ items: [{ ...saved, text: 'Refreshed server text' }], viewKey: 'page-1' })
  expect(result.current.selected?.text).toBe('Refreshed server text')
  rerender({ items: [question('different-filter')], viewKey: 'filtered-page-1' })
  expect(result.current.selected?.questionId).toBe('different-filter')
})

it('does not replace an explicitly opened row when a pending page response arrives', () => {
  const old = question('selected-placeholder-row')
  const next = question('new-page-row')
  const { result, rerender } = renderHook(
    ({ items }) => useCatalogQuestionSelection(items, 'page-2'),
    { initialProps: { items: [old] } },
  )
  act(() => result.current.select(old))
  rerender({ items: [next] })
  expect(result.current.selected).toEqual(old)
  act(() => result.current.clear())
  expect(result.current.selected).toEqual(next)
})
