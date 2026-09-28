import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import type { CurrentGameQuizState } from '../../shared/api/contracts/index.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { CurrentQuizCard } from './CurrentQuizCard.tsx'

beforeAll(async () => i18n.changeLanguage('en'))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const baseState: CurrentGameQuizState = {
  questionSessionId: '11111111-1111-1111-1111-111111111111',
  gameId: '22222222-2222-2222-2222-222222222222',
  askOrder: 1,
  questionId: '33333333-3333-3333-3333-333333333333',
  questionCode: 'q-1',
  categoryName: 'General',
  text: 'Which answer is correct?',
  options: [
    { optionId: '44444444-4444-4444-4444-444444444444', text: 'First', displayOrder: 0 },
    { optionId: '55555555-5555-5555-5555-555555555555', text: 'Second', displayOrder: 1 },
  ],
  reward: 10,
  status: 'open',
  askedAtUtc: new Date(Date.now() - 1_000).toISOString(),
  closesAtUtc: new Date(Date.now() + 60_000).toISOString(),
}

function renderCard(
  state: CurrentGameQuizState | null,
  overrides: Partial<Parameters<typeof CurrentQuizCard>[0]> = {},
) {
  const props: Parameters<typeof CurrentQuizCard>[0] = {
    state,
    canManage: false,
    questions: [],
    isSubmitting: false,
    isStarting: false,
    error: null,
    onSubmit: vi.fn(),
    onAskNext: vi.fn(),
    onAskSpecific: vi.fn(),
    onDeadline: vi.fn(),
    ...overrides,
  }
  renderWithAppProviders(<CurrentQuizCard {...props} />)
  return props
}

describe('CurrentQuizCard', () => {
  it('allows a moderator to start the first question from an empty state', () => {
    const props = renderCard(null, { canManage: true })
    const next = screen.getByRole('button', { name: i18n.t('gameQuiz.nextQuestion') })
    expect(next).toBeEnabled()
    fireEvent.click(next)
    expect(props.onAskNext).toHaveBeenCalledOnce()
  })

  it('blocks both launch actions during modifier ordering', () => {
    const props = renderCard(null, { canManage: true, modifierOrderingActive: true })
    expect(screen.getByRole('button', { name: i18n.t('gameQuiz.nextQuestion') })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: i18n.t('gameQuiz.askSpecificQuestion') }),
    ).toBeDisabled()
    expect(screen.getByText(i18n.t('gameQuiz.modifierOrderingActive'))).toBeInTheDocument()
    expect(props.onAskNext).not.toHaveBeenCalled()
  })

  it('explains when every available question has already been asked', () => {
    renderCard(null, {
      canManage: true,
      error: new ApiError('HTTP 404', {
        status: 404,
        details: { code: API_ERROR_CODES.gameQuizNoAvailableQuestions },
      }),
    })

    expect(screen.getByText(i18n.t('gameQuiz.noAvailableQuestionsError'))).toBeInTheDocument()
  })

  it('opens a searchable picker for a specific question', () => {
    const props = renderCard(null, {
      canManage: true,
      questions: [
        {
          questionId: '66666666-6666-6666-6666-666666666666',
          questionCode: 'q-2',
          categoryName: 'Science',
          text: 'Which planet is closest to the Sun?',
        },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: i18n.t('gameQuiz.askSpecificQuestion') }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Which planet is closest to the Sun?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: i18n.t('gameQuiz.selectQuestion') }))
    expect(props.onAskSpecific).toHaveBeenCalledWith('66666666-6666-6666-6666-666666666666')
  })

  it('distinguishes loading, failed loading, and an exhausted picker', () => {
    renderCard(null, { canManage: true, questionsLoading: true })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('gameQuiz.askSpecificQuestion') }))
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('gameQuiz.noQuestionsAvailable'))).not.toBeInTheDocument()
    cleanup()

    const retry = vi.fn()
    renderCard(null, { canManage: true, questionsError: true, onRetryQuestions: retry })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('gameQuiz.askSpecificQuestion') }))
    expect(screen.getByText(i18n.t('gameQuiz.questionsLoadError'))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('gameQuiz.retryQuestions') }))
    expect(retry).toHaveBeenCalledOnce()
    cleanup()

    renderCard(null, { canManage: true })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('gameQuiz.askSpecificQuestion') }))
    expect(screen.getByText(i18n.t('gameQuiz.noQuestionsAvailable'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('gameQuiz.noQuestionsMatched'))).not.toBeInTheDocument()
  })

  it('requests authoritative state when the local timer reaches its deadline', () => {
    vi.useFakeTimers()
    const props = renderCard({
      ...baseState,
      closesAtUtc: new Date(Date.now() + 1000).toISOString(),
    })
    act(() => vi.advanceTimersByTime(1000))
    expect(props.onDeadline).toHaveBeenCalledOnce()
    act(() => vi.advanceTimersByTime(3000))
    expect(props.onDeadline).toHaveBeenCalledOnce()
  })
  it('submits one option and disables every option after the server accepts it', () => {
    const open = renderCard(baseState)
    fireEvent.click(screen.getByRole('button', { name: 'First' }))
    expect(open.onSubmit).toHaveBeenCalledWith(
      baseState.questionSessionId,
      baseState.options[0].optionId,
    )
    cleanup()

    renderCard({ ...baseState, mySelectedOptionId: baseState.options[0].optionId })
    expect(screen.getByRole('button', { name: /First/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Second' })).toBeDisabled()
    expect(screen.getByText(i18n.t('gameQuiz.answerAccepted'))).toBeInTheDocument()
  })

  it('reveals correctness, reward, and option distribution only after closure', () => {
    renderCard({
      ...baseState,
      status: 'closed',
      closedAtUtc: baseState.closesAtUtc,
      mySelectedOptionId: baseState.options[0].optionId,
      correctOptionId: baseState.options[0].optionId,
      myIsCorrect: true,
      myAwardedPoints: 10,
      totalSubmissions: 4,
      optionResults: [
        { optionId: baseState.options[0].optionId, answerCount: 3, percentage: 75 },
        { optionId: baseState.options[1].optionId, answerCount: 1, percentage: 25 },
      ],
    })

    expect(screen.getByText(i18n.t('gameQuiz.resultCorrect', { points: 10 }))).toBeInTheDocument()
    expect(screen.getByText('3 · 75%')).toBeInTheDocument()
    expect(screen.getByText('1 · 25%')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('gameQuiz.closedDescription'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /First/ })).toHaveAttribute(
      'data-quiz-result',
      'correct',
    )
  })

  it('marks a selected wrong answer separately from the correct answer', () => {
    renderCard({
      ...baseState,
      status: 'closed',
      closedAtUtc: baseState.closesAtUtc,
      mySelectedOptionId: baseState.options[0].optionId,
      correctOptionId: baseState.options[1].optionId,
      myIsCorrect: false,
      myAwardedPoints: 0,
      totalSubmissions: 1,
      optionResults: [
        { optionId: baseState.options[0].optionId, answerCount: 1, percentage: 100 },
        { optionId: baseState.options[1].optionId, answerCount: 0, percentage: 0 },
      ],
    })

    expect(screen.getByRole('button', { name: /First/ })).toHaveAttribute(
      'data-quiz-result',
      'selected-wrong',
    )
    expect(screen.getByRole('button', { name: /Second/ })).toHaveAttribute(
      'data-quiz-result',
      'correct',
    )
  })
})
