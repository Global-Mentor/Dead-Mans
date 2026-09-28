import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
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

it('preserves numeric options and the accessible name with modern select slots', () => {
  const change = vi.fn()
  renderWithAppProviders(
    <FormSelect
      ariaLabel="Count"
      label=""
      value={1}
      onChange={change}
      options={[
        { value: 1, label: 'One' },
        { value: 2, label: 'Two' },
      ]}
      slotProps={{ select: { inputProps: { 'data-source': 'modern' } } }}
    />,
  )
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Count' }))
  fireEvent.click(screen.getByRole('option', { name: 'Two' }))
  expect(change).toHaveBeenCalledWith(2)
})

it('renders real native options and preserves their numeric values', () => {
  const change = vi.fn()
  renderWithAppProviders(
    <FormSelect
      label="Count"
      value={1}
      onChange={change}
      options={[
        { value: 1, label: 'One' },
        { value: 2, label: 'Two' },
      ]}
      SelectProps={{ native: true }}
    />,
  )
  expect(screen.getByRole('option', { name: 'Two' })).toHaveAttribute('value', '2')
  fireEvent.change(screen.getByRole('combobox', { name: 'Count' }), { target: { value: '2' } })
  expect(change).toHaveBeenCalledWith(2)
})

for (const [name, selectProps] of [
  ['callback', { slotProps: { select: () => ({ native: true }) } }],
  [
    'merged slots',
    { SelectProps: { native: true }, slotProps: { select: { displayEmpty: true } } },
  ],
] as const) {
  it(`keeps native options and label association with ${name}`, () => {
    const change = vi.fn()
    renderWithAppProviders(
      <FormSelect
        {...selectProps}
        label="Native count"
        value={1}
        onChange={change}
        options={[
          { value: 1, label: 'One' },
          { value: 2, label: 'Two' },
        ]}
      />,
    )
    const select = screen.getByRole('combobox', { name: 'Native count' })
    expect(select.tagName).toBe('SELECT')
    expect(screen.getByRole('option', { name: 'Two' })).toHaveAttribute('value', '2')
    expect(document.querySelector('label')?.control).toBe(select)
    fireEvent.change(select, { target: { value: '2' } })
    expect(change).toHaveBeenCalledWith(2)
  })
}
