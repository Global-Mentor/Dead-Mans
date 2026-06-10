import { queryOptions } from '@tanstack/react-query'
import { fetchCurrentGameBoardSnapshot } from './game-board-data-access.ts'

const gameBoardQueryKeys = {
  all: ['gameBoard'] as const,
  currentSnapshot: () => [...gameBoardQueryKeys.all, 'currentSnapshot'] as const,
}

export const currentGameBoardQueryOptions = queryOptions({
  queryKey: gameBoardQueryKeys.currentSnapshot(),
  queryFn: fetchCurrentGameBoardSnapshot,
})
