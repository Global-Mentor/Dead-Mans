import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../../i18n.ts'
import type { GameQuestionCatalogItem } from '../../../shared/api/contracts/index.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { QuestionFormDialog } from './QuestionFormDialog.tsx'

const category = { id: 'category', name: 'Geography', questionCount: 0, isProtected: false }

function renderForm(initial?: GameQuestionCatalogItem, isBusy = false) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  renderWithAppProviders(
    <QuestionFormDialog
      open
      mode={initial ? 'edit' : 'create'}
      initial={initial}
      categories={[category]}
      isBusy={isBusy}
      onClose={vi.fn()}
      onSubmit={onSubmit}
    />,
  )
  return onSubmit
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
})
afterEach(cleanup)

describe('QuestionFormDialog', () => {
  it('always submits the first field as correct without a correctness selector', async () => {
    const onSubmit = renderForm()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/^Question\s*\*?$/), { target: { value: 'Capital?' } })
    fireEvent.change(screen.getByLabelText(/^Correct answer\s*\*?$/), {
      target: { value: ' Warsaw ' },
    })
    for (let number = 1; number <= 3; number++) {
      fireEvent.change(screen.getByLabelText(`Incorrect option ${number}`), {
        target: { value: `Wrong ${number}` },
      })
    }
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0]?.[0].options).toEqual([
      { text: 'Warsaw', isCorrect: true },
      ...[1, 2, 3].map((number) => ({ text: `Wrong ${number}`, isCorrect: false })),
    ])
  })

  it('moves the existing correct option first when editing without mutating the catalog item', async () => {
    const initial: GameQuestionCatalogItem = {
      questionId: 'question',
      questionCode: 'q-1',
      categoryId: category.id,
      categoryName: category.name,
      text: 'Capital?',
      reward: 5,
      priority: 2,
      isEnabled: true,
      askedTotalCount: 0,
      submissionTotalCount: 0,
      correctSubmissionTotalCount: 0,
      correctPercentage: 0,
      options: [
        { optionId: 'a', text: 'Krakow', isCorrect: false, sortOrder: 0 },
        { optionId: 'b', text: 'Warsaw', isCorrect: true, sortOrder: 2 },
        { optionId: 'c', text: 'Gdansk', isCorrect: false, sortOrder: 1 },
      ],
    }
    const onSubmit = renderForm(initial)
    expect(screen.getByLabelText(/^Correct answer\s*\*?$/)).toHaveValue('Warsaw')
    expect(screen.getByLabelText('Incorrect option 1')).toHaveValue('Krakow')
    expect(screen.getByLabelText('Incorrect option 2')).toHaveValue('Gdansk')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(
      onSubmit.mock.calls[0]?.[0].options.map((option: { isCorrect: boolean }) => option.isCorrect),
    ).toEqual([true, false, false])
    expect(initial.options[0]?.text).toBe('Krakow')
  })

  it('keeps the correct field while enforcing two to ten options', async () => {
    renderForm()
    // jsdom's CSS :invalid matcher calls checkValidity while measuring the textarea.
    // Keep this focus/array test valid; the browser test covers focus with empty required fields.
    fireEvent.change(screen.getByLabelText(/^Question\s*\*?$/), { target: { value: 'Capital?' } })
    fireEvent.change(screen.getByLabelText(/^Correct answer\s*\*?$/), {
      target: { value: 'Warsaw' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Remove incorrect option 3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove incorrect option 2' }))
    await waitFor(() => expect(screen.getByLabelText('Incorrect option 1')).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Remove incorrect option 1' })).toBeDisabled()
    expect(screen.getByLabelText(/^Correct answer\s*\*?$/)).toHaveValue('Warsaw')
    for (let count = 2; count < 10; count++)
      fireEvent.click(screen.getByRole('button', { name: 'Add option' }))
    expect(screen.getByRole('button', { name: 'Add option' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: /Remove incorrect option/ })).toHaveLength(9)
    await waitFor(() => expect(screen.getByLabelText('Incorrect option 9')).toHaveFocus())
  })

  it('blocks duplicates and prevents all edits while saving', async () => {
    const onSubmit = renderForm()
    fireEvent.change(screen.getByLabelText(/^Question\s*\*?$/), { target: { value: 'Capital?' } })
    fireEvent.change(screen.getByLabelText(/^Correct answer\s*\*?$/), {
      target: { value: 'Warsaw' },
    })
    for (let number = 1; number <= 3; number++)
      fireEvent.change(screen.getByLabelText(`Incorrect option ${number}`), {
        target: { value: ' warsaw ' },
      })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('This answer variant is already added.')
    expect(onSubmit).not.toHaveBeenCalled()
    cleanup()
    renderForm(undefined, true)
    expect(screen.getByLabelText(/^Correct answer\s*\*?$/)).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add option' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    for (const button of screen.getAllByRole('button', { name: /Remove incorrect option/ }))
      expect(button).toBeDisabled()
  })
})
