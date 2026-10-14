import {
  createApiClient,
  unwrapOpenApiData,
  unwrapOpenApiDataOrNullOnNoContent,
} from '../../../shared/api/client/openApiClient.ts'
import type { components } from '../../../shared/api/contracts/generated'
import type { paths } from '../../../shared/api/contracts/generated'

type FinalizeGameRoundRequest = components['schemas']['FinalizeGameRoundRequestDto']
type GameRoundVersionCommandRequest = components['schemas']['GameRoundVersionCommandRequestDto']
type TechnicalCancelGameRoundRequest = components['schemas']['TechnicalCancelGameRoundRequestDto']

const gameRoundsApiClient =
  createApiClient<
    Pick<
      paths,
      | '/game/rounds/active'
      | '/game/rounds/{roundId}/review'
      | '/game/rounds/{roundId}/finish-presentation'
      | '/game/rounds/{roundId}/prepare'
      | '/game/rounds/{roundId}/complete-preparation'
      | '/game/rounds/{roundId}/start-modifier-ordering'
      | '/game/rounds/{roundId}/begin-gameplay'
      | '/game/rounds/{roundId}/rebuild'
      | '/game/rounds/{roundId}/technical-cancel'
      | '/game/rounds/{roundId}/finalize'
      | '/game/rounds/{roundId}/broadcast-summary'
    >
  >()

export function fetchActiveGameRound() {
  return unwrapOpenApiDataOrNullOnNoContent(gameRoundsApiClient.GET('/game/rounds/active'))
}

export function prepareGameRound(roundId: string, request: GameRoundVersionCommandRequest) {
  return unwrapOpenApiData(
    gameRoundsApiClient.POST('/game/rounds/{roundId}/prepare', {
      params: { path: { roundId } },
      body: request,
    }),
  )
}

export function completeGameRoundPreparation(
  roundId: string,
  request: GameRoundVersionCommandRequest,
) {
  return unwrapOpenApiData(
    gameRoundsApiClient.POST('/game/rounds/{roundId}/complete-preparation', {
      params: { path: { roundId } },
      body: request,
    }),
  )
}

export function startGameRoundModifierOrdering(
  roundId: string,
  request: GameRoundVersionCommandRequest,
) {
  return unwrapOpenApiData(
    gameRoundsApiClient.POST('/game/rounds/{roundId}/start-modifier-ordering', {
      params: { path: { roundId } },
      body: request,
    }),
  )
}

export function beginGameRoundGameplay(roundId: string, request: GameRoundVersionCommandRequest) {
  return unwrapOpenApiData(
    gameRoundsApiClient.POST('/game/rounds/{roundId}/begin-gameplay', {
      params: { path: { roundId } },
      body: request,
    }),
  )
}

export function rebuildGameRound(roundId: string, request: GameRoundVersionCommandRequest) {
  return unwrapOpenApiData(
    gameRoundsApiClient.POST('/game/rounds/{roundId}/rebuild', {
      params: { path: { roundId } },
      body: request,
    }),
  )
}

export function technicalCancelGameRound(
  roundId: string,
  request: TechnicalCancelGameRoundRequest,
) {
  return unwrapOpenApiData(
    gameRoundsApiClient.POST('/game/rounds/{roundId}/technical-cancel', {
      params: { path: { roundId } },
      body: request,
    }),
  )
}

export function finishGameRoundPresentation(
  roundId: string,
  request: GameRoundVersionCommandRequest,
) {
  return unwrapOpenApiData(
    gameRoundsApiClient.POST('/game/rounds/{roundId}/finish-presentation', {
      params: { path: { roundId } },
      body: request,
    }),
  )
}

export function reviewGameRound(roundId: string, request: GameRoundVersionCommandRequest) {
  return unwrapOpenApiData(
    gameRoundsApiClient.POST('/game/rounds/{roundId}/review', {
      params: { path: { roundId } },
      body: request,
    }),
  )
}

export function finalizeGameRound(roundId: string, request: FinalizeGameRoundRequest) {
  return unwrapOpenApiData(
    gameRoundsApiClient.POST('/game/rounds/{roundId}/finalize', {
      params: { path: { roundId } },
      body: request,
    }),
  )
}

export function broadcastGameRoundSummary(
  roundId: string,
  request: components['schemas']['BroadcastGameRoundSummaryRequestDto'],
) {
  return unwrapOpenApiDataOrNullOnNoContent(
    gameRoundsApiClient.POST('/game/rounds/{roundId}/broadcast-summary', {
      signal: AbortSignal.timeout(8000),
      params: { path: { roundId } },
      body: request,
    }),
  )
}
