import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from '../../../shared/lib/logger.ts'
import { fetchGameRegistrationSnapshot } from './game-registration-api.ts'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('openapi-fetch', () => ({ default: () => ({ GET: mocks.get }) }))

afterEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

describe('registration snapshot responses', () => {
  it('clears the registration snapshot when a ready game starts', async () => {
    const snapshot = { gameId: 'game-1', gameStatus: 'ready', myPendingInvitations: [] }
    mocks.get
      .mockResolvedValueOnce({ data: snapshot, response: new Response(null, { status: 200 }) })
      .mockResolvedValueOnce({ data: undefined, response: new Response(null, { status: 204 }) })
    const logError = vi.spyOn(logger, 'error').mockImplementation(() => undefined)

    await expect(fetchGameRegistrationSnapshot()).resolves.toEqual(snapshot)
    await expect(fetchGameRegistrationSnapshot()).resolves.toBeNull()
    expect(mocks.get).toHaveBeenCalledWith('/game/registration')
    expect(logError).not.toHaveBeenCalled()
  })

  it.each([401, 404, 500])('does not hide a real HTTP %s failure', async (status) => {
    vi.spyOn(logger, 'error').mockImplementation(() => undefined)
    mocks.get.mockResolvedValue({
      error: { error: 'Request failed' },
      response: new Response(null, { status }),
    })

    await expect(fetchGameRegistrationSnapshot()).rejects.toMatchObject({ status })
  })
})
