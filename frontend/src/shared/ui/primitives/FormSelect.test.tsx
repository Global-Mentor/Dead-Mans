import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { FormSelect } from './FormSelect.tsx'

afterEach(cleanup)

it('labels the custom combobox without pointing a native label at a div', () => {
  const onChange = vi.fn()
  const { container } = renderWithAppProviders(
    <FormSelect
      id="operation"
      label="Operation"
      value="award"
      onChange={onChange}
      options={[
        { value: 'award', label: 'Award' },
        { value: 'deduct', label: 'Deduct' },
      ]}
      slotProps={{ inputLabel: { shrink: true } }}
    />,
  )
  const combobox = screen.getByRole('combobox', { name: 'Operation' })
  expect(container.querySelector('label[for]')).toBeNull()
  const label = document.getElementById('operation-label')!
  expect(combobox.getAttribute('aria-labelledby')?.split(' ')).toContain(label.id)
  expect(label).toHaveAttribute('data-shrink', 'true')
  fireEvent.click(label)
  expect(combobox).toHaveFocus()
  fireEvent.mouseDown(combobox)
  fireEvent.click(screen.getByRole('option', { name: 'Deduct' }))
  expect(onChange).toHaveBeenCalledWith('deduct')
})

it('keeps an accessible name for a select without a visible label', () => {
  renderWithAppProviders(
    <FormSelect
      label=""
      ariaLabel="Language"
      value="ru"
      onChange={vi.fn()}
      options={[{ value: 'ru', label: 'Russian' }]}
    />,
  )
  expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument()
})

it('preserves a native select label association', () => {
  renderWithAppProviders(
    <FormSelect
      label="Native choice"
      value=""
      options={[]}
      onChange={vi.fn()}
      SelectProps={{ native: true }}
    />,
  )
  const select = screen.getByRole('combobox', { name: 'Native choice' })
  expect(select.tagName).toBe('SELECT')
  expect(screen.getByLabelText('Native choice')).toBe(select)
  expect(document.querySelector('label')?.control).toBe(select)
})
