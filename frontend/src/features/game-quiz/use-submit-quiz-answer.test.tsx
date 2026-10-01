import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  CurrentGameQuizState,
  GameQuizSubmissionReceipt,
} from '../../shared/api/contracts/index.ts'
import { submitGameQuizAnswer } from './api/game-quiz-api.ts'
import { gameQuizQueryKeys } from './api/game-quiz-queries.ts'
import { useSubmitQuizAnswer } from './use-submit-quiz-answer.ts'

vi.mock(import('./api/game-quiz-api.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  submitGameQuizAnswer: vi.fn(),
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const state: CurrentGameQuizState = {
  gameId: 'game-one',
  questionSessionId: 'session-one',
  askOrder: 1,
  questionId: 'question-one',
  questionCode: 'Q1',
  categoryName: 'Category',
  text: 'Question?',
  options: [{ optionId: 'option-one', text: 'Answer', displayOrder: 1 }],
  reward: 10,
  status: 'open',
  askedAtUtc: new Date().toISOString(),
  closesAtUtc: new Date(Date.now() + 60_000).toISOString(),
}
const receipt: GameQuizSubmissionReceipt = {
  questionSessionId: 'session-one',
  submissionId: 'submission-one',
  userId: 'user-one',
  selectedOptionId: 'option-one',
  submittedAtUtc: new Date().toISOString(),
  isExisting: false,
}

function setup(cached: CurrentGameQuizState = state) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData(gameQuizQueryKeys.current(state.gameId), cached)
  const hook = renderHook(() => useSubmitQuizAnswer(state.gameId), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  return { client, ...hook }
}

describe('useSubmitQuizAnswer', () => {
  it('records the confirmed choice before invalidating queries', async () => {
    vi.mocked(submitGameQuizAnswer).mockResolvedValue(receipt)
    const { result, client } = setup()
    vi.spyOn(client, 'invalidateQueries').mockImplementation(async () => {
      expect(client.getQueryData(gameQuizQueryKeys.current(state.gameId))).toEqual({
        ...state,
        mySelectedOptionId: 'option-one',
      })
    })
    await act(async () => {
      await result.current.mutateAsync({
        questionSessionId: state.questionSessionId,
        optionId: 'option-one',
      })
    })
    expect(client.getQueryData(gameQuizQueryKeys.current(state.gameId))).toEqual({
      ...state,
      mySelectedOptionId: 'option-one',
    })
    expect(submitGameQuizAnswer).toHaveBeenCalledOnce()
  })

  it('does not attach a late receipt to a newer question session', async () => {
    vi.mocked(submitGameQuizAnswer).mockResolvedValue(receipt)
    const newer = { ...state, questionSessionId: 'session-two' }
    const { result, client } = setup(newer)
    await act(async () => {
      await result.current.mutateAsync({
        questionSessionId: state.questionSessionId,
        optionId: 'option-one',
      })
    })
    expect(client.getQueryData(gameQuizQueryKeys.current(state.gameId))).toEqual(newer)
  })

  it('does not mark a failed submission as accepted', async () => {
    vi.mocked(submitGameQuizAnswer).mockRejectedValue(new Error('Failed request'))
    const { result, client } = setup()
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          questionSessionId: state.questionSessionId,
          optionId: 'option-one',
        }),
      ).rejects.toThrow('Failed request')
    })
    expect(client.getQueryData(gameQuizQueryKeys.current(state.gameId))).toEqual(state)
  })
})
