import { queryOptions } from '@tanstack/react-query'
import {
  fetchCurrentGameBoardSnapshot,
  fetchCurrentGameTeamQueue,
} from './game-board-data-access.ts'
import { fetchManualQuizAwardPlayers } from './manual-quiz-award-api.ts'

export const gameBoardQueryKeys = {
  all: ['gameBoard'] as const,
  currentSnapshot: () => [...gameBoardQueryKeys.all, 'currentSnapshot'] as const,
  currentTeamQueue: () => [...gameBoardQueryKeys.all, 'currentTeamQueue'] as const,
  manualQuizAwardPlayers: () => [...gameBoardQueryKeys.all, 'manualQuizAwardPlayers'] as const,
}

export const currentGameBoardQueryOptions = queryOptions({
  queryKey: gameBoardQueryKeys.currentSnapshot(),
  queryFn: fetchCurrentGameBoardSnapshot,
})

const teamQueueRefreshOptions = {
  staleTime: 0,
  refetchInterval: 5_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const

export const currentGameTeamQueueQueryOptions = queryOptions({
  queryKey: gameBoardQueryKeys.currentTeamQueue(),
  queryFn: fetchCurrentGameTeamQueue,
  ...teamQueueRefreshOptions,
})

export function currentGameTeamQueueForGameQueryOptions(gameId: string) {
  return queryOptions({
    queryKey: [...gameBoardQueryKeys.currentTeamQueue(), gameId] as const,
    queryFn: async () => {
      const result = await fetchCurrentGameTeamQueue()
      if (result.gameId !== gameId) {
        throw new Error('The active game changed while the team queue was loading.')
      }
      return result
    },
    ...teamQueueRefreshOptions,
  })
}

export const manualGameQuizAwardPlayersQueryOptions = queryOptions({
  queryKey: gameBoardQueryKeys.manualQuizAwardPlayers(),
  queryFn: fetchManualQuizAwardPlayers,
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
})
