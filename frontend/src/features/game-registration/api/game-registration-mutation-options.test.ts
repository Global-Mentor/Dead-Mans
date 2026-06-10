import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import {
  createGameRegistrationTeamMutationOptions,
  rejectGameRegistrationTeamMutationOptions,
} from './game-registration-mutation-options.ts'
import { gameRegistrationQueryKeys } from './game-registration-queries.ts'

describe('game registration mutation options', () => {
  it('invalidates all registration queries after a successful mutation', async () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined)
    const options = createGameRegistrationTeamMutationOptions(queryClient, vi.fn())

    await options.onSuccess?.(undefined as never, true, undefined, undefined as never)

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: gameRegistrationQueryKeys.all,
    })
  })

  it('uses the shared error handler for each concrete mutation', () => {
    const queryClient = new QueryClient()
    const onError = vi.fn()
    const options = rejectGameRegistrationTeamMutationOptions(queryClient, onError)
    const error = new Error('rejected')

    options.onError?.(error, 'team-1', undefined, undefined as never)

    expect(onError).toHaveBeenCalledWith(error)
  })
})
