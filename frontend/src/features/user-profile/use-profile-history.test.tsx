import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { useProfileHistory } from './use-profile-history.ts'
import { userProfileQueryKeys } from './api/user-profile-queries.ts'

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('openapi-fetch', () => ({ default: () => ({ GET: api.get }) }))
const clients: QueryClient[] = []
afterEach(() => {
  cleanup()
  clients.forEach((client) => client.clear())
  clients.length = 0
  vi.resetAllMocks()
})
function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}
const game = {
  gameId: 'one',
  title: 'First game',
  status: 'finished' as const,
  startedAtUtc: null,
  finishedAtUtc: null,
  completedRoundCount: 1,
  answerCount: 1,
  correctAnswerCount: 1,
}
const gamesPage = { items: [game], page: 1, pageSize: 20, totalCount: 25 }
const answer = {
  questionSessionId: 'session',
  questionId: 'question',
  gameId: 'one',
  gameTitle: 'First game',
  questionText: 'Where?',
  categoryName: 'Locations',
  selectedOptionId: 'answer',
  selectedOptionText: 'The port',
  isCorrect: true,
  awardedPoints: 5,
  submittedAtUtc: '2026-11-05T12:00:00Z',
  image: null,
}
const answersPage = { items: [answer], page: 1, pageSize: 20, totalCount: 25 }
const response = (data: unknown) => ({ data, response: new Response('{}', { status: 200 }) })
type Options = { params: { query: { participation?: string; page: number; gameId?: string } } }

it('retains loaded player games after a failed next page and supports retrying the same destination', async () => {
  let fail = true
  api.get.mockImplementation(async (_path: string, { params: { query } }: Options) => {
    if (query.page === 2 && fail) throw new Error('Page unavailable')
    return response({ ...gamesPage, page: query.page })
  })
  const { result } = renderHook(() => useProfileHistory('owner'), { wrapper: createWrapper() })
  act(() => result.current.setTab('player'))
  await waitFor(() => expect(result.current.player.data?.items).toEqual([game]))
  act(() => result.current.player.changePage(2))
  await waitFor(() => expect(result.current.player.query.isError).toBe(true))
  expect(result.current.player.data).toEqual(gamesPage)
  fail = false
  act(() => result.current.player.changePage(2))
  await waitFor(() => expect(result.current.player.data?.page).toBe(2))
  act(() => result.current.player.changePage(1))
  await waitFor(() => expect(result.current.player.data?.page).toBe(1))
})

it('separates player and quiz pages and never uses player data when the quiz request fails', async () => {
  let fail = true
  api.get.mockImplementation(async (_path: string, { params: { query } }: Options) => {
    if (query.participation === 'quiz' && fail) throw new Error('Quiz unavailable')
    return response({ ...gamesPage, page: query.page })
  })
  const { result } = renderHook(() => useProfileHistory('owner'), { wrapper: createWrapper() })
  act(() => result.current.setTab('player'))
  await waitFor(() => expect(result.current.player.data?.page).toBe(1))
  act(() => result.current.player.changePage(2))
  await waitFor(() => expect(result.current.player.data?.page).toBe(2))
  act(() => result.current.setTab('quiz'))
  await waitFor(() => expect(result.current.quiz.query.isError).toBe(true))
  expect(result.current.quiz.data).toBeNull()
  expect(result.current.player.data?.page).toBe(2)
  fail = false
  await act(async () => {
    await result.current.quiz.query.refetch()
  })
  await waitFor(() => expect(result.current.quiz.data?.page).toBe(1))
  act(() => result.current.setTab('player'))
  expect(result.current.player.data?.page).toBe(2)
  expect(api.get.mock.calls.every(([path]) => path.endsWith('/games'))).toBe(true)
})

