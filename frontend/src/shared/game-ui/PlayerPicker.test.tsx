import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { useState } from 'react'
import { PlayerPicker, type PickerPlayer } from './PlayerPicker.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('keeps players with the same visible name distinct and searches their hidden logins', () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const players = [
    { userId: 'one', displayName: 'Hunter', login: 'hunter_one' },
    { userId: 'two', displayName: 'Hunter', login: 'hunter_two' },
  ]
  const onChange = vi.fn()
  function Picker() {
    const [value, setValue] = useState<PickerPlayer | null>(null)
    return (
      <PlayerPicker
        players={players}
        value={value}
        label="Player"
        onChange={(player) => {
          setValue(player)
          onChange(player)
        }}
      />
    )
  }
  renderWithAppProviders(<Picker />)
  const input = screen.getByRole('combobox', { name: 'Player' })
  fireEvent.mouseDown(input)
  const options = within(screen.getByRole('listbox')).getAllByRole('option', { name: 'Hunter' })
  expect(options).toHaveLength(2)
  fireEvent.click(options[1]!)
  expect(onChange).toHaveBeenLastCalledWith(players[1])
  fireEvent.focus(input)
  fireEvent.mouseDown(input)
  fireEvent.change(input, { target: { value: 'hunter_one' } })
  const matching = within(screen.getByRole('listbox')).getByRole('option')
  expect(matching).toHaveTextContent('Hunter')
  expect(matching).not.toHaveTextContent('hunter_one')
  fireEvent.click(matching)
  expect(onChange).toHaveBeenLastCalledWith(players[0])
  expect(errors).not.toHaveBeenCalled()
})
