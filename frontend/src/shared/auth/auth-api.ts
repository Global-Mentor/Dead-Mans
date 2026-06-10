import type { AuthUser } from './auth-context.ts'
import { getBackendOrigin } from '../api/config.ts'
import { httpClient } from '../api/client/httpClient.ts'
import { parseApiResponse } from '../api/parse-api-response.ts'
import { authSessionSchema } from './auth-session-schema.ts'

export async function fetchAuthMe(): Promise<AuthUser> {
  const payload = await httpClient.get<unknown>('/auth/me', {
    baseUrl: getBackendOrigin(),
    cache: 'no-store',
    credentials: 'include',
  })
  const data = parseApiResponse(authSessionSchema, payload, 'AuthSession')

  return {
    id: data.userId,
    displayName: data.displayName,
    roles: data.roles,
  }
}
