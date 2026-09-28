import { screen, within } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import i18n from '../../../i18n.ts'
import type { components } from '../../../shared/api/contracts/generated'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { QuizLeaderboard } from './QuizLeaderboard.tsx'

type QuizPlayer = components['schemas']['GameHistoryQuizPlayerSummaryDto']

beforeAll(async () => i18n.changeLanguage('ru'))

function player(overrides: Partial<QuizPlayer>): QuizPlayer {
  return {
    userId: crypto.randomUUID(),
    displayName: 'Игрок',
    points: 0,
    spentPoints: 0,
    availablePoints: 0,
    attempts: 0,
    correctAnswers: 0,
    lastActivityAtUtc: null,
    ...overrides,
  }
}

describe('QuizLeaderboard', () => {
  it('sorts participants by earned points and shows answer statistics', () => {
    renderWithAppProviders(
      <QuizLeaderboard
        defaultExpanded
        entries={[
          player({
            displayName: 'Второй игрок',
            points: 15,
            availablePoints: 15,
            attempts: 3,
            correctAnswers: 2,
          }),
          player({
            displayName: 'Первый игрок',
            points: 25,
            spentPoints: 25,
            availablePoints: 0,
            attempts: 4,
            correctAnswers: 3,
          }),
        ]}
      />,
    )

    const rows = screen.getAllByTestId('quiz-leaderboard-row')
    expect(within(rows[0]).getByText('Первый игрок')).toBeInTheDocument()
    expect(within(rows[0]).getByText('25 очк.')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Верных ответов: 3 из 4')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Второй игрок')).toBeInTheDocument()
  })

  it('shows an empty state when nobody participated in the quiz', () => {
    renderWithAppProviders(<QuizLeaderboard entries={[]} defaultExpanded />)

    expect(screen.getByText('Участников викторины пока нет.')).toBeInTheDocument()
  })

  it('renders untrusted player names as text, including participants with zero points', () => {
    const displayName = '<img src=x onerror=alert(1)>'
    const { container } = renderWithAppProviders(
      <QuizLeaderboard entries={[player({ displayName, attempts: 2 })]} defaultExpanded />,
    )

    expect(screen.getByText(displayName)).toBeVisible()
    expect(screen.getByText('0 очк.')).toBeVisible()
    expect(container.querySelector('img')).toBeNull()
  })
})
