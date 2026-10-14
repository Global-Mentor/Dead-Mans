import type { components } from '../../../shared/api/contracts/generated'

type ScorePreview = components['schemas']['GameRoundScorePreviewDto']
type GameRoundPreviewStatus =
  'incomplete' | 'debouncing' | 'loading' | 'success' | 'error' | 'stale'

export interface GameRoundPreviewState {
  status: GameRoundPreviewStatus
  data: ScorePreview | null
  inputKey: string | null
  errorCode: string | null
}
