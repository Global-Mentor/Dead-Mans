import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { StatusBadge } from './StatusBadge.tsx'
import { huntPalette } from '../../../theme/hunt-palette.ts'
import { huntPaperTexture, huntWornFrame } from '../../../theme/hunt-materials.ts'

afterEach(cleanup)

describe('StatusBadge', () => {
  it.each(['success', 'error'] as const)(
    'applies textured %s feedback only when requested',
    (color) => {
      renderWithAppProviders(
        <>
          <StatusBadge color={color} label="Standard" />
          <StatusBadge color={color} appearance="textured" label="Feedback" />
        </>,
      )
      const standard = getComputedStyle(screen.getByText('Standard').parentElement!)
      const textured = getComputedStyle(screen.getByText('Feedback').parentElement!)
      expect(standard.backgroundImage).not.toContain('charcoal-paper')
      expect(textured.backgroundImage).toContain('charcoal-paper')
      expect(textured.color).toBe(standard.color)
      expect(textured.backgroundColor).not.toBe(standard.backgroundColor)
    },
  )

  it('retains default wrapping and minimum height', () => {
    renderWithAppProviders(<StatusBadge label="Metadata" />)
    expect(screen.getByText('Metadata').parentElement).toHaveStyle({ minHeight: '24px' })
    expect(screen.getByText('Metadata')).toHaveStyle({ whiteSpace: 'normal' })
  })

  it('keeps tight outlined metadata small and wrapping', () => {
    renderWithAppProviders(
      <StatusBadge density="tight" variant="outlined" color="warning" label="Cost: 4 points" />,
    )
    const label = screen.getByText('Cost: 4 points')
    expect(label.parentElement).toHaveStyle({ minHeight: '18px', height: 'auto' })
    expect(label).toHaveStyle({ paddingTop: '0px', paddingBottom: '0px', whiteSpace: 'normal' })
  })

  it('uses the worn frame and bold digits only for strong emphasis', () => {
    renderWithAppProviders(<StatusBadge emphasis="strong" label="×12" />)
    const label = screen.getByText('×12')
    expect(label.parentElement).toHaveStyle({
      minHeight: '32px',
      minWidth: '40px',
      backgroundColor: huntPalette.charcoal,
      backgroundImage: huntPaperTexture,
      borderImageSource: huntWornFrame.borderImageSource,
      color: huntPalette.parchment,
    })
    expect(label).toHaveStyle({
      fontSize: '1rem',
      fontWeight: 800,
      fontVariantNumeric: 'tabular-nums',
    })
  })
})
