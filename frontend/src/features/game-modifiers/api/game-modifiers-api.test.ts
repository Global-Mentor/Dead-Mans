import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from '../../../shared/lib/logger.ts'
import {
  cancelGameModifierActivation,
  emergencyDisableGameModifier,
  selfCancelGameModifierActivation,
} from './game-modifiers-api.ts'

const mocks = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('openapi-fetch', () => ({ default: () => ({ POST: mocks.post }) }))

afterEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

const commands = [
  { name: 'self cancellation', run: () => selfCancelGameModifierActivation('activation', 3) },
  {
    name: 'admin cancellation',
    run: () => cancelGameModifierActivation('activation', 3, 'Reason'),
  },
  { name: 'emergency disable', run: () => emergencyDisableGameModifier('modifier', 'Reason') },
]

describe.each(commands)('$name response handling', ({ run }) => {
  it('accepts the documented 204 response without expecting JSON', async () => {
    mocks.post.mockResolvedValue({ response: new Response(null, { status: 204 }) })
    const logError = vi.spyOn(logger, 'error').mockImplementation(() => undefined)
    await expect(run()).resolves.toBeUndefined()
    expect(logError).not.toHaveBeenCalled()
  })

  it.each([403, 409, 500])('preserves HTTP %s errors', async (status) => {
    const details = { code: 'modifier_command_rejected' }
    mocks.post.mockResolvedValue({ error: details, response: new Response(null, { status }) })
    vi.spyOn(logger, 'error').mockImplementation(() => undefined)
    await expect(run()).rejects.toMatchObject({ status, details })
  })
})
