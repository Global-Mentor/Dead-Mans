import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import {
  ModifierDetailsGroup,
  ModifierDetailsItem,
  ModifierDetailsList,
} from './ModifierDetails.tsx'

afterEach(cleanup)

describe('ModifierDetailsItem', () => {
  it('renders named category lists without adding disclosure to category headings', () => {
    renderWithAppProviders(
      <ModifierDetailsList count={2}>
        <ModifierDetailsGroup title="Before the round">
          <ModifierDetailsItem title="Preparation modifier">Rule</ModifierDetailsItem>
        </ModifierDetailsGroup>
        <ModifierDetailsGroup title="Round result">
          <ModifierDetailsItem title="Result modifier" />
        </ModifierDetailsGroup>
      </ModifierDetailsList>,
    )
    expect(screen.getByRole('heading', { name: 'Before the round', level: 3 })).toBeVisible()
    expect(screen.getByRole('list', { name: 'Before the round' })).toHaveTextContent(
      'Preparation modifier',
    )
    expect(screen.getByRole('list', { name: 'Round result' })).toHaveTextContent('Result modifier')
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('retains the icon slot while catalog metadata loads', () => {
    const { container, rerender } = renderWithAppProviders(
      <ModifierDetailsList count={1}>
        <ModifierDetailsItem title="Modifier" reserveIcon />
      </ModifierDetailsList>,
    )
    const slot = container.querySelector('[aria-hidden="true"]')
    expect(slot).toHaveTextContent('◇')
    rerender(
      <ModifierDetailsList count={1}>
        <ModifierDetailsItem title="Modifier" reserveIcon emoji="💧" />
      </ModifierDetailsList>,
    )
    expect(container.querySelector('[aria-hidden="true"]')).toBe(slot)
    expect(slot).toHaveTextContent('💧')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('preserves controlled disclosure and historical metadata', () => {
    const onExpandedChange = vi.fn()
    const { rerender } = renderWithAppProviders(
      <ModifierDetailsList count={1}>
        <ModifierDetailsItem
          title="Modifier"
          metadata="Completed"
          open={false}
          onExpandedChange={onExpandedChange}
        >
          Saved description
        </ModifierDetailsItem>
      </ModifierDetailsList>,
    )
    const toggle = screen.getByRole('button', { name: /Modifier\s*Completed/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(onExpandedChange).toHaveBeenCalledWith(true)
    rerender(
      <ModifierDetailsList count={1}>
        <ModifierDetailsItem
          title="Modifier"
          metadata="Completed"
          open
          onExpandedChange={onExpandedChange}
        >
          Saved description
        </ModifierDetailsItem>
      </ModifierDetailsList>,
    )
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Saved description')).toBeVisible()
  })
})
