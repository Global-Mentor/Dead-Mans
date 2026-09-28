import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import i18n from '../../../i18n.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { QuestionCategoryDialog } from './QuestionCategoryDialog.tsx'

beforeAll(() => i18n.changeLanguage('ru'))
afterEach(cleanup)

it('preserves the current draft on refresh and resets it when another category is selected', () => {
  const props = {
    open: true,
    mode: 'edit' as const,
    isBusy: false,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  }
  const { rerender } = renderWithAppProviders(
    <QuestionCategoryDialog {...props} categoryId="a" initialName="First" />,
  )
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Draft' } })
  rerender(<QuestionCategoryDialog {...props} categoryId="a" initialName="Refreshed" />)
  expect(screen.getByRole('textbox')).toHaveValue('Draft')
  rerender(<QuestionCategoryDialog {...props} categoryId="b" initialName="Second" />)
  expect(screen.getByRole('textbox')).toHaveValue('Second')
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.actions.cancel') }))
  expect(props.onClose).toHaveBeenCalledOnce()
})
