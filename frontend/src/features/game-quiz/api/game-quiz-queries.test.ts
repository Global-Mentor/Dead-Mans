import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import type { CurrentGameQuizState } from '../../../shared/api/contracts/index.ts'
import { currentGameQuizQueryOptions, gameQuizQueryKeys } from './game-quiz-queries.ts'

describe('game quiz query keys', () => {
  it('isolates current and available-question caches by game', () => {
    expect(gameQuizQueryKeys.current('game-a')).not.toEqual(gameQuizQueryKeys.current('game-b'))
    expect(gameQuizQueryKeys.availableQuestions('game-a')).not.toEqual(
      gameQuizQueryKeys.availableQuestions('game-b'),
    )
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('schedules the server deadline and keeps polling an expired cached snapshot after refresh failure', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T15:00:00Z'))
  let elapsed = 0
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed)
  const client = new QueryClient()
  const options = currentGameQuizQueryOptions('game')
  const query = client.getQueryCache().build(client, options)
  const state: CurrentGameQuizState = {
    gameId: 'game',
    questionSessionId: 'session',
    questionId: 'question',
    questionCode: 'question',
    categoryName: 'Category',
    text: 'Question',
    options: [],
    askOrder: 1,
    status: 'open',
    askedAtUtc: '2026-11-05T12:00:00Z',
    closesAtUtc: '2026-11-05T12:01:00Z',
    serverNowUtc: '2026-11-05T12:00:00Z',
    receivedAtMonotonicMs: 0,
  }
  query.setData(state)
  const interval = options.refetchInterval
  if (typeof interval !== 'function') throw new Error('Expected deadline-aware polling')
  expect(interval(query)).toBe(60000)
  elapsed = 30000
  vi.setSystemTime(new Date('2026-11-05T10:00:00Z'))
  expect(interval(query)).toBe(30000)
  elapsed = 61000
  query.setState({ status: 'error', error: new Error('Refresh failed') })
  expect(interval(query)).toBe(1000)
  query.setData({ ...state, status: 'closed' })
  expect(interval(query)).toBe(false)
  client.clear()
})