it('opens a quiz detail and never shows its answers for another game after a fetch failure', async () => {
  api.get.mockImplementation(async (path: string, { params: { query } }: Options) => {
    if (path.endsWith('/games')) return response(gamesPage)
    if (query.gameId === 'two') throw new Error('Second game unavailable')
    return response(answersPage)
  })
  const { result } = renderHook(() => useProfileHistory('owner'), { wrapper: createWrapper() })
  act(() => result.current.setTab('quiz'))
  await waitFor(() => expect(result.current.quiz.data?.items).toEqual([game]))
  act(() => result.current.openAnswers(game))
  await waitFor(() => expect(result.current.answersData?.items).toEqual([answer]))
  expect(result.current.tab).toBe('quiz')
  act(() => result.current.closeAnswers())
  expect(result.current.returnFocusGameId).toBe('one')
  act(() => result.current.openAnswers({ ...game, gameId: 'two' }))
  await waitFor(() => expect(result.current.answers.isError).toBe(true))
  expect(result.current.answersData).toBeNull()
  expect(result.current.gameId).toBe('two')
  act(() => result.current.closeAnswers())
  act(() => result.current.openAnswers(game))
  await waitFor(() => expect(result.current.answersData?.items).toEqual([answer]))
  act(() => result.current.closeAnswers())
  expect(result.current.gameId).toBeNull()
  expect(
    api.get.mock.calls
      .filter(([path]) => path.endsWith('/answers'))
      .every(([, options]) => Boolean(options.params.query.gameId)),
  ).toBe(true)
})

it('returns to the quiz list page and resets answer pagination on reopening', async () => {
  api.get.mockImplementation(async (path: string, { params: { query } }: Options) => {
    if (path.endsWith('/games')) return response({ ...gamesPage, page: query.page })
    if (query.page === 2) throw new Error('Answers unavailable')
    return response(answersPage)
  })
  const { result } = renderHook(() => useProfileHistory('owner'), { wrapper: createWrapper() })
  act(() => result.current.setTab('quiz'))
  await waitFor(() => expect(result.current.quiz.data?.page).toBe(1))
  act(() => result.current.quiz.changePage(2))
  await waitFor(() => expect(result.current.quiz.data?.page).toBe(2))
  act(() => result.current.openAnswers(game))
  await waitFor(() => expect(result.current.answersData?.page).toBe(1))
  act(() => result.current.changeAnswersPage(2))
  await waitFor(() => expect(result.current.answers.isError).toBe(true))
  expect(result.current.answersData).toEqual(answersPage)
  expect(result.current.quiz.data?.page).toBe(2)
  act(() => result.current.closeAnswers())
  expect(result.current.gameId).toBeNull()
  await waitFor(() => expect(result.current.quiz.data?.page).toBe(2))
  act(() => result.current.openAnswers(game))
  await waitFor(() => expect(result.current.answers.isError).toBe(false))
  expect(result.current.answersData?.page).toBe(1)
})

it('uses the server-clamped page after a list shrinks', async () => {
  api.get.mockImplementation(async () => response({ ...gamesPage, totalCount: 1 }))
  const { result } = renderHook(() => useProfileHistory('owner'), { wrapper: createWrapper() })
  act(() => result.current.setTab('player'))
  await waitFor(() => expect(result.current.player.data?.page).toBe(1))
  act(() => result.current.player.changePage(2))
  await waitFor(() => expect(result.current.player.query.isPlaceholderData).toBe(false))
  expect(result.current.player.data?.page).toBe(1)
  expect(result.current.player.data?.totalCount).toBe(1)
})

it('keeps history requests disabled on the statistics and charts tabs', async () => {
  api.get.mockImplementation(async () => response(answersPage))
  const { result } = renderHook(() => useProfileHistory('owner'), { wrapper: createWrapper() })
  expect(result.current.tab).toBe('statistics')
  expect(api.get).not.toHaveBeenCalled()
  act(() => result.current.setTab('charts'))
  expect(result.current.tab).toBe('charts')
  expect(api.get).not.toHaveBeenCalled()
})

it('separates personal caches by user, participation, game and page', () => {
  expect(userProfileQueryKeys.summary('one')).not.toEqual(userProfileQueryKeys.summary('two'))
  expect(userProfileQueryKeys.games('one', 'player', 1)).not.toEqual(
    userProfileQueryKeys.games('two', 'player', 1),
  )
  expect(userProfileQueryKeys.games('one', 'player', 1)).not.toEqual(
    userProfileQueryKeys.games('one', 'quiz', 1),
  )
  expect(userProfileQueryKeys.games('one', 'quiz', 1)).not.toEqual(
    userProfileQueryKeys.games('one', 'quiz', 2),
  )
  expect(userProfileQueryKeys.answers('one', 'first', 1)).not.toEqual(
    userProfileQueryKeys.answers('one', 'second', 1),
  )
  expect(userProfileQueryKeys.answers('one', 'first', 1)).not.toEqual(
    userProfileQueryKeys.answers('one', 'first', 2),
  )
})
