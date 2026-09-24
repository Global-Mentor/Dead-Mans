import { GameQuizRealtimeSync } from '../../game-quiz/GameQuizRealtimeSync.tsx'
import { GameBoardRealtimeSync } from './GameBoardRealtimeSync.tsx'

export function GameBoardQuizRealtimeSync() {
  return (
    <>
      <GameBoardRealtimeSync />
      <GameQuizRealtimeSync />
    </>
  )
}
