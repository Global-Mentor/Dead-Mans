import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { ModifierConflictNotice } from './ModifierConflictNotice.tsx'

afterEach(cleanup)

describe('ModifierConflictNotice', () => {
  it('marks only the active conflict when different modifiers share a name', () => {
    const { rerender } = renderWithAppProviders(
      <ModifierConflictNotice
        conflicts={[
          { id: 'first', name: 'Same name', isActive: true },
          { id: 'second', name: 'Same name', isActive: false },
        ]}
      />,
    )
    const names = screen.getAllByText('Same name')
    expect(names[0]).toHaveAttribute('title')
    expect(names[1]).not.toHaveAttribute('title')
    expect(getComputedStyle(names[0]!).color).not.toBe(getComputedStyle(names[1]!).color)
    rerender(<ModifierConflictNotice conflicts={[]} />)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })
})
