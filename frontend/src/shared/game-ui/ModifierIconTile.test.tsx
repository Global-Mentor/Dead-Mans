import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { ModifierIconTile } from './ModifierIconTile.tsx'

afterEach(cleanup)

describe('ModifierIconTile', () => {
  it('preserves the standard tile geometry for existing lists', () => {
    const { container } = renderWithAppProviders(<ModifierIconTile emoji="💧" />)
    expect(container.firstElementChild).toHaveStyle({
      width: '32px',
      height: '32px',
      boxSizing: 'border-box',
    })
    expect(container.firstElementChild).toHaveTextContent('💧')
  })

  it('sizes both the tile and its fallback for a two-line identity', () => {
    const { container } = renderWithAppProviders(<ModifierIconTile emoji={null} size="large" />)
    expect(container.firstElementChild).toHaveStyle({
      width: '40px',
      height: '40px',
      fontSize: '21px',
      boxSizing: 'border-box',
    })
    expect(container.firstElementChild).toHaveTextContent('◇')
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})
