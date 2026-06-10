import { useQuery } from '@tanstack/react-query'
import { currentGameBoardQueryOptions } from './api/game-board-queries.ts'

export function useGameBoardPage() {
  return useQuery(currentGameBoardQueryOptions)
}
