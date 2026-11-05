import { mutationOptions, type QueryClient } from '@tanstack/react-query'
import type {
  CreateGameQuestionRequest,
  GameQuestionCatalogItem,
  GameQuestionCatalogPage,
  UpdateGameQuestionRequest,
} from '../../../shared/api/contracts/index.ts'
import { createGameQuestion, deleteGameQuestion, updateGameQuestion } from './game-questions-api.ts'
import { gameQuestionCatalogQueryOptions, gameQuestionQueryKeys } from './game-question-queries.ts'

function invalidateGameQuestions(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: gameQuestionQueryKeys.all })
}

function cacheSavedQuestion(queryClient: QueryClient, question: GameQuestionCatalogItem) {
  queryClient.setQueriesData<GameQuestionCatalogPage>(
    { queryKey: gameQuestionQueryKeys.pages },
    (page) =>
      page
        ? {
            ...page,
            items: page.items.map((item) =>
              item.questionId === question.questionId ? question : item,
            ),
          }
        : page,
  )
  queryClient.setQueryData<GameQuestionCatalogItem[]>(
    gameQuestionCatalogQueryOptions().queryKey,
    (questions) => [
      ...(questions ?? []).filter((item) => item.questionId !== question.questionId),
      question,
    ],
  )
}

export function createGameQuestionMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: (request: CreateGameQuestionRequest) => createGameQuestion(request),
    onSuccess: async (question) => {
      cacheSavedQuestion(queryClient, question)
      await invalidateGameQuestions(queryClient)
    },
  })
}

export function updateGameQuestionMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: ({
      questionId,
      request,
    }: {
      questionId: string
      request: UpdateGameQuestionRequest
    }) => updateGameQuestion(questionId, request),
    onSuccess: async (question) => {
      cacheSavedQuestion(queryClient, question)
      await invalidateGameQuestions(queryClient)
    },
  })
}

export function deleteGameQuestionMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: (questionId: string) => deleteGameQuestion(questionId),
    onSuccess: async (_, questionId) => {
      queryClient.setQueriesData<GameQuestionCatalogPage>(
        { queryKey: gameQuestionQueryKeys.pages },
        (page) =>
          page
            ? {
                ...page,
                items: page.items.filter((item) => item.questionId !== questionId),
                totalCount:
                  page.totalCount -
                  Number(page.items.some((item) => item.questionId === questionId)),
              }
            : page,
      )
      queryClient.setQueriesData<GameQuestionCatalogItem[]>(
        { queryKey: gameQuestionQueryKeys.catalogs },
        (questions) => questions?.filter((question) => question.questionId !== questionId),
      )
      await invalidateGameQuestions(queryClient)
    },
  })
}
