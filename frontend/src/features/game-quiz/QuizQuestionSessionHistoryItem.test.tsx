import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import i18n from '../../i18n.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { QuizQuestionSessionHistoryItem } from './QuizQuestionSessionHistoryItem.tsx'

beforeAll(async () => i18n.changeLanguage('en'))
afterEach(cleanup)

const session = {
  questionSessionId: 'session',
  questionId: 'question',
  questionCode: 'q1',
  questionText: 'Capital?',
  categoryName: 'General',
  reward: 5,
  status: 'closed' as const,
  askedAtUtc: '2026-09-19T10:00:00Z',
  closedAtUtc: '2026-09-19T10:01:00Z',
  correctOptionId: 'right',
  options: [
    { optionId: 'right', text: 'Paris', displayOrder: 0 },
    { optionId: 'wrong', text: 'London', displayOrder: 1 },
  ],
  submissions: [
    {
      userId: 'alice',
      displayName: 'Alice',
      selectedOptionId: 'right',
      selectedOptionText: 'Paris',
      isCorrect: true,
      awardedPoints: 5,
      submittedAtUtc: '2026-09-19T10:00:10Z',
    },
    {
      userId: 'bob',
      displayName: 'Bob',
      selectedOptionId: 'wrong',
      selectedOptionText: 'London',
      isCorrect: false,
      awardedPoints: 0,
      submittedAtUtc: '2026-09-19T10:00:20Z',
    },
  ],
}

describe('quiz submission history', () => {
  it('preserves each participant and the personal result after the next question starts', () => {
    renderWithAppProviders(
      <QuizQuestionSessionHistoryItem questionSession={session} currentUserId="alice" />,
    )
    expect(
      screen.getByText(i18n.t('gameQuiz.correctAnswerLabel', { answer: 'Paris' })),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      i18n.t('gameQuiz.resultCorrect', { points: 5 }),
    )
    expect(
      screen.getByText(i18n.t('gameQuiz.answerStats', { correct: 1, attempts: 2 })),
    ).toBeInTheDocument()
    expect(screen.getByText(/Alice: Paris/)).toBeInTheDocument()
    expect(screen.getByText(/Bob: London/)).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('gameQuiz.notAnswered'))).not.toBeInTheDocument()
  })

  it('does not attribute the winners reward to a wrong answer', () => {
    renderWithAppProviders(
      <QuizQuestionSessionHistoryItem questionSession={session} currentUserId="bob" />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('gameQuiz.resultWrong'))
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      i18n.t('gameQuiz.resultCorrect', { points: 5 }),
    )
  })
})
