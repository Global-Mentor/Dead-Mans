import { mutationOptions, type QueryClient } from '@tanstack/react-query'
import type {
  CreateGameModifierRequest,
  GameModifierDefinition,
  UpdateGameModifierRequest,
} from '../../../shared/api/contracts/index.ts'
import { isModifierCompatibilityLockedError } from '../model/catalog-error.ts'
import { gameModifierCatalogQueryOptions } from '../../game-modifiers/index.ts'
import {
  createGameModifier,
  deleteGameModifier,
  updateGameModifier,
} from './catalog-modifiers-api.ts'

function invalidateModifierCatalog(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: gameModifierCatalogQueryOptions.queryKey })
}

async function cacheSavedModifier(queryClient: QueryClient, saved: GameModifierDefinition) {
  await queryClient.cancelQueries({ queryKey: gameModifierCatalogQueryOptions.queryKey })
  queryClient.setQueryData(gameModifierCatalogQueryOptions.queryKey, (current) =>
    current ? [...current.filter((item) => item.id !== saved.id), saved] : undefined,
  )
  return invalidateModifierCatalog(queryClient)
}

export function createGameModifierMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: (request: CreateGameModifierRequest) => createGameModifier(request),
    onSuccess: (saved) => cacheSavedModifier(queryClient, saved),
    onError: (error) => {
      if (isModifierCompatibilityLockedError(error)) return invalidateModifierCatalog(queryClient)
    },
  })
}

export function updateGameModifierMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: ({
      modifierId,
      request,
    }: {
      modifierId: string
      request: UpdateGameModifierRequest
    }) => updateGameModifier(modifierId, request),
    onSuccess: (saved) => cacheSavedModifier(queryClient, saved),
    onError: (error) => {
      if (isModifierCompatibilityLockedError(error)) return invalidateModifierCatalog(queryClient)
    },
  })
}

export function deleteGameModifierMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: ({
      modifierId,
      expectedRevision,
    }: {
      modifierId: string
      expectedRevision: number
    }) => deleteGameModifier(modifierId, expectedRevision),
    onSuccess: async (_, { modifierId }) => {
      await queryClient.cancelQueries({ queryKey: gameModifierCatalogQueryOptions.queryKey })
      queryClient.setQueryData(gameModifierCatalogQueryOptions.queryKey, (current) =>
        current?.filter((item) => item.id !== modifierId),
      )
      return invalidateModifierCatalog(queryClient)
    },
  })
}
