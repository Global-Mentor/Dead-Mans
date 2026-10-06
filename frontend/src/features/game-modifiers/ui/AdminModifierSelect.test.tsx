import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { AdminModifierSelect } from './AdminModifierSelect.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('selects modifiers with duplicate names by ID', () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const modifiers = [
    { id: 'one', name: 'Skill' },
    { id: 'two', name: 'Skill' },
  ]
  const onChange = vi.fn()
  renderWithAppProviders(
    <AdminModifierSelect
      modifiers={modifiers}
      value=""
      onChange={onChange}
      label="Modifier"
      disabled={false}
    />,
  )
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Modifier' }))
  const options = within(screen.getByRole('listbox')).getAllByRole('option', { name: 'Skill' })
  expect(options).toHaveLength(2)
  fireEvent.click(options[1]!)
  expect(onChange).toHaveBeenCalledWith('two')
  expect(errors).not.toHaveBeenCalled()
})
