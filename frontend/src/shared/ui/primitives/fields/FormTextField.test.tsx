import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { FormTextField } from './FormTextField.tsx'

afterEach(cleanup)

it('replaces native validation bubbles and keeps focus on the first invalid field', async () => {
  renderWithAppProviders(
    <form>
      <FormTextField label="First" required />
      <FormTextField label="Second" required />
    </form>,
  )
  const first = screen.getByRole('textbox', { name: 'First' }) as HTMLInputElement
  const second = screen.getByRole('textbox', { name: 'Second' })
  expect(fireEvent.invalid(first, { cancelable: true })).toBe(false)
  expect(fireEvent.invalid(second, { cancelable: true })).toBe(false)
  expect(first).toHaveFocus()
  expect(await screen.findByRole('alert')).toHaveTextContent(first.validationMessage)
  expect(screen.getAllByRole('alert')).toHaveLength(1)
  fireEvent.change(first, { target: { value: 'A valid name' } })
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
})

it('connects helper and validation hint to the input without replacing caller descriptions', async () => {
  renderWithAppProviders(
    <>
      <span id="extra">Additional context.</span>
      <FormTextField
        label="Name"
        helperText="Three characters minimum."
        validationHint="This name is taken."
        slotProps={{ htmlInput: { 'aria-describedby': 'extra' } }}
      />
    </>,
  )
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
    'Additional context. Three characters minimum. This name is taken.',
  )
})

it('preserves native constraints and resolves a custom helper slot description', () => {
  renderWithAppProviders(
    <FormTextField
      label="Count"
      type="number"
      helperText="At least two."
      inputProps={{ min: 2, max: 9 }}
      slotProps={{ htmlInput: () => ({ step: 1 }), formHelperText: () => ({ id: 'count-help' }) }}
    />,
  )
  const input = screen.getByRole('spinbutton', { name: 'Count' })
  expect(input).toHaveAttribute('min', '2')
  expect(input).toHaveAttribute('max', '9')
  expect(input).toHaveAttribute('step', '1')
  expect(input).toHaveAccessibleDescription('At least two.')
})
