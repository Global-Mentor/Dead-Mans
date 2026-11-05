import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useQuizCountdown } from './use-quiz-countdown.ts'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('uses server time despite wall clock skew and later clock changes', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T15:00:00Z'))
  let elapsed = 0
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed)
  const deadline = vi.fn()
  const { result } = renderHook(() =>
    useQuizCountdown(
      '2026-11-05T12:00:00Z',
      '2026-11-05T12:01:00Z',
      deadline,
      '2026-11-05T12:00:00Z',
    ),
  )
  expect(result.current.secondsLeft).toBe(60)
  vi.setSystemTime(new Date('2026-11-05T10:00:00Z'))
  act(() => {
    elapsed = 30000
    vi.advanceTimersByTime(250)
  })
  expect(result.current.secondsLeft).toBe(30)
  act(() => {
    elapsed = 60000
    vi.advanceTimersByTime(250)
  })
  expect(result.current.secondsLeft).toBe(0)
  expect(deadline).toHaveBeenCalledTimes(1)
  act(() => {
    elapsed = 61000
    vi.advanceTimersByTime(250)
  })
  expect(deadline).toHaveBeenCalledTimes(1)
})

it('rebases on a refreshed server snapshot without restarting the duration', () => {
  vi.useFakeTimers()
  vi.spyOn(performance, 'now').mockReturnValue(0)
  const { result, rerender } = renderHook(
    ({ server }) =>
      useQuizCountdown('2026-11-05T12:00:00Z', '2026-11-05T12:01:00Z', () => {}, server),
    { initialProps: { server: '2026-11-05T12:00:00Z' } },
  )
  rerender({ server: '2026-11-05T12:00:45Z' })
  expect(result.current.secondsLeft).toBe(15)
  expect(result.current.progress).toBe(25)
})

it('retains elapsed time when the cached snapshot is mounted again after its deadline', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T15:00:00Z'))
  let elapsed = 0
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed)
  const useCachedCountdown = () =>
    useQuizCountdown(
      '2026-11-05T12:00:00Z',
      '2026-11-05T12:01:00Z',
      () => {},
      '2026-11-05T12:00:00Z',
      0,
    )
  const first = renderHook(useCachedCountdown)
  expect(first.result.current.secondsLeft).toBe(60)
  first.unmount()
  elapsed = 30000
  const second = renderHook(useCachedCountdown)
  expect(second.result.current.secondsLeft).toBe(30)
  second.unmount()
  elapsed = 61000
  const third = renderHook(useCachedCountdown)
  expect(third.result.current.secondsLeft).toBe(0)
})
