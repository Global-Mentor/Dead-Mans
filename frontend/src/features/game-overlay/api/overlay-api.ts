import type { components, paths } from '../../../shared/api/contracts/generated'
import {
  createApiClient,
  unwrapOpenApiData,
  ensureOpenApiSuccess,
} from '../../../shared/api/client/openApiClient.ts'

const client = createApiClient<paths>()

export function fetchOverlayKey(signal: AbortSignal) {
  return unwrapOpenApiData(client.GET('/overlay/key', { signal, cache: 'no-store' }))
}

export function fetchOverlayLeaderboardState(gameId: string, signal: AbortSignal) {
  return unwrapOpenApiData(
    client.GET('/overlay/games/{gameId}/leaderboard', {
      params: { path: { gameId } },
      signal,
      cache: 'no-store',
    }),
  )
}

export function setOverlayLeaderboardState(
  gameId: string,
  state: components['schemas']['SetGameOverlayLeaderboardRequest'],
) {
  return unwrapOpenApiData(
    client.PUT('/overlay/games/{gameId}/leaderboard', {
      params: { path: { gameId } },
      body: state,
    }),
  )
}

export function rotateOverlayKey() {
  return unwrapOpenApiData(client.POST('/overlay/key'))
}

export function revokeOverlayKey() {
  return ensureOpenApiSuccess(client.DELETE('/overlay/key'))
}

export function fetchOverlayTestState(signal: AbortSignal) {
  return unwrapOpenApiData(client.GET('/overlay/test', { signal, cache: 'no-store' }))
}

export function setOverlayTestEnabled(enabled: boolean) {
  return unwrapOpenApiData(client.PUT('/overlay/test', { body: { enabled } }))
}

export async function fetchOverlayFrame(key: string, signal: AbortSignal) {
  const snapshot = await unwrapOpenApiData(
    client.GET('/overlay/snapshot', {
      params: { header: { 'X-Overlay-Key': key } },
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    }),
  )
  return { snapshot, receivedAtMonotonicMs: performance.now() }
}
