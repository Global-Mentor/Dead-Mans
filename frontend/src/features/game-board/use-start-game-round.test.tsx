import { QueryClient, QueryClientProvider, queryOptions, useQuery } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import type { components } from '../../shared/api/contracts/generated'
import { activeGameRoundQueryOptions } from '../game-rounds/index.ts'
import { gameRegistrationQueryKeys } from '../game-registration/index.ts'
import { currentGameTeamQueueQueryOptions } from './api/game-board-queries.ts'
import { useStartGameRound } from './use-start-game-round.ts'

const api = vi.hoisted(() => ({
  completeGameRoundPreparation: vi.fn(),
  finishGameRoundPresentation: vi.fn(),
}))
vi.mock('../game-rounds/api/game-rounds-api.ts', async (original) => ({
  ...(await original<typeof import('../game-rounds/api/game-rounds-api.ts')>()),
  ...api,
}))

const round: components['schemas']['GameRoundDetailsDto'] = {
  roundId: 'round-1',
  gameId: 'game-1',
  cellId: 'cell-1',
  teamId: 'team-1',
  teamSlotIndex: 1,
  status: 'preparing',
  roundVersion: 3,
  startedAtUtc: '2026-10-14T00:00:00Z',
  serverNowUtc: '2026-10-14T00:00:00Z',
  baseScore: 100,
  emptyCardPenaltyApplied: false,
  killsCount: 0,
  bountyCount: 0,
  participants: [],
  modifierResults: [],
  scoreDetails: {
    scoreUnit: 100,
    killsScore: 0,
    bountyScore: 0,
    modifierKillDelta: 0,
    modifierKillScore: 0,
    modifierScoreDelta: 0,
    emptyCardPenaltyApplied: false,
    emptyCardPenaltyScore: 0,
    penaltyTotal: 0,
    bonusDelta: 0,
    totalKillCount: 0,
    finalScore: 0,
  },
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function setup(initial = round) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData(activeGameRoundQueryOptions.queryKey, initial)
  const query = vi.fn().mockRejectedValue(new Error('Offline after command'))
  const hook = renderHook(
    () => {
      const active = useQuery(
        queryOptions({
          ...activeGameRoundQueryOptions,
          queryFn: query,
          staleTime: Infinity,
        }),
      )
      return { active, actions: useStartGameRound() }
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  )
  return { client, query, ...hook }
}

it('retains the confirmed preparation phase when the following refresh fails', async () => {
  const ready = { ...round, status: 'preparation_completed' as const, roundVersion: 4 }
  api.completeGameRoundPreparation.mockResolvedValue(ready)
  const { result, query, client } = setup()
  act(() =>
    result.current.actions.completePreparation({ roundId: round.roundId, expectedRoundVersion: 3 }),
  )
  await waitFor(() => expect(result.current.active.isRefetchError).toBe(true))
  expect(query).toHaveBeenCalledOnce()
  expect(result.current.active.data).toEqual(ready)
  expect(result.current.actions.errorMessage).toBeNull()
  client.clear()
})

it('clears a finished round and refreshes team state without depending on SignalR', async () => {
  const showing = { ...round, status: 'showing_results' as const, roundVersion: 7 }
  api.finishGameRoundPresentation.mockResolvedValue({
    ...showing,
    status: 'completed',
    roundVersion: 8,
  })
  const { result, client } = setup(showing)
  client.setQueryData(currentGameTeamQueueQueryOptions.queryKey, { marker: 'queue' })
  client.setQueryData([...gameRegistrationQueryKeys.all, 'adminSnapshot'], {
    marker: 'registration',
  })
  act(() =>
    result.current.actions.finishPresentation({ roundId: round.roundId, expectedRoundVersion: 7 }),
  )
  await waitFor(() => expect(result.current.active.isRefetchError).toBe(true))
  expect(result.current.active.data).toBeNull()
  expect(client.getQueryState(currentGameTeamQueueQueryOptions.queryKey)?.isInvalidated).toBe(true)
  expect(
    client.getQueryState([...gameRegistrationQueryKeys.all, 'adminSnapshot'])?.isInvalidated,
  ).toBe(true)
  client.clear()
})

it('does not replace a newer active round with a delayed command response', async () => {
  api.completeGameRoundPreparation.mockResolvedValue({
    ...round,
    status: 'preparation_completed',
    roundVersion: 4,
  })
  const newer = { ...round, roundId: 'round-2' }
  const { result, client } = setup(newer)
  act(() =>
    result.current.actions.completePreparation({ roundId: round.roundId, expectedRoundVersion: 3 }),
  )
  await waitFor(() => expect(result.current.active.isRefetchError).toBe(true))
  expect(result.current.active.data).toEqual(newer)
  client.clear()
})
