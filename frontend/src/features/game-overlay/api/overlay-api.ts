import type { paths } from '../../../shared/api/contracts/generated'
import {
  createApiClient,
  unwrapOpenApiData,
  ensureOpenApiSuccess,
} from '../../../shared/api/client/openApiClient.ts'

const client = createApiClient<paths>()

export function rotateOverlayKey() {
  return unwrapOpenApiData(client.POST('/overlay/key'))
}

export function revokeOverlayKey() {
  return ensureOpenApiSuccess(client.DELETE('/overlay/key'))
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
