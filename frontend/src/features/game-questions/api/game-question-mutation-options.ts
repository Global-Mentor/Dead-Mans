import { mutationOptions, type QueryClient } from '@tanstack/react-query'
import type {
  CreateGameQuestionRequest,
  GameQuestionCatalogItem,
  UpdateGameQuestionRequest,
} from '../../../shared/api/contracts/index.ts'
import { createGameQuestion, deleteGameQuestion, updateGameQuestion } from './game-questions-api.ts'
import { gameQuestionCatalogQueryOptions, gameQuestionQueryKeys } from './game-question-queries.ts'

function invalidateGameQuestions(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: gameQuestionQueryKeys.all })
}

function cacheSavedQuestion(queryClient: QueryClient, question: GameQuestionCatalogItem) {
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
      queryClient.setQueriesData<GameQuestionCatalogItem[]>(
        { queryKey: gameQuestionQueryKeys.all },
        (questions) => questions?.filter((question) => question.questionId !== questionId),
      )
      await invalidateGameQuestions(queryClient)
    },
  })
}
