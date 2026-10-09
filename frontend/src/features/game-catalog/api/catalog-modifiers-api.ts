import {
  createApiClient,
  ensureOpenApiSuccess,
  unwrapOpenApiData,
} from '../../../shared/api/client/openApiClient.ts'
import type {
  CreateGameModifierRequest,
  UpdateGameModifierRequest,
} from '../../../shared/api/contracts/index.ts'
import type { paths } from '../../../shared/api/contracts/generated'

const catalogModifiersApiClient =
  createApiClient<
    Pick<
      paths,
      | '/game/modifiers'
      | '/game/modifiers/catalog'
      | '/game/modifiers/preview'
      | '/game/modifiers/{modifierId}'
    >
  >()

export function fetchArchivedModifierCatalog() {
  return unwrapOpenApiData(
    catalogModifiersApiClient.GET('/game/modifiers/catalog', {
      params: { query: { archived: true } },
    }),
  )
}

export function createGameModifier(request: CreateGameModifierRequest) {
  return unwrapOpenApiData(
    catalogModifiersApiClient.POST('/game/modifiers', {
      body: request,
    }),
  )
}

export function previewGameModifier(request: CreateGameModifierRequest) {
  return unwrapOpenApiData(
    catalogModifiersApiClient.POST('/game/modifiers/preview', {
      body: request,
    }),
  )
}

export function updateGameModifier(modifierId: string, request: UpdateGameModifierRequest) {
  return unwrapOpenApiData(
    catalogModifiersApiClient.PUT('/game/modifiers/{modifierId}', {
      params: {
        path: { modifierId },
      },
      body: request,
    }),
  )
}

export function deleteGameModifier(modifierId: string, expectedRevision: number) {
  return ensureOpenApiSuccess(
    catalogModifiersApiClient.DELETE('/game/modifiers/{modifierId}', {
      params: {
        path: { modifierId },
        query: { expectedRevision },
      },
    }),
  )
}
