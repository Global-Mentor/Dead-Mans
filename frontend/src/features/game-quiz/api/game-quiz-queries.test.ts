import { describe, expect, it } from 'vitest'
import { gameQuizQueryKeys } from './game-quiz-queries.ts'

describe('game quiz query keys', () => {
  it('isolates current and available-question caches by game', () => {
    expect(gameQuizQueryKeys.current('game-a')).not.toEqual(gameQuizQueryKeys.current('game-b'))
    expect(gameQuizQueryKeys.availableQuestions('game-a')).not.toEqual(
      gameQuizQueryKeys.availableQuestions('game-b'),
    )
  })
})
