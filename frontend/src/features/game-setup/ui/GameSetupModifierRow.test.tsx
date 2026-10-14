import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { GameSetupModifierRow } from './GameSetupModifierRow.tsx'

const { renderRow } = vi.hoisted(() => ({ renderRow: vi.fn() }))
vi.mock('../../../shared/game-ui/index.ts', () => ({
  ModifierCatalogRow: ({ name, selection }: { name: string; selection: ReactNode }) => {
    renderRow(name)
    return <li>{selection}</li>
  },
}))

beforeEach(() => vi.clearAllMocks())

it('rerenders only the changed selection and blocks interaction while saving', () => {
  const modifiers = Array.from({ length: 100 }, (_, index) => ({
    id: String(index),
    name: `Modifier ${index}`,
    activationCost: 1,
    iconEmoji: null,
  }))
  const toggle = vi.fn()
  const preview = vi.fn()
  const list = (selected: string | null, saving: boolean) => (
    <fieldset disabled={saving}>
      <ul>
        {modifiers.map((modifier) => (
          <GameSetupModifierRow
            key={modifier.id}
            modifier={modifier}
            selected={modifier.id === selected}
            onToggle={toggle}
            onPreview={preview}
          />
        ))}
      </ul>
    </fieldset>
  )
  const { rerender } = render(list(null, false))
  expect(renderRow).toHaveBeenCalledTimes(100)
  renderRow.mockClear()
  fireEvent.click(screen.getAllByRole('checkbox')[0]!)
  expect(toggle).toHaveBeenCalledWith('0', true)
  rerender(list('0', true))
  expect(renderRow).toHaveBeenCalledTimes(1)
  expect(screen.getAllByRole('checkbox')[0]).toBeChecked()
  expect(screen.getAllByRole('checkbox')[1]).toBeDisabled()
  renderRow.mockClear()
  rerender(list('0', false))
  expect(renderRow).not.toHaveBeenCalled()
  expect(screen.getAllByRole('checkbox')[1]).toBeEnabled()
})
