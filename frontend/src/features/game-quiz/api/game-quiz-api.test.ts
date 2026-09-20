import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from '../../../shared/lib/logger.ts'
import { fetchCurrentGameQuizState } from './game-quiz-api.ts'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('openapi-fetch', () => ({ default: () => ({ GET: mocks.get }) }))
afterEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

describe('current quiz responses', () => {
  it('treats no question as an empty state rather than an error', async () => {
    mocks.get.mockResolvedValue({ data: undefined, response: new Response(null, { status: 204 }) })
    const log = vi.spyOn(logger, 'error').mockImplementation(() => undefined)
    await expect(fetchCurrentGameQuizState()).resolves.toBeNull()
    expect(log).not.toHaveBeenCalled()
  })

  it.each([401, 403, 500])('preserves HTTP %s failures', async (status) => {
    vi.spyOn(logger, 'error').mockImplementation(() => undefined)
    mocks.get.mockResolvedValue({
      error: { error: 'Failed' },
      response: new Response(null, { status }),
    })
    await expect(fetchCurrentGameQuizState()).rejects.toMatchObject({ status })
  })
})
