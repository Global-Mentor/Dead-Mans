import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import i18n from '../../../i18n.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { QuestionCategoryDialog } from './QuestionCategoryDialog.tsx'

beforeAll(() => i18n.changeLanguage('ru'))
afterEach(cleanup)

it('validates blank category names, submits trimmed names and retains server failures', async () => {
  const onSubmit = vi.fn().mockRejectedValue(new Error('offline'))
  const onClose = vi.fn()
  renderWithAppProviders(
    <QuestionCategoryDialog
      open
      categories={[]}
      isBusy={false}
      onSubmit={onSubmit}
      onClose={onClose}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
  await waitFor(() => expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true'))
  expect(onSubmit).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Наука  ' } })
  fireEvent.submit(document.getElementById('catalog-question-category-form')!)
  await screen.findByText('Действительно добавить категорию?')
  expect(screen.getByText('Наука', { exact: true })).toBeInTheDocument()
  expect(onSubmit).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
  await waitFor(() =>
    expect(screen.queryByText('Действительно добавить категорию?')).not.toBeInTheDocument(),
  )
  await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('  Наука  '))
  fireEvent.submit(document.getElementById('catalog-question-category-form')!)
  await screen.findByText('Действительно добавить категорию?')
  expect(screen.getByText('Наука', { exact: true })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('create', '', 'Наука'))
  expect(onClose).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('  Наука  '))
  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
})
