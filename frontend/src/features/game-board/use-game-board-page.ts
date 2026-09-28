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
  const hasCurrentTeamQueue = Boolean(
    snapshotQuery.data && teamQueueQuery.data?.gameId === snapshotQuery.data.gameId,
  )
  const hasActiveRoundData =
    activeRoundQuery.data === null ||
    (activeRoundQuery.data !== undefined &&
      activeRoundQuery.data.gameId === snapshotQuery.data?.gameId)

  return {
    data: snapshotQuery.data,
    hasActiveRoundData,
    activeRound:
      activeRoundQuery.data?.gameId === snapshotQuery.data?.gameId
        ? (activeRoundQuery.data ?? null)
        : null,
    teamQueue: hasCurrentTeamQueue ? (teamQueueQuery.data?.teams ?? []) : [],
    isTeamQueueLoading: teamQueueQuery.isLoading,
    isTeamQueueError: teamQueueQuery.isError,
    hasTeamQueueData: hasCurrentTeamQueue,
    isTeamQueueRefreshing: teamQueueQuery.isFetching,
    retryTeamQueue: () => void teamQueueQuery.refetch(),
    retry: () => void Promise.all([snapshotQuery.refetch(), activeRoundQuery.refetch()]),
    isRefreshing: snapshotQuery.isFetching || activeRoundQuery.isFetching,
    isLoading: snapshotQuery.isLoading,
    isError: snapshotQuery.isError && snapshotQuery.data === undefined,
    isRefreshError: snapshotQuery.isRefetchError || activeRoundQuery.isError,
  }
}
