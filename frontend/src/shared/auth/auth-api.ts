import type { AuthUser } from './auth-context.ts'
import {
  backendApiClient,
  ensureOpenApiSuccess,
  unwrapOpenApiData,
} from '../api/client/openApiClient.ts'
import { parseApiResponse } from '../api/parse-api-response.ts'
import { authSessionSchema } from './auth-session-schema.ts'

export async function fetchAuthMe(): Promise<AuthUser> {
  const payload = await unwrapOpenApiData(
    backendApiClient.GET('/auth/me', {
      cache: 'no-store',
    }),
  )
  const data = parseApiResponse(authSessionSchema, payload, 'AuthSession')

  return {
    id: data.userId,
    displayName: data.displayName,
    roles: data.roles,
  }
}

export async function logoutAuthSession(): Promise<void> {
  await ensureOpenApiSuccess(backendApiClient.POST('/auth/logout'))
}
