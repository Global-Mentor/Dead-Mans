import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { gameQuestionCatalogQueryOptions } from '../game-questions/index.ts'

export function useGameSetupQuestionsCatalog() {
  const { i18n } = useTranslation()
  const locale = i18n.resolvedLanguage
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const catalogQuery = useQuery(
    gameQuestionCatalogQueryOptions({ search: '', includeDisabled: false }),
  )
  const questions = useMemo(
    () => (catalogQuery.data ?? []).filter((question) => question.isEnabled),
    [catalogQuery.data],
  )
  const categories = useMemo(
    () =>
      Array.from(
        new Map(
          questions.map((question) => [
            question.categoryId,
            {
              value: question.categoryId,
              label: question.categoryName,
            },
          ]),
        ).values(),
      ).sort((a, b) => a.label.localeCompare(b.label, locale)),
    [locale, questions],
  )
  const filteredQuestions = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(locale)
    return questions.filter(
      (question) =>
        (activeCategory === 'all' || question.categoryId === activeCategory) &&
        [question.text, ...question.options.map((option) => option.text)].some((text) =>
          text.toLocaleLowerCase(locale).includes(needle),
        ),
    )
  }, [activeCategory, locale, questions, search])
  return {
    search,
    setSearch,
    activeCategory,
    setActiveCategory,
    catalogQuery,
    categories,
    filteredQuestions,
  }
}
