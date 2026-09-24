import { useQueries } from '@tanstack/react-query'
import type { GameTeamQueueSummary } from '../../shared/api/contracts/index.ts'
import { activeGameRoundQueryOptions } from '../game-rounds/api/game-rounds-queries.ts'
import {
  currentGameBoardQueryOptions,
  currentGameTeamQueueQueryOptions,
} from './api/game-board-queries.ts'

const emptyTeamQueueSummary: GameTeamQueueSummary = {
  totalTeams: 0,
  playedTeams: 0,
  remainingTeams: 0,
}

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
    activeRound: activeRoundQuery.data ?? null,
    teamQueue: teamQueueQuery.data?.teams ?? [],
    teamQueueSummary: teamQueueQuery.data?.summary ?? emptyTeamQueueSummary,
    hasTeamQueueData: teamQueueQuery.data !== undefined,
    isTeamQueueRefreshing: teamQueueQuery.isFetching,
    retryTeamQueue: () => void teamQueueQuery.refetch(),
    retry: () => void Promise.all([snapshotQuery.refetch(), activeRoundQuery.refetch()]),
    isRefreshing: snapshotQuery.isFetching || activeRoundQuery.isFetching,
    isTeamQueueLoading: teamQueueQuery.isLoading,
    isTeamQueueError: teamQueueQuery.isError,
    isLoading: snapshotQuery.isLoading || activeRoundQuery.isLoading,
    isError: snapshotQuery.isError || activeRoundQuery.isError,
  }
}
