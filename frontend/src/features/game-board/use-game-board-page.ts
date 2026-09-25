import { useQueries } from '@tanstack/react-query'
import { activeGameRoundQueryOptions } from '../game-rounds/api/game-rounds-queries.ts'
import {
  currentGameBoardQueryOptions,
  currentGameTeamQueueQueryOptions,
} from './api/game-board-queries.ts'

export function useGameBoardPage() {
  const [snapshotQuery, activeRoundQuery, teamQueueQuery] = useQueries({
    queries: [
      currentGameBoardQueryOptions,
      activeGameRoundQueryOptions,
      currentGameTeamQueueQueryOptions,
    ],
  })

  return {
    data: snapshotQuery.data,
    activeRound:
      activeRoundQuery.data?.gameId === snapshotQuery.data?.gameId
        ? (activeRoundQuery.data ?? null)
        : null,
    teamQueue:
      snapshotQuery.data && teamQueueQuery.data?.gameId === snapshotQuery.data.gameId
        ? (teamQueueQuery.data?.teams ?? [])
        : [],
    isTeamQueueLoading: teamQueueQuery.isLoading,
    isTeamQueueError: teamQueueQuery.isError,
    retry: () => void Promise.all([snapshotQuery.refetch(), activeRoundQuery.refetch()]),
    isRefreshing: snapshotQuery.isFetching || activeRoundQuery.isFetching,
    isLoading: snapshotQuery.isLoading || activeRoundQuery.isLoading,
    isError:
      (snapshotQuery.isError && snapshotQuery.data === undefined) ||
      (activeRoundQuery.isError && activeRoundQuery.data === undefined),
    isRefreshError: snapshotQuery.isRefetchError || activeRoundQuery.isRefetchError,
  }
}
