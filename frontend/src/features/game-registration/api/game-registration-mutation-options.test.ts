import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { currentGameTeamQueueQueryOptions } from '../../game-board/index.ts'
import {
  updateGameTeamLimitMutationOptions,
  acceptGameRegistrationInvitationMutationOptions,
  assignGameRegistrationPlayerToTeamMutationOptions,
  cancelGameRegistrationTeamInvitationMutationOptions,
  cancelPlayerGameRegistrationInvitationMutationOptions,
  confirmGameRegistrationTeamMutationOptions,
  unconfirmGameRegistrationTeamMutationOptions,
  createAdminGameRegistrationInvitationMutationOptions,
  createAdminGameRegistrationTeamMutationOptions,
  createPlayerGameRegistrationInvitationMutationOptions,
  createGameRegistrationTeamMutationOptions,
  declineGameRegistrationInvitationMutationOptions,
  disbandGameRegistrationTeamMutationOptions,
  joinGameRegistrationTeamMutationOptions,
  leaveGameRegistrationTeamMutationOptions,
  moveGameRegistrationTeamToSlotMutationOptions,
  requestMyGameRegistrationTeamDisbandMutationOptions,
  rejectGameRegistrationTeamMutationOptions,
  removeGameRegistrationPlayerFromTeamMutationOptions,
  startGameFromRegistrationMutationOptions,
  updateMyGameRegistrationReadinessMutationOptions,
} from './game-registration-mutation-options.ts'
import {
  acceptGameRegistrationInvitation,
  assignGameRegistrationPlayerToTeam,
  cancelGameRegistrationTeamInvitation,
  cancelPlayerGameRegistrationInvitation,
  confirmGameRegistrationTeam,
  unconfirmGameRegistrationTeam,
  createAdminGameRegistrationInvitation,
  createAdminGameRegistrationTeam,
  createPlayerGameRegistrationInvitation,
  createGameRegistrationTeam,
  declineGameRegistrationInvitation,
  disbandGameRegistrationTeam,
  joinGameRegistrationTeam,
  leaveGameRegistrationTeam,
  moveGameRegistrationTeamToSlot,
  requestMyGameRegistrationTeamDisband,
  rejectGameRegistrationTeam,
  removeGameRegistrationPlayerFromTeam,
  startGameFromRegistration,
  updateMyGameRegistrationReadiness,
} from './game-registration-api.ts'
import { gameRegistrationQueryKeys } from './game-registration-queries.ts'

describe('game registration mutation options', () => {
  it.each([
    [createGameRegistrationTeamMutationOptions, createGameRegistrationTeam],
    [joinGameRegistrationTeamMutationOptions, joinGameRegistrationTeam],
    [updateMyGameRegistrationReadinessMutationOptions, updateMyGameRegistrationReadiness],
    [createAdminGameRegistrationTeamMutationOptions, createAdminGameRegistrationTeam],
    [leaveGameRegistrationTeamMutationOptions, leaveGameRegistrationTeam],
    [requestMyGameRegistrationTeamDisbandMutationOptions, requestMyGameRegistrationTeamDisband],
    [acceptGameRegistrationInvitationMutationOptions, acceptGameRegistrationInvitation],
    [declineGameRegistrationInvitationMutationOptions, declineGameRegistrationInvitation],
    [createPlayerGameRegistrationInvitationMutationOptions, createPlayerGameRegistrationInvitation],
    [createAdminGameRegistrationInvitationMutationOptions, createAdminGameRegistrationInvitation],
    [cancelPlayerGameRegistrationInvitationMutationOptions, cancelPlayerGameRegistrationInvitation],
    [confirmGameRegistrationTeamMutationOptions, confirmGameRegistrationTeam],
    [unconfirmGameRegistrationTeamMutationOptions, unconfirmGameRegistrationTeam],
    [rejectGameRegistrationTeamMutationOptions, rejectGameRegistrationTeam],
    [disbandGameRegistrationTeamMutationOptions, disbandGameRegistrationTeam],
    [assignGameRegistrationPlayerToTeamMutationOptions, assignGameRegistrationPlayerToTeam],
    [removeGameRegistrationPlayerFromTeamMutationOptions, removeGameRegistrationPlayerFromTeam],
    [cancelGameRegistrationTeamInvitationMutationOptions, cancelGameRegistrationTeamInvitation],
    [moveGameRegistrationTeamToSlotMutationOptions, moveGameRegistrationTeamToSlot],
    [startGameFromRegistrationMutationOptions, startGameFromRegistration],
  ])('keeps each concrete mutation wired to its API operation', (factory, mutationFn) => {
    const options = factory(new QueryClient(), vi.fn())

    expect(options.mutationFn).toBe(mutationFn)
  })

  it('invalidates registration and board team queue queries after a successful mutation', async () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined)
    const options = createGameRegistrationTeamMutationOptions(queryClient, vi.fn())

    await options.onSuccess?.(undefined as never, true, undefined, undefined as never)

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: gameRegistrationQueryKeys.all,
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: currentGameTeamQueueQueryOptions.queryKey,
    })
  })

  it('keeps a committed limit in matching caches without overwriting another game', async () => {
    const client = new QueryClient()
    const adminKey = gameRegistrationQueryKeys.adminSnapshot()
    const publicKey = gameRegistrationQueryKeys.snapshot()
    client.setQueryData(adminKey, { gameId: 'current', teamLimit: 10, canCreateTeam: true })
    client.setQueryData(publicKey, { gameId: 'other', teamLimit: 8, canCreateTeam: true })
    const options = updateGameTeamLimitMutationOptions(client, vi.fn())
    await options.onSuccess?.(
      undefined,
      { gameId: 'current', teamLimit: 4 },
      undefined,
      undefined as never,
    )
    expect(client.getQueryData(adminKey)).toEqual({
      gameId: 'current',
      teamLimit: 4,
      canCreateTeam: false,
    })
    expect(client.getQueryData(publicKey)).toEqual({
      gameId: 'other',
      teamLimit: 8,
      canCreateTeam: true,
    })
    expect(client.getQueryState(adminKey)?.isInvalidated).toBe(true)
    client.clear()
  })

  it('updates public capacity without changing a newer administrative game', async () => {
    const client = new QueryClient()
    const adminKey = gameRegistrationQueryKeys.adminSnapshot()
    const publicKey = gameRegistrationQueryKeys.snapshot()
    client.setQueryData(adminKey, { gameId: 'new', teamLimit: 10, canCreateTeam: true })
    client.setQueryData(publicKey, { gameId: 'current', teamLimit: 4, canCreateTeam: false })
    const options = updateGameTeamLimitMutationOptions(client, vi.fn())
    await options.onSuccess?.(
      undefined,
      { gameId: 'current', teamLimit: null },
      undefined,
      undefined as never,
    )
    expect(client.getQueryData(publicKey)).toEqual({
      gameId: 'current',
      teamLimit: null,
      canCreateTeam: false,
    })
    expect(client.getQueryData(adminKey)).toEqual({
      gameId: 'new',
      teamLimit: 10,
      canCreateTeam: true,
    })
    client.clear()
  })

  it('does not invent registration snapshots when saving without cached data', async () => {
    const client = new QueryClient()
    const options = updateGameTeamLimitMutationOptions(client, vi.fn())
    await options.onSuccess?.(
      undefined,
      { gameId: 'current', teamLimit: 4 },
      undefined,
      undefined as never,
    )
    expect(client.getQueryData(gameRegistrationQueryKeys.adminSnapshot())).toBeUndefined()
    expect(client.getQueryData(gameRegistrationQueryKeys.snapshot())).toBeUndefined()
    client.clear()
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
