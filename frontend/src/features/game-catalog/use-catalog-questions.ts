import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type {
  CreateGameQuestionCategoryRequest,
  CreateGameQuestionRequest,
  GameQuestionCategoryItem,
  GameQuestionCatalogItem,
} from '../../shared/api/contracts/index.ts'
import {
  createGameQuestionMutationOptions,
  deleteGameQuestionMutationOptions,
  gameQuestionCatalogQueryOptions,
  gameQuestionQueryKeys,
  updateGameQuestionMutationOptions,
} from '../game-questions/index.ts'
import {
  createQuestionCategory,
  deleteQuestionCategory,
  questionCategoryQueryKey,
  questionCategoryQueryOptions,
  updateQuestionCategory,
} from './api/question-categories-api.ts'
import { downloadQuestionImportTemplate, importQuestionsFile } from './api/question-import-api.ts'

type QuestionDialogState =
  { mode: 'create'; question: undefined } | { mode: 'edit'; question: GameQuestionCatalogItem }

export function useCatalogQuestions() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const catalogQuery = useQuery(gameQuestionCatalogQueryOptions())
  const categoriesQuery = useQuery(questionCategoryQueryOptions())
  const createMutation = useMutation(createGameQuestionMutationOptions(queryClient))
  const updateMutation = useMutation(updateGameQuestionMutationOptions(queryClient))
  const deleteMutation = useMutation(deleteGameQuestionMutationOptions(queryClient))
  const createCategoryMutation = useMutation({
    mutationFn: (request: CreateGameQuestionCategoryRequest) => createQuestionCategory(request),
    onSuccess: async (category) => {
      queryClient.setQueryData<GameQuestionCategoryItem[]>(
        questionCategoryQueryKey,
        (categories) => [...(categories ?? []).filter((item) => item.id !== category.id), category],
      )
      await queryClient.invalidateQueries({ queryKey: questionCategoryQueryKey })
    },
  })
  const updateCategoryMutation = useMutation({
    mutationFn: ({
      categoryId,
      request,
    }: {
      categoryId: string
      request: CreateGameQuestionCategoryRequest
    }) => updateQuestionCategory(categoryId, request),
    onSuccess: async (category) => {
      queryClient.setQueryData<GameQuestionCategoryItem[]>(questionCategoryQueryKey, (categories) =>
        categories?.map((item) => (item.id === category.id ? category : item)),
      )
      queryClient.setQueriesData<GameQuestionCatalogItem[]>(
        { queryKey: gameQuestionQueryKeys.all },
        (questions) =>
          questions?.map((question) =>
            question.categoryId === category.id
              ? { ...question, categoryName: category.name }
              : question,
          ),
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: questionCategoryQueryKey }),
        queryClient.invalidateQueries({ queryKey: gameQuestionQueryKeys.all }),
      ])
    },
  })
  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => deleteQuestionCategory(categoryId),
    onSuccess: async (_, categoryId) => {
      queryClient.setQueryData<GameQuestionCategoryItem[]>(questionCategoryQueryKey, (categories) =>
        categories?.filter((category) => category.id !== categoryId),
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: questionCategoryQueryKey }),
        queryClient.invalidateQueries({ queryKey: gameQuestionQueryKeys.all }),
      ])
    },
  })
  const importQuestionsMutation = useMutation({
    mutationFn: (file: File) => importQuestionsFile(file),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: questionCategoryQueryKey }),
        queryClient.invalidateQueries({ queryKey: gameQuestionQueryKeys.all }),
      ])
    },
  })
  const downloadTemplateMutation = useMutation({
    mutationFn: (locale?: string) => downloadQuestionImportTemplate(locale),
  })

  const [dialog, setDialog] = useState<QuestionDialogState | null>(null)
  const [categoryDialog, setCategoryDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<GameQuestionCatalogItem | null>(null)

  const openCreate = () => setDialog({ mode: 'create', question: undefined })
  const openEdit = (question: GameQuestionCatalogItem) => setDialog({ mode: 'edit', question })
  const closeDialog = () => setDialog(null)
  const openCategoryManagement = () => setCategoryDialog(true)
  const closeCategoryManagement = () => setCategoryDialog(false)

  const submitQuestion = async (request: CreateGameQuestionRequest) => {
    const saved =
      dialog?.mode === 'edit'
        ? await updateMutation.mutateAsync({ questionId: dialog.question.questionId, request })
        : await createMutation.mutateAsync(request)
    await queryClient.invalidateQueries({ queryKey: questionCategoryQueryKey })
    closeDialog()
    return saved
  }

  const submitCategory = async (
    action: 'create' | 'edit' | 'delete',
    categoryId: string,
    name: string,
  ) => {
    if (action === 'delete') {
      await deleteCategoryMutation.mutateAsync(categoryId)
      if (selectedCategoryId === categoryId) setSelectedCategoryId(null)
    } else if (action === 'edit') {
      await updateCategoryMutation.mutateAsync({ categoryId, request: { name } })
    } else {
      await createCategoryMutation.mutateAsync({ name })
    }
  }

  const requestDelete = (question: GameQuestionCatalogItem) => setDeleteTarget(question)
  const cancelDelete = () => setDeleteTarget(null)
  const confirmDelete = async () => {
    if (!deleteTarget) {
      return
    }
    await deleteMutation.mutateAsync(deleteTarget.questionId)
    await queryClient.invalidateQueries({ queryKey: questionCategoryQueryKey })
    setDeleteTarget(null)
  }

  return {
    search,
    setSearch,
    selectedCategoryId,
    setSelectedCategoryId,
    catalogQuery,
    categoriesQuery,
    dialog,
    openCreate,
    openEdit,
    closeDialog,
    submitQuestion,
    categoryDialog,
    openCategoryManagement,
    closeCategoryManagement,
    submitCategory,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isSavingCategory:
      createCategoryMutation.isPending ||
      updateCategoryMutation.isPending ||
      deleteCategoryMutation.isPending,
    deleteTarget,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting: deleteMutation.isPending,
    importQuestions: importQuestionsMutation.mutateAsync,
    isImportingQuestions: importQuestionsMutation.isPending,
    downloadTemplate: downloadTemplateMutation.mutateAsync,
    isDownloadingTemplate: downloadTemplateMutation.isPending,
  }
}
