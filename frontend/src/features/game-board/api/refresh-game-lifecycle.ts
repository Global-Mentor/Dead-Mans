import { isCancelledError, type QueryClient } from '@tanstack/react-query'
import { logger } from '../../../shared/lib/logger.ts'
import { gameRegistrationQueryKeys } from '../../game-registration/index.ts'
import { gameModifierQueryKeys } from '../../game-modifiers/index.ts'
import { gameHistoryQueryKeys } from '../../game-history/index.ts'
import { gameSetupDraftQueryOptions } from '../../game-setup/index.ts'
import { activeGameRoundQueryOptions } from '../../game-rounds/index.ts'
import { currentGameBoardQueryOptions, gameBoardQueryKeys } from './game-board-queries.ts'
import { gameFinishQueryKeys } from './game-finish-queries.ts'

// Refresh dependent queries only after HTTP has confirmed the current lifecycle.
export async function refreshGameLifecycle(client: QueryClient) {
  const pendingKeys = [
    currentGameBoardQueryOptions.queryKey,
    gameRegistrationQueryKeys.all,
    gameModifierQueryKeys.all,
    gameFinishQueryKeys.all,
  ]
  await Promise.all(pendingKeys.map((queryKey) => client.cancelQueries({ queryKey })))
  const board = await client
    .fetchQuery({ ...currentGameBoardQueryOptions, staleTime: 0 })
    .catch((error) => {
      if (!isCancelledError(error)) logger.warn('Game lifecycle resync failed', error)
      return undefined
    })
  if (board === undefined) return
  const active = board?.status === 'active'
  const registrationAvailable = active || board?.status === 'ready'
  await Promise.all([
    client.invalidateQueries({ queryKey: gameBoardQueryKeys.currentTeamQueue() }),
    client.invalidateQueries({ queryKey: gameBoardQueryKeys.manualQuizAwardPlayers() }),
    client.invalidateQueries({ queryKey: gameSetupDraftQueryOptions.queryKey }),
    client.invalidateQueries({ queryKey: activeGameRoundQueryOptions.queryKey }),
    client.invalidateQueries({ queryKey: gameHistoryQueryKeys.all }),
    client.invalidateQueries({
      queryKey: gameRegistrationQueryKeys.all,
      refetchType: registrationAvailable ? 'active' : 'none',
    }),
    client.invalidateQueries({
      queryKey: gameModifierQueryKeys.all,
      refetchType: active ? 'active' : 'none',
    }),
    client.invalidateQueries({
      queryKey: gameFinishQueryKeys.all,
      refetchType: active ? 'active' : 'none',
    }),
  ])
}
