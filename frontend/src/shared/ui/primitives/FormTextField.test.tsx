import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
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
