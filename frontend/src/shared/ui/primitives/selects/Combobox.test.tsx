import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { FormTextField } from '../fields/FormTextField.tsx'
import { Combobox } from './Combobox.tsx'

afterEach(cleanup)

it('filters searchable choices, keeps disabled options unavailable and selects with the keyboard', async () => {
  const onChange = vi.fn()
  const options = [
    { label: 'Alpha', disabled: true },
    { label: 'Alpine', disabled: false },
    { label: 'Beta', disabled: false },
  ]
  renderWithAppProviders(
    <Combobox
      options={options}
      getOptionDisabled={(option) => option.disabled}
      onChange={onChange}
      renderInput={(params) => <FormTextField {...params} label="Choice" />}
    />,
  )
  const input = screen.getByRole('combobox', { name: 'Choice' })
  fireEvent.focus(input)
  fireEvent.mouseDown(input)
  fireEvent.change(input, { target: { value: 'Al' } })
  await screen.findByRole('listbox')
  expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-disabled', 'true')
  expect(screen.queryByRole('option', { name: 'Beta' })).not.toBeInTheDocument()
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'Enter' })
  await waitFor(() =>
    expect(onChange).toHaveBeenCalledWith(
      expect.anything(),
      options[1],
      'selectOption',
      expect.anything(),
    ),
  )
  expect(input).toHaveValue('Alpine')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})
