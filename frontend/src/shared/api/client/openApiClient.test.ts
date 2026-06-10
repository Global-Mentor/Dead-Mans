import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from '../../lib/logger.ts'
import { ApiError } from '../errors/ApiError.ts'
import { ensureOpenApiSuccess, unwrapOpenApiData } from './openApiClient.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('openApiClient result handling', () => {
  it('returns typed JSON data from a successful response', async () => {
    const data = { id: 'game-1' }

    await expect(
      unwrapOpenApiData(
        Promise.resolve({
          data,
          response: new Response(null, { status: 200 }),
        }),
      ),
    ).resolves.toEqual(data)
  })

  it('accepts successful responses without content', async () => {
    await expect(
      ensureOpenApiSuccess(
        Promise.resolve({
          data: undefined,
          response: new Response(null, { status: 204 }),
        }),
      ),
    ).resolves.toBeUndefined()
  })

  it('converts OpenAPI errors to ApiError with response details', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => undefined)
    const details = { code: 'game_setup_stale_version' }

    const request = unwrapOpenApiData(
      Promise.resolve({
        error: details,
        response: new Response(null, { status: 409 }),
      }),
    )

    await expect(request).rejects.toEqual(
      expect.objectContaining<ApiError>({
        name: 'ApiError',
        message: 'HTTP 409',
        status: 409,
        details,
      }),
    )
  })

  it('rejects an empty success when JSON data is required', async () => {
    await expect(
      unwrapOpenApiData(
        Promise.resolve({
          data: undefined,
          response: new Response(null, { status: 200 }),
        }),
      ),
    ).rejects.toThrow('API returned an empty response where JSON data was expected')
  })
})
