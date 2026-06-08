import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { queryKeys } from '../../shared/api/query-keys.ts'
import {
  fetchGameQuestionCatalog,
  setGameQuestionCategoryEnabled,
  setGameQuestionEnabled,
} from './api/game-questions-data-access.ts'

export function useGameSetupQuestionsCatalog() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const catalogQuery = useQuery({
    queryKey: queryKeys.gameQuestions.catalog({ search }),
    queryFn: () =>
      fetchGameQuestionCatalog({
        search,
        includeDisabled: true,
      }),
  })

  const toggleQuestionMutation = useMutation({
    mutationFn: ({ questionId, isEnabled }: { questionId: string; isEnabled: boolean }) =>
      setGameQuestionEnabled(questionId, isEnabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.gameQuestions.all })
    },
  })

  const toggleCategoryMutation = useMutation({
    mutationFn: ({ category, isEnabled }: { category: string; isEnabled: boolean }) =>
      setGameQuestionCategoryEnabled(category, isEnabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.gameQuestions.all })
    },
  })

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
