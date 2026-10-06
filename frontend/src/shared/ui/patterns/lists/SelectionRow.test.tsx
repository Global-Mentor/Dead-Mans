import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { SelectionRow } from './SelectionRow.tsx'

afterEach(cleanup)

it('preserves native button selection for existing consumers', () => {
  const onClick = vi.fn()
  renderWithAppProviders(
    <SelectionRow selected onClick={onClick}>
      Ravens
    </SelectionRow>,
  )
  const button = screen.getByRole('button', { name: 'Ravens' })
  expect(button).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(button)
  expect(onClick).toHaveBeenCalledOnce()
})

it('exposes table row selection and accepts both Enter and Space across the whole row', () => {
  const onClick = vi.fn()
  renderWithAppProviders(
    <SelectionRow
      component="div"
      role="row"
      tabIndex={0}
      selected
      selectionAppearance="outline"
      emphasis="none"
      onClick={onClick}
      aria-label="Ravens"
    >
      <span role="cell">Ravens</span>
      <span role="cell">150</span>
    </SelectionRow>,
  )
  const row = screen.getByRole('row', { name: 'Ravens' })
  expect(row).toHaveAttribute('aria-selected', 'true')
  expect(row).not.toHaveAttribute('aria-pressed')
  row.focus()
  fireEvent.keyDown(row, { key: 'Enter' })
  fireEvent.keyDown(row, { key: ' ' })
  fireEvent.keyUp(row, { key: ' ' })
  fireEvent.click(screen.getByRole('cell', { name: '150' }))
  expect(onClick).toHaveBeenCalledTimes(3)
})
