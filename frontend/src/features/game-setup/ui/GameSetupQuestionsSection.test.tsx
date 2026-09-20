import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../../i18n.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { GameSetupQuestionsSection } from './GameSetupQuestionsSection.tsx'

vi.mock('../use-game-setup-questions-catalog.ts', () => ({
  useGameSetupQuestionsCatalog: () => ({
    search: '',
    setSearch: vi.fn(),
    activeCategory: null,
    setActiveCategory: vi.fn(),
    catalogQuery: { isLoading: false, isError: false },
    categories: [],
    filteredQuestions: [
      {
        questionId: 'available',
        text: 'Available question',
        isEnabled: true,
        categoryName: 'General',
        reward: 1,
        askedTotalCount: 0,
        correctSubmissionTotalCount: 0,
      },
      {
        questionId: 'disabled',
        text: 'Disabled question',
        isEnabled: false,
        categoryName: 'General',
        reward: 1,
        askedTotalCount: 0,
        correctSubmissionTotalCount: 0,
      },
    ],
  }),
}))

beforeAll(async () => {
  await i18n.changeLanguage('en')
})
afterEach(cleanup)

function renderQuestions(enabledQuestionIds: string[] = []) {
  const onToggle = vi.fn()
  const onBulkSetEnabled = vi.fn()
  renderWithAppProviders(
    <GameSetupQuestionsSection
      draft={{
        title: 'Draft',
        rowLabels: [],
        colLabels: [],
        cells: [],
        enabledModifierIds: [],
        enabledQuestionIds,
        quizAnswerDurationSeconds: 60,
      }}
      onToggle={onToggle}
      onBulkSetEnabled={onBulkSetEnabled}
      onDurationChange={vi.fn()}
      onDurationCommit={vi.fn()}
    />,
  )
  return { onToggle, onBulkSetEnabled }
}

describe('GameSetupQuestionsSection', () => {
  it('excludes disabled catalog questions from individual and bulk selection', () => {
    const { onToggle, onBulkSetEnabled } = renderQuestions()
    expect(screen.queryByRole('checkbox', { name: 'Disabled question' })).not.toBeInTheDocument()
    expect(screen.queryByText('Disabled question')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Available question' }))
    expect(onToggle).toHaveBeenCalledWith('available', true)
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('gameSetup.questions.enableVisible') }),
    )
    expect(onBulkSetEnabled).toHaveBeenCalledWith(['available'], true)
  })

  it('hides disabled questions even if a stale draft still contains their ids', () => {
    const { onBulkSetEnabled } = renderQuestions(['disabled'])
    expect(screen.queryByRole('checkbox', { name: 'Disabled question' })).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('gameSetup.questions.disableVisible') }),
    )
    expect(onBulkSetEnabled).toHaveBeenCalledWith(['available'], false)
  })
})
