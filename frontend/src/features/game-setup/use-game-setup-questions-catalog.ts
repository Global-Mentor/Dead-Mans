import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { gameQuestionCatalogQueryOptions } from './api/game-question-queries.ts'
import {
  setGameQuestionCategoryEnabledMutationOptions,
  setGameQuestionEnabledMutationOptions,
} from './api/game-question-mutation-options.ts'

export function useGameSetupQuestionsCatalog() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const catalogQuery = useQuery(gameQuestionCatalogQueryOptions({ search }))

  const toggleQuestionMutation = useMutation(setGameQuestionEnabledMutationOptions(queryClient))

  const toggleCategoryMutation = useMutation(
    setGameQuestionCategoryEnabledMutationOptions(queryClient),
  )

  const questions = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data])

  const categories = useMemo(() => {
    return Array.from(new Set(questions.map((question) => question.category))).sort((a, b) =>
      a.localeCompare(b),
    )
  }, [questions])

  const filteredQuestions = useMemo(() => {
    if (!activeCategory) {
      return questions
    }

    return questions.filter((question) => question.category === activeCategory)
  }, [activeCategory, questions])

  return {
    search,
    setSearch,
    activeCategory,
    setActiveCategory,
    catalogQuery,
    toggleQuestionMutation,
    toggleCategoryMutation,
    categories,
    filteredQuestions,
  }
}
